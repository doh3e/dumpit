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

fun deepLinkIntent(url: String): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

class TodayTasksWidget : GlanceAppWidget() {
    // Glance가 보장하는 무효화 경로는 "위젯 상태(stateDefinition) 변경 → update()" 조합뿐이다 —
    // 활성 세션에서 update()/updateAll()만으로는(외부 데이터만 바뀐 경우) 재구성이 안 되는
    // 확정 버그가 있어, SharedPreferences 스냅샷을 이 상태로 이관한다(WidgetStore.pushTodayState
    // 등이 기록).
    override val stateDefinition: GlanceStateDefinition<Preferences> = PreferencesGlanceStateDefinition

    companion object {
        // 반응형 브레이크포인트 — 런처가 준 크기에 가장 가까운 값이 LocalSize로 들어온다.
        // 각 크기마다 RemoteViews를 미리 만들어두는 방식이라 후보를 3개로 제한한다.
        private val COMPACT = DpSize(150.dp, 110.dp) // 2x2 — 헤더·제목·완료 버튼만
        private val WIDE = DpSize(250.dp, 110.dp)    // 4x2 — + 행성·진행률·큐 2줄
        private val TALL = DpSize(250.dp, 220.dp)    // 4x4 — 큰 행성·큐 3줄
    }

    override val sizeMode: SizeMode = SizeMode.Responsive(setOf(COMPACT, WIDE, TALL))

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
        // 포함), 매 provideGlance마다 맞춰야 한다. 자기 자신 update() 호출은 불필요하다 — 세션
        // 시작 직전이라 상태만 써두면 곧이어 실행되는 provideContent가 currentState()로 즉시 읽는다.
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
            val theme = WidgetTheme.resolve(state[WidgetStore.THEME_STATE_KEY], systemDark)
            // "집중 타임"은 진행 중(일시정지·종료 아님)인 FOCUS 페이즈일 때만 — 휴식 중이나
            // 세션 종료 후에는 평소 히어로 화면으로 돌아간다.
            val pomodoro = PomodoroSnapshot.from(state[WidgetStore.POMODORO_STATE_KEY])
            val focusTitle = pomodoro?.takeIf { it.pausedAt == null && !it.done }
                ?.let { s -> s.currentPhase(System.currentTimeMillis())?.let { if (it.kind == "FOCUS") s.taskTitle else null } }
            HeroContent(snapshot, theme, focusTitle, compact = LocalSize.current.width < 250.dp)
        }
    }
}

/**
 * 히어로 카드 미러 — 헤더(고정 문구) + 본문 3상태(로그인 필요·집중 타임·다 비웠어요/지금 할 일/빈 시간)
 * + 우상단 행성·진행률 + 하단 큐. 고정 문구는 픽셀 이미지(PixelText), 사용자 데이터는 시스템 폰트.
 */
@Composable
private fun HeroContent(snapshot: HeroSnapshot?, theme: WTheme, focusTitle: String?, compact: Boolean) {
    val p = theme.palette
    // 4x4(TALL)에서만 큐 3줄·큰 행성. 4x2는 세로 110dp뿐이라 2줄로 줄인다.
    val tall = LocalSize.current.height >= 220.dp
    // 로그인 안 된 스냅샷은 null과 같게 취급 — 지역 val로 받아야 아래 분기에서 스마트 캐스트가 산다.
    val snap = snapshot?.takeIf { it.loggedIn }
    RetroFrame(theme) {
        Column(modifier = GlanceModifier.fillMaxSize()) {
            Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                PixelIcon("w_i_sparkle", p.starlight, 12.dp)
                Spacer(GlanceModifier.width(4.dp))
                PixelText(if (focusTitle != null) "w_t_focus_time" else "w_t_now", p.accent2, 13.dp)
                Spacer(GlanceModifier.defaultWeight())
                // 컴팩트(2x2)는 우측 행성 블록을 넣을 폭이 없어 헤더 옆에 작게 붙인다.
                if (compact && snap != null) {
                    PlanetFlipper(theme, 32.dp)
                    Spacer(GlanceModifier.width(6.dp))
                }
                PixelIcon("w_i_refresh", p.sub, 16.dp, actionRunCallback<RefreshTodayAction>())
            }
            Spacer(GlanceModifier.height(6.dp))
            when {
                // 1) 로그인 필요 — 탭하면 앱 홈(로그인 화면)으로
                snap == null -> Box(
                    modifier = GlanceModifier.fillMaxSize()
                        .clickable(actionStartActivity(deepLinkIntent(DEEPLINK_HOME))),
                    contentAlignment = Alignment.Center,
                ) { PixelText("w_t_login", p.sub, 14.dp) }

                // 2) 다 비웠어요 — 집중 중이 아닐 때만(집중 타임이 우선)
                focusTitle == null && snap.allDone -> Column(
                    modifier = GlanceModifier.fillMaxSize()
                        .clickable(actionStartActivity(deepLinkIntent(DEEPLINK_HOME))),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    PixelText("w_t_done_all", p.fg, 16.dp)
                    // 컴팩트는 헤더에 이미 행성이 있어 중복 배치하지 않는다.
                    if (!compact) {
                        Spacer(GlanceModifier.height(8.dp))
                        PlanetFlipper(theme, 64.dp)
                    }
                }

                // 3) 집중 타임 / 지금 할 일 / 빈 시간 — 좌: 본문, 우: 행성+진행률
                else -> {
                    Row(modifier = GlanceModifier.fillMaxWidth()) {
                        Column(modifier = GlanceModifier.defaultWeight()) {
                            when {
                                focusTitle != null -> FocusBody(focusTitle, p, compact)
                                snap.hero != null -> HeroBody(snap.hero, snap.suggestionMessage, theme, compact)
                                else -> SuggestionBody(snap, p)
                            }
                        }
                        if (!compact) {
                            Spacer(GlanceModifier.width(8.dp))
                            PlanetBlock(theme, snap, tall)
                        }
                    }
                    // 남는 높이는 여기서 흡수해 큐를 아래에 붙인다. 본문 Row에 weight를 주면
                    // 반대가 된다 — 4x2(세로 110dp)에서 큐가 자리를 다 먹고 본문(제목·완료 버튼)이
                    // 0으로 눌린다. 위쪽이 살고 꼬리(큐)가 잘리는 쪽이 안전하다.
                    Spacer(GlanceModifier.defaultWeight())
                    // 큐 노출 규칙은 앱 NowHeroCard와 동일하게 맞춘다 — 거긴 `!allDone && queue.length > 0`
                    // 뿐이라 "지금 할 일"이 없는 빈 시간에도 다음 후보를 보여주고 체크할 수 있다.
                    // allDone은 위 분기에서 이미 걸러졌으므로 여기선 집중 중만 제외하면 된다
                    // (집중 화면에 큐를 얹으면 방해가 된다).
                    val queue = if (focusTitle == null) snap.queue.take(if (tall) 3 else 2) else emptyList()
                    if (!compact && queue.isNotEmpty()) QueueSection(queue, theme)
                }
            }
        }
    }
}

/** 집중 타임 — 탭하면 뽀모도로 화면으로. 큐는 숨기고 행성·진행률만 남긴다. */
@Composable
private fun FocusBody(focusTitle: String, p: WPalette, compact: Boolean) {
    Column(modifier = GlanceModifier.fillMaxWidth()
        .clickable(actionStartActivity(deepLinkIntent(DEEPLINK_POMODORO)))) {
        Text(
            "「$focusTitle」 집중 중",
            maxLines = if (compact) 2 else 3,
            style = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Bold, color = ColorProvider(p.fg)),
        )
    }
}

/** 지금 할 일 — 제목·마감·제안 문구 + 완료 버튼. 컴팩트는 제목+버튼만 남겨 잘림을 막는다. */
@Composable
private fun HeroBody(hero: HeroTask, suggestionMessage: String?, theme: WTheme, compact: Boolean) {
    val p = theme.palette
    Column(modifier = GlanceModifier.fillMaxWidth()) {
        Text(
            hero.title,
            maxLines = if (compact) 1 else 2,
            style = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Bold, color = ColorProvider(p.fg)),
            modifier = GlanceModifier.fillMaxWidth()
                .clickable(actionStartActivity(deepLinkIntent(DEEPLINK_HOME))),
        )
        if (!compact) {
            if (hero.deadlineLabel != null) {
                Spacer(GlanceModifier.height(2.dp))
                Text(hero.deadlineLabel, maxLines = 1,
                    style = TextStyle(fontSize = 12.sp, color = ColorProvider(p.warn)))
            }
            if (!suggestionMessage.isNullOrBlank()) {
                Spacer(GlanceModifier.height(2.dp))
                Text(suggestionMessage, maxLines = 1,
                    style = TextStyle(fontSize = 12.sp, color = ColorProvider(p.sub)))
            }
        }
        Spacer(GlanceModifier.height(6.dp))
        PixelButton(
            labelRes = "w_t_complete", theme = theme, primary = true,
            onClick = actionRunCallback<ToggleTaskAction>(
                actionParametersOf(ToggleTaskAction.TaskIdParam to hero.taskId)),
        )
    }
}

/** 빈 시간 — 서버 제안 문구를 그대로 보여준다(스냅샷에 없으면 앱 기본 문구와 동일한 폴백). */
@Composable
private fun SuggestionBody(snapshot: HeroSnapshot, p: WPalette) {
    Column(modifier = GlanceModifier.fillMaxWidth()
        .clickable(actionStartActivity(deepLinkIntent(DEEPLINK_HOME)))) {
        Text(
            snapshot.suggestionTitle?.takeIf { it.isNotBlank() } ?: "지금은 비어 있는 시간이에요.",
            maxLines = 2,
            style = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Bold, color = ColorProvider(p.fg)),
        )
        Spacer(GlanceModifier.height(2.dp))
        Text(
            snapshot.suggestionMessage?.takeIf { it.isNotBlank() } ?: "가벼운 일부터 하나 시작해볼까요?",
            maxLines = 2,
            style = TextStyle(fontSize = 12.sp, color = ColorProvider(p.sub)),
        )
    }
}

/** 우상단 블록 — 행성 플리퍼 + 오늘 진행률(완료/전체). */
@Composable
private fun PlanetBlock(theme: WTheme, snapshot: HeroSnapshot, tall: Boolean) {
    Column(
        modifier = GlanceModifier.width(if (tall) 64.dp else 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        PlanetFlipper(theme, if (tall) 56.dp else 40.dp)
        Spacer(GlanceModifier.height(2.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("${snapshot.todayDone}/${snapshot.todayTotal}", maxLines = 1,
                style = TextStyle(fontSize = 12.sp, color = ColorProvider(theme.palette.fg)))
            Spacer(GlanceModifier.width(2.dp))
            PixelIcon("w_i_sparkle", theme.palette.starlight, 10.dp)
        }
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
    Box(modifier = GlanceModifier.size(size)) { AndroidRemoteViews(remoteViews = rv) }
}

/**
 * 다음 대기열 — 구분선 + "다음" 라벨 + 버킷 뱃지·제목·체크박스 행.
 * 자체 Column으로 감싼다: Glance 컨테이너는 자식 10개가 상한이라(초과 시 런타임 예외) 큐 4줄
 * (구분선·여백·라벨·행 3)을 바깥 Column에 그대로 풀면 헤더·본문과 합쳐 11개가 된다.
 */
@Composable
private fun QueueSection(items: List<QueueItem>, theme: WTheme) {
    val p = theme.palette
    Column(modifier = GlanceModifier.fillMaxWidth()) {
        Spacer(GlanceModifier.height(6.dp))
        Box(modifier = GlanceModifier.fillMaxWidth().height(2.dp).background(p.line)) {}
        Spacer(GlanceModifier.height(4.dp))
        PixelText("w_t_next", p.sub, 11.dp)
        items.forEach { item -> QueueRow(item, theme) }
    }
}

@Composable
private fun QueueRow(item: QueueItem, theme: WTheme) {
    val p = theme.palette
    Row(
        modifier = GlanceModifier.fillMaxWidth().padding(top = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(modifier = GlanceModifier.background(p.chip).cornerRadius(6.dp)
            .padding(horizontal = 5.dp, vertical = 3.dp)) {
            PixelText(bucketRes(item.bucket), p.sub, 11.dp)
        }
        Spacer(GlanceModifier.width(6.dp))
        Text(
            item.title, maxLines = 1,
            style = TextStyle(
                fontSize = 13.sp, color = ColorProvider(p.fg),
                // 완료 표시는 취소선으로 — 위젯에서 완료해도 목록 순서는 그대로 유지된다.
                textDecoration = if (item.done) TextDecoration.LineThrough else TextDecoration.None,
            ),
            modifier = GlanceModifier.defaultWeight()
                .clickable(actionStartActivity(deepLinkIntent(DEEPLINK_HOME))),
        )
        Spacer(GlanceModifier.width(4.dp))
        PixelIcon(
            if (item.done) "w_i_check_on" else "w_i_check_off", p.accent, 18.dp,
            actionRunCallback<ToggleTaskAction>(
                actionParametersOf(ToggleTaskAction.TaskIdParam to item.taskId)),
        )
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
