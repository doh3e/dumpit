package kr.dumpit.widget

import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.net.Uri
import android.widget.RemoteViews
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.Preferences
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.action.actionParametersOf
import androidx.glance.action.clickable
import androidx.glance.appwidget.AndroidRemoteViews
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.background
import androidx.glance.currentState
import androidx.glance.layout.*
import androidx.glance.semantics.contentDescription
import androidx.glance.semantics.semantics
import androidx.glance.state.GlanceStateDefinition
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextDecoration
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

const val DEEPLINK_HOME = "dumpit:///"
const val DEEPLINK_POMODORO = "dumpit:///pomodoro"

internal val HERO_MIN_SIZE = DpSize(250.dp, 170.dp)

internal enum class HeroLayout { ResizeRequired, Wide, Tall }

internal fun heroLayoutFor(size: DpSize): HeroLayout = when {
    size.width < HERO_MIN_SIZE.width || size.height < HERO_MIN_SIZE.height -> HeroLayout.ResizeRequired
    size.height >= 250.dp -> HeroLayout.Tall
    else -> HeroLayout.Wide
}

internal fun heroQueueRows(size: DpSize): Int = when {
    heroLayoutFor(size) == HeroLayout.ResizeRequired -> 0
    size.height >= 310.dp -> 3
    size.height >= 250.dp -> 2
    else -> 1
}

// setPackage로 우리 앱에 고정한다 — dumpit 스킴은 검증되지 않은 커스텀 스킴이라, 암시적
// 인텐트로 두면 같은 스킴을 선언한 다른 앱이 위젯 탭의 후보로 끼어들 수 있다.
@Composable
fun deepLinkIntent(url: String): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse(url))
        .setPackage(LocalContext.current.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

class TodayTasksWidget : GlanceAppWidget() {
    // Glance가 보장하는 무효화 경로는 "위젯 상태(stateDefinition) 변경 → update()" 조합뿐이다 —
    // 활성 세션에서 update()/updateAll()만으로는(외부 데이터만 바뀐 경우) 재구성이 안 되는
    // 확정 버그가 있어, SharedPreferences 스냅샷을 이 상태로 이관한다(WidgetStore.pushTodayState
    // 등이 기록).
    override val stateDefinition: GlanceStateDefinition<Preferences> = PreferencesGlanceStateDefinition

    override val sizeMode: SizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // 세션 시작 시 1회: 주기 onUpdate(30분)·재부팅 등으로 렌더될 때 미러가 오래됐으면
        // 서버에서 직접 갱신. 앱발 미러 직후(updatedAt 신선)는 건너뛰어 불필요한 네트워크를 막는다.
        // 신선도 판정은 SharedPreferences(비컴포즈 문맥) 읽기로 한다.
        val initial = HeroSnapshot.from(WidgetStore.read(context, WidgetStore.KEY_TODAY))
        if (initial == null || initial.isStale()) {
            withContext(Dispatchers.IO) { WidgetApi.refreshToday(context) }
        }
        // 세션 시작 시 SharedPreferences의 최신 스냅샷을 Glance 상태로 동기화해둔다 — 앱 업데이트
        // 직후처럼 이 GlanceId에 한 번도 상태가 쓰인 적 없을 수 있고(신선도 게이트를 안 탄 경우도
        // 포함), 매 provideGlance마다 맞춰야 한다. Glance 1.1.1 세션은 이 쓰기보다 먼저 상태를
        // 캡처하므로 첫 composition은 아래 themeJson 보완값을 사용하고, 이후 update()는 currentState를 쓴다.
        // 테마·뽀모도로도 같은 이유로 함께 동기화한다(테마는 배경/행성, 뽀모도로는 "집중 타임" 표시).
        val latest = WidgetStore.read(context, WidgetStore.KEY_TODAY)
        val themeJson = WidgetStore.read(context, WidgetStore.KEY_THEME)
        val pomodoroJson = WidgetStore.read(context, WidgetStore.KEY_POMODORO)
        updateAppWidgetState(context, id) { prefs ->
            if (latest == null) prefs.remove(WidgetStore.TODAY_STATE_KEY) else prefs[WidgetStore.TODAY_STATE_KEY] = latest
            if (themeJson == null) prefs.remove(WidgetStore.THEME_STATE_KEY) else prefs[WidgetStore.THEME_STATE_KEY] = themeJson
            if (pomodoroJson == null) prefs.remove(WidgetStore.POMODORO_STATE_KEY) else prefs[WidgetStore.POMODORO_STATE_KEY] = pomodoroJson
        }
        provideContent {
            // 재구성마다 Glance 상태를 읽는다 — SharedPreferences 직접 읽기(구 방식)는 활성 세션
            // 생존 중 스테일해질 수 있다(실기기 확정 버그). remember로 감싸지 말 것 — 감싸면 다시
            // 스테일해진다.
            val state = currentState<Preferences>()
            val snapshot = HeroSnapshot.from(state[WidgetStore.TODAY_STATE_KEY])
            // mode="system"일 때만 쓰이는 기기 다크 여부 — 런처 프로세스가 아니라 이 앱 리소스
            // 설정을 본다(위젯 호스트는 앱 컨텍스트를 상속한다).
            val systemDark = (LocalContext.current.resources.configuration.uiMode and
                Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
            val theme = WidgetTheme.resolve(
                themeJsonForRender(state[WidgetStore.THEME_STATE_KEY], themeJson),
                systemDark,
            )
            // "집중 타임"은 진행 중(일시정지·종료 아님)인 FOCUS 페이즈일 때만 — 휴식 중이나
            // 세션 종료 후에는 평소 히어로 화면으로 돌아간다.
            val pomodoro = PomodoroSnapshot.from(state[WidgetStore.POMODORO_STATE_KEY])
            val focusTitle = pomodoro?.takeIf { it.pausedAt == null && !it.done }
                ?.let { s -> s.currentPhase(System.currentTimeMillis())?.let { if (it.kind == "FOCUS") s.taskTitle else null } }
            HeroContent(snapshot, theme, focusTitle, LocalSize.current)
        }
    }
}

@Composable
private fun HeroContent(snapshot: HeroSnapshot?, theme: WTheme, focusTitle: String?, size: DpSize) {
    RetroFrame(theme) {
        if (heroLayoutFor(size) == HeroLayout.ResizeRequired) {
            WidgetResizeNotice(theme, actionStartActivity(deepLinkIntent(DEEPLINK_HOME)))
        } else {
            HeroRows(snapshot?.takeIf { it.loggedIn }, theme, focusTitle, size)
        }
    }
}

internal sealed interface WideHeroPresentation {
    data object Login : WideHeroPresentation
    data class Focus(val title: String) : WideHeroPresentation
    data object AllDone : WideHeroPresentation
    data class Suggestion(val snapshot: HeroSnapshot) : WideHeroPresentation
}

internal fun wideHeroPresentation(snapshot: HeroSnapshot?, focusTitle: String?): WideHeroPresentation = when {
    snapshot == null -> WideHeroPresentation.Login
    focusTitle != null -> WideHeroPresentation.Focus(focusTitle)
    snapshot.allDone -> WideHeroPresentation.AllDone
    else -> WideHeroPresentation.Suggestion(snapshot)
}

@Composable
private fun HeroRows(snapshot: HeroSnapshot?, theme: WTheme, focusTitle: String?, size: DpSize) {
    val queue = if (focusTitle == null && snapshot != null && !snapshot.allDone) {
        snapshot.queue.take(heroQueueRows(size))
    } else emptyList()
    val showSuggestion = size.height >= 250.dp
    Column(modifier = GlanceModifier.fillMaxWidth()) {
        Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            RefreshPlanet(theme, snapshot)
            Spacer(GlanceModifier.width(8.dp))
            if (snapshot?.hero != null && focusTitle == null && !snapshot.allDone) {
                HeroDetails(snapshot.hero, snapshot.suggestionMessage, theme, showSuggestion, GlanceModifier.defaultWeight())
                Spacer(GlanceModifier.width(8.dp))
                PixelButton("w_t_complete", theme, true,
                    actionRunCallback<ToggleTaskAction>(actionParametersOf(ToggleTaskAction.TaskIdParam to snapshot.hero.taskId)),
                    "${snapshot.hero.title} 완료")
            } else {
                WideSingleInfo(snapshot, theme, focusTitle, showSuggestion, GlanceModifier.defaultWeight())
            }
        }
        if (queue.isNotEmpty()) {
            Spacer(GlanceModifier.height(12.dp))
            Column(modifier = GlanceModifier.fillMaxWidth()) {
                queue.forEachIndexed { index, item ->
                    Row(modifier = GlanceModifier.fillMaxWidth().height(WIDGET_TOUCH_SIZE),
                        verticalAlignment = Alignment.CenterVertically) {
                        QueueInfo(item, theme, index == 0, GlanceModifier.defaultWeight().fillMaxHeight())
                        Spacer(GlanceModifier.width(4.dp))
                        QueueToggle(item, theme)
                    }
                }
            }
        }
    }
}

@Composable
private fun RefreshPlanet(theme: WTheme, snapshot: HeroSnapshot?) {
    Column(modifier = GlanceModifier.width(WIDGET_TOUCH_SIZE), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = GlanceModifier.size(WIDGET_TOUCH_SIZE)
                .semantics { contentDescription = "오늘 할 일 새로고침" }
                .clickable(actionRunCallback<RefreshTodayAction>()),
            contentAlignment = Alignment.Center,
        ) {
            PlanetFlipper(theme, 36.dp)
        }
        if (snapshot != null) Text("${snapshot.todayDone}/${snapshot.todayTotal}", maxLines = 1,
            style = TextStyle(fontSize = 12.sp, color = ColorProvider(theme.palette.fg)))
    }
}

@Composable
private fun WideSingleInfo(snapshot: HeroSnapshot?, theme: WTheme, focusTitle: String?, showSuggestion: Boolean, modifier: GlanceModifier) {
    val p = theme.palette
    val presentation = wideHeroPresentation(snapshot, focusTitle)
    if (presentation is WideHeroPresentation.Suggestion) {
        WideSuggestion(presentation.snapshot, p, showSuggestion, modifier)
        return
    }
    Box(
        modifier = modifier
            .semantics { contentDescription = if (presentation is WideHeroPresentation.Focus) "${presentation.title} 집중 중. 뽀모도로 열기" else "오늘 할 일 열기" }
            .clickable(actionStartActivity(deepLinkIntent(if (presentation is WideHeroPresentation.Focus) DEEPLINK_POMODORO else DEEPLINK_HOME))),
    ) {
        Spacer(GlanceModifier.fillMaxWidth().height(48.dp))
        Column {
            PixelText(if (presentation is WideHeroPresentation.Focus) "w_t_focus_time" else "w_t_now", p.accent2, 13.dp, width = 60.dp)
            Spacer(GlanceModifier.height(4.dp))
            when (presentation) {
                WideHeroPresentation.Login -> PixelText("w_t_login", p.sub, 14.dp)
                is WideHeroPresentation.Focus -> Text("「${presentation.title}」 집중 중", maxLines = 1,
                    style = TextStyle(fontSize = 18.sp, fontWeight = FontWeight.Bold, color = ColorProvider(p.fg)))
                WideHeroPresentation.AllDone -> PixelText("w_t_done_all", p.fg, 16.dp)
                is WideHeroPresentation.Suggestion -> Unit
            }
        }
    }
}

@Composable
private fun HeroDetails(hero: HeroTask, suggestion: String?, theme: WTheme, showSuggestion: Boolean, modifier: GlanceModifier) {
    val p = theme.palette
    val titleLines = heroTitleMaxLines(showSuggestion, LocalContext.current.resources.configuration.fontScale)
    Box(modifier = modifier.semantics { contentDescription = "${hero.title} 열기" }
        .clickable(actionStartActivity(deepLinkIntent(DEEPLINK_HOME)))) {
        Spacer(GlanceModifier.fillMaxWidth().height(48.dp))
        Column {
            PixelText("w_t_now", p.accent2, 13.dp, width = 60.dp)
            Text(hero.title, maxLines = titleLines,
                style = TextStyle(fontSize = 18.sp, fontWeight = FontWeight.Bold, color = ColorProvider(p.fg)))
            if (hero.deadlineLabel != null) Text(hero.deadlineLabel, maxLines = 1,
                style = TextStyle(fontSize = 12.sp, color = ColorProvider(p.warn)))
            if (showSuggestion && !suggestion.isNullOrBlank()) Text(suggestion, maxLines = 1,
                style = TextStyle(fontSize = 12.sp, color = ColorProvider(p.sub)))
        }
    }
}

internal fun heroTitleMaxLines(showSuggestion: Boolean, fontScale: Float): Int =
    if (showSuggestion && fontScale < 1.2f) 2 else 1

@Composable
private fun WideSuggestion(snapshot: HeroSnapshot, p: WPalette, showSuggestion: Boolean, modifier: GlanceModifier) {
    Box(modifier = modifier.semantics { contentDescription = "오늘 할 일 열기" }
        .clickable(actionStartActivity(deepLinkIntent(DEEPLINK_HOME)))) {
        Spacer(GlanceModifier.fillMaxWidth().height(48.dp))
        Column(modifier = GlanceModifier.fillMaxWidth()) {
            PixelText("w_t_now", p.accent2, 13.dp, width = 60.dp)
            Text(snapshot.suggestionTitle?.takeIf { it.isNotBlank() } ?: "지금은 비어 있는 시간이에요.", maxLines = 1,
                style = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Bold, color = ColorProvider(p.fg)))
            if (showSuggestion) Text(snapshot.suggestionMessage?.takeIf { it.isNotBlank() } ?: "가벼운 일부터 하나 시작해볼까요?", maxLines = 1,
                style = TextStyle(fontSize = 12.sp, color = ColorProvider(p.sub)))
        }
    }
}

@Composable
private fun QueueInfo(item: QueueItem, theme: WTheme, showNext: Boolean, modifier: GlanceModifier) {
    val p = theme.palette
    Box(modifier = modifier.semantics { contentDescription = "${item.title} 열기" }
        .clickable(actionStartActivity(deepLinkIntent(DEEPLINK_HOME)))) {
        Row(modifier = GlanceModifier.fillMaxSize(), verticalAlignment = Alignment.CenterVertically) {
            if (showNext) {
                PixelText("w_t_next", p.sub, 11.dp, width = 34.dp)
                Spacer(GlanceModifier.width(4.dp))
            }
            Box(modifier = GlanceModifier.background(p.chip).cornerRadius(6.dp).padding(horizontal = 5.dp, vertical = 2.dp)) {
                PixelText(bucketRes(item.bucket), readableWidgetText(p.sub, p.chip), 11.dp)
            }
            Spacer(GlanceModifier.width(6.dp))
            Text(item.title, maxLines = 1, style = TextStyle(fontSize = 13.sp, color = ColorProvider(p.fg),
                textDecoration = if (item.done) TextDecoration.LineThrough else TextDecoration.None),
                modifier = GlanceModifier.defaultWeight())
        }
    }
}

@Composable
private fun QueueToggle(item: QueueItem, theme: WTheme) {
    Box(modifier = GlanceModifier.size(48.dp), contentAlignment = Alignment.Center) {
        PixelIcon(if (item.done) "w_i_check_on" else "w_i_check_off", theme.palette.accent, 18.dp,
            actionRunCallback<ToggleTaskAction>(actionParametersOf(ToggleTaskAction.TaskIdParam to item.taskId)),
            if (item.done) "${item.title} 완료 취소" else "${item.title} 완료")
    }
}

/**
 * 행성 2프레임 자동 플립 — Glance에는 애니메이션이 없어 RemoteViews(ViewFlipper)로 우회한다.
 * drawableId는 @Composable이라 RemoteViews를 만들기 전에 지역변수로 뽑아둔다. 미지 행성 코드
 * (에셋 없는 신규 스킨 등)는 0을 반환해 런처에서 크래시가 나므로 기본 행성으로 폴백한다.
 */
@Composable
private fun PlanetFlipper(theme: WTheme, size: Dp) {
    val context = LocalContext.current
    val f1 = drawableId("w_planet_${theme.planetSuffix}_f1")
    val f2 = drawableId("w_planet_${theme.planetSuffix}_f2")
    val fallback1 = drawableId("w_planet_default_f1")
    val fallback2 = drawableId("w_planet_default_f2")
    val rv = RemoteViews(context.packageName, R.layout.widget_planet_flipper).apply {
        setImageViewResource(R.id.widget_planet_f1, if (f1 != 0) f1 else fallback1)
        setImageViewResource(R.id.widget_planet_f2, if (f2 != 0) f2 else fallback2)
    }
    // fillMaxSize 필수 — AndroidRemoteViews 기본은 wrap이라 nodpi 비트맵의 intrinsic 크기
    // (픽셀=dp 그대로)로 렌더돼 박스 크기를 무시한다(실기기: 토마토 18dp·행성 시트 띠 증상).
    Box(modifier = GlanceModifier.size(size)) {
        AndroidRemoteViews(remoteViews = rv, modifier = GlanceModifier.fillMaxSize())
    }
}

/** 버킷 → 뱃지 리소스. 서버가 새 버킷을 추가해도 0(미존재 리소스) 크래시가 안 나도록 기본값을 둔다. */
private fun bucketRes(bucket: String): String = when (bucket) {
    "OVERDUE" -> "w_b_overdue"
    "TODAY" -> "w_b_today"
    "TOMORROW" -> "w_b_tomorrow"
    "NEXT_7_DAYS" -> "w_b_next7"
    "LATER" -> "w_b_later"
    "SOMEDAY" -> "w_b_someday"
    else -> "w_b_today"
}
