package kr.dumpit.widget

import android.content.Context
import android.content.res.Configuration
import android.os.SystemClock
import android.graphics.Paint
import android.graphics.Typeface
import android.text.format.DateUtils
import android.util.TypedValue
import android.widget.RemoteViews
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.Preferences
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
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
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

internal val POMODORO_MIN_SIZE = DpSize(180.dp, 260.dp)
internal val POMODORO_RING_SIZE = 96.dp
internal val POMODORO_HEADER_HEIGHT = 16.dp
internal val POMODORO_TITLE_HEIGHT = 10.dp
internal val POMODORO_TITLE_WIDTH = (10f * 141 / 18).dp
internal val POMODORO_MODE_HEIGHT = 10.dp
internal val POMODORO_MODE_WIDTH = (10f * 87 / 18).dp
internal val POMODORO_MODE_PADDING = 4.dp
internal val POMODORO_HEADER_GAP = 10.dp
internal val POMODORO_TASK_GAP = 8.dp
internal val POMODORO_TASK_HEIGHT = 28.dp
internal val POMODORO_BUTTON_GAP = 14.dp
private val POMODORO_ACTION_GAP = 8.dp
private val POMODORO_PRIMARY_ACTION_WIDTH = 72.dp
private val POMODORO_RESET_ACTION_WIDTH = 48.dp

internal enum class PomodoroLayout { ResizeRequired, ExpandedWide, ExpandedTall }

internal fun pomodoroLayoutFor(size: DpSize): PomodoroLayout = when {
    size.width < POMODORO_MIN_SIZE.width || size.height < POMODORO_MIN_SIZE.height -> PomodoroLayout.ResizeRequired
    size.width >= 320.dp -> PomodoroLayout.ExpandedWide
    else -> PomodoroLayout.ExpandedTall
}

internal fun expandedTallPairedActionWidth(): Dp =
    POMODORO_PRIMARY_ACTION_WIDTH + POMODORO_ACTION_GAP + POMODORO_RESET_ACTION_WIDTH

internal fun pomodoroTallContentHeight(hasTask: Boolean): Dp =
    POMODORO_HEADER_HEIGHT + POMODORO_HEADER_GAP + POMODORO_RING_SIZE +
        (if (hasTask) POMODORO_TASK_GAP + POMODORO_TASK_HEIGHT else 0.dp) +
        POMODORO_BUTTON_GAP + WIDGET_TOUCH_SIZE

class PomodoroWidget : GlanceAppWidget() {
    // TodayTasksWidget과 동일한 이유 — Glance가 보장하는 무효화 경로는 상태 변경 → update()뿐.
    override val stateDefinition: GlanceStateDefinition<Preferences> = PreferencesGlanceStateDefinition

    override val sizeMode: SizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // 세션 시작 시 SharedPreferences의 최신 스냅샷을 Glance 상태로 동기화해둔다(TodayTasksWidget과
        // 동일한 이유 — 앱 업데이트 직후처럼 이 GlanceId에 상태가 한 번도 쓰인 적 없을 수 있다).
        // 테마도 히어로와 동일하게 함께 동기화한다 — pomo 스킨(솔리드 배경색)·다크 모드가 이 위젯에도 반영돼야 한다.
        val latest = WidgetStore.read(context, WidgetStore.KEY_POMODORO)
        val themeJson = WidgetStore.read(context, WidgetStore.KEY_THEME)
        updateAppWidgetState(context, id) { prefs ->
            if (latest == null) prefs.remove(WidgetStore.POMODORO_STATE_KEY) else prefs[WidgetStore.POMODORO_STATE_KEY] = latest
            if (themeJson == null) prefs.remove(WidgetStore.THEME_STATE_KEY) else prefs[WidgetStore.THEME_STATE_KEY] = themeJson
        }
        provideContent {
            // 재구성마다 Glance 상태를 읽는다 — SharedPreferences 직접 읽기(구 방식)는 활성 세션
            // 생존 중 스테일해질 수 있다(실기기 확정 버그).
            val state = currentState<Preferences>()
            val snapshot = PomodoroSnapshot.from(state[WidgetStore.POMODORO_STATE_KEY])
            // mode="system"일 때만 쓰이는 기기 다크 여부 — 히어로 위젯과 동일한 판정(위젯 호스트는
            // 앱 컨텍스트를 상속하므로 런처 프로세스가 아니라 이 앱 리소스 설정을 본다).
            val systemDark = (LocalContext.current.resources.configuration.uiMode and
                Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
            val theme = WidgetTheme.resolve(
                themeJsonForRender(state[WidgetStore.THEME_STATE_KEY], themeJson),
                systemDark,
            )
            PomodoroContent(snapshot, theme, System.currentTimeMillis())
        }
    }
}

@Composable
private fun PomodoroContent(snapshot: PomodoroSnapshot?, theme: WTheme, now: Long) {
    // 뽀모도로 위젯은 pomo.soft 솔리드 배경 전용 — RetroFrame에 bgOverride를 넘기면 BG_SKINS 패턴
    // (히어로 전용 장식)이 자동으로 생략된다.
    val layout = pomodoroLayoutFor(LocalSize.current)
    RetroFrame(
        theme,
        bgOverride = theme.pomo.soft,
    ) {
        when (layout) {
            PomodoroLayout.ExpandedTall -> PomodoroExpanded(snapshot, theme, now)
            PomodoroLayout.ExpandedWide -> PomodoroExpandedWide(snapshot, theme, now)
            PomodoroLayout.ResizeRequired -> WidgetResizeNotice(theme, actionStartActivity(deepLinkIntent(DEEPLINK_POMODORO)))
        }
    }
}

/**
 * 토마토 2프레임 자동 플립 — 히어로 위젯 PlanetFlipper와 같은 RemoteViews(ViewFlipper) 우회.
 * 컬러 스프라이트(w_i_tomato_c_*, 빨강 몸통·초록 꼭지)를 tint 없이 쓴다 — 흰 글리프+스킨색
 * tint(구 w_i_tomato_*)는 실기기에서 "덩어리"로 보인다는 지적.
 */
@Composable
private fun TomatoFlipper(size: Dp) {
    val context = LocalContext.current
    val rv = RemoteViews(context.packageName, R.layout.widget_planet_flipper).apply {
        setImageViewResource(R.id.widget_planet_f1, drawableId("w_i_tomato_c_f1"))
        setImageViewResource(R.id.widget_planet_f2, drawableId("w_i_tomato_c_f2"))
    }
    // fillMaxSize 필수 — AndroidRemoteViews 기본은 wrap이라 nodpi 비트맵이 intrinsic 크기로
    // 쪼그라든다(PlanetFlipper와 동일 증상·동일 수정).
    Box(modifier = GlanceModifier.size(size)) {
        AndroidRemoteViews(remoteViews = rv, modifier = GlanceModifier.fillMaxSize())
    }
}

internal data class PomodoroPhaseLabel(val index: Int?, val textRes: String)

internal fun pomodoroPhaseLabel(phase: PomodoroPhase): PomodoroPhaseLabel =
    if (phase.kind == "FOCUS") PomodoroPhaseLabel(phase.index, "w_t_nth_focus")
    else PomodoroPhaseLabel(null, if (phase.long) "w_t_rest_long" else "w_t_rest")

// phase.index는 엔진에서 이미 1부터 시작하므로 표시할 때 더하지 않는다.
@Composable
private fun PhaseLabel(phase: PomodoroPhase, theme: WTheme, indexSp: TextUnit = 14.sp, textDp: Dp = 13.dp) {
    val label = pomodoroPhaseLabel(phase)
    if (label.index != null) {
        val focusText = readableWidgetText(theme.pomo.focus, theme.pomo.soft)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("${label.index}", style = TextStyle(
                fontWeight = FontWeight.Bold, fontSize = indexSp, color = ColorProvider(focusText)))
            Spacer(GlanceModifier.width(2.dp))
            PixelText(label.textRes, focusText, textDp)
        }
    } else {
        PixelText(label.textRes, theme.palette.fg, textDp)
    }
}

private fun chronometerRemoteViews(
    context: Context, theme: WTheme, phase: PomodoroPhase, now: Long, textSizeSp: Float = 26f,
): RemoteViews =
    RemoteViews(context.packageName, R.layout.widget_chronometer).apply {
        setChronometerCountDown(R.id.widget_chronometer, true)
        setChronometer(R.id.widget_chronometer,
            SystemClock.elapsedRealtime() + (phase.endsAt - now), null, true)
        setTextColor(R.id.widget_chronometer, theme.palette.fg.toArgb())
        setTextViewTextSize(R.id.widget_chronometer, TypedValue.COMPLEX_UNIT_SP, textSizeSp)
    }

/** dp → px, WidgetRing 비트맵 생성 전용(Compose dp 단위계 밖에서 Bitmap 픽셀 크기가 필요). */
private fun px(context: Context, value: Dp): Int = (value.value * context.resources.displayMetrics.density).toInt()

/**
 * 확장형 공용 상태 — 세로(PomodoroExpanded)·가로(PomodoroExpandedWide)가 같은 파생 규칙을 쓴다.
 * nullable snapshot을 자식에 직접 넘기지 않고 원시값만 담는다 — when 분기 사이에는 스마트
 * 캐스트가 이어지지 않아 자식 컴포저블 안에서 snapshot!!를 반복하면 컴파일 에러거나 취약해진다.
 */
private data class ExpandedState(
    val activePhase: PomodoroPhase?, val resting: Boolean, val isIdle: Boolean,
    val done: Boolean, val paused: Boolean, val remainingSec: Long,
    val taskTitle: String?, val fraction: Float,
)

private fun deriveExpandedState(snapshot: PomodoroSnapshot?, now: Long): ExpandedState {
    // 일시정지 중엔 pausedAt을 now로 고정해 계산한다 — 실시간 now를 그대로 쓰면 일시정지 중에도
    // 링·페이즈 판정이 몰래 전진해버린다("paused = compute with now frozen" 브리프 명시 사항).
    val effectiveNow = snapshot?.pausedAt ?: now
    val activePhase = snapshot?.takeIf { !it.done }?.currentPhase(effectiveNow)
    // 링 색·모드 필 배경 공용 — 진행 중 페이즈가 없으면(세션 없음/종료) 항상 focus 취급.
    val resting = activePhase != null && activePhase.kind != "FOCUS"
    // effectivelyDone — JS 미러 done 플래그 + 위젯 단독 시간 경과 완료 파생. isIdle보다 먼저
    // 판정해야 최종 완료가 idle(링 0%·시작 버튼)로 오인되지 않는다.
    val done = snapshot?.effectivelyDone(now) == true
    val isIdle = snapshot == null || (!done && snapshot.pausedAt == null && activePhase == null)
    // 전체 페이즈 기준 진행률(브리프 명시: FOCUS만이 아니라 phases 전체). snapshot.phases는
    // phasesFrom()이 돌려주는 "남은" 타임라인뿐이라(이미 끝난 페이즈는 미러 작성 시점에 걸러짐,
    // 재미러마다 재생성) phases만으로 완료 수를 세면 항상 0으로 보이고 분모(phases.size)도
    // 세션이 진행될수록 줄어든다. snapshot.phaseDone(+phaseTotal)이 "이미 끝난 만큼"을 별도로
    // 실어보내므로 그 위에 phases 안에서 실시간으로 지난 몫만 더한다. phaseTotal이 null(무한
    // 세션, 또는 신필드 없는 구 미러)이면 phaseDone+phases.size로 굴러가는(rolling) 분모를
    // 근사한다.
    val fraction = when {
        snapshot == null -> 0f
        done -> 1f
        else -> {
            val completed = snapshot.phaseDone + snapshot.phases.count { it.endsAt <= effectiveNow }
            val total = snapshot.phaseTotal ?: (snapshot.phaseDone + snapshot.phases.size).coerceAtLeast(1)
            completed.toFloat() / total
        }
    }
    return ExpandedState(
        activePhase = activePhase, resting = resting, isIdle = isIdle,
        done = done, paused = snapshot?.pausedAt != null,
        remainingSec = snapshot?.remainingSecAtPause ?: 0L,
        taskTitle = snapshot?.taskTitle, fraction = fraction,
    )
}

@Composable
fun PomodoroExpanded(snapshot: PomodoroSnapshot?, theme: WTheme, now: Long) {
    val s = deriveExpandedState(snapshot, now)
    Column(modifier = GlanceModifier.fillMaxWidth().height(pomodoroTallContentHeight(s.taskTitle != null)),
        horizontalAlignment = Alignment.CenterHorizontally) {
        PomodoroHeader(s, theme)
        Spacer(GlanceModifier.height(POMODORO_HEADER_GAP))
        Column(modifier = GlanceModifier.fillMaxWidth()
            .semantics { contentDescription = s.taskTitle?.let { "$it. 뽀모도로 열기" } ?: "뽀모도로 열기" }
            .clickable(actionStartActivity(deepLinkIntent(DEEPLINK_POMODORO))), horizontalAlignment = Alignment.CenterHorizontally) {
            SessionRing(theme, now, s.activePhase, s.resting, s.isIdle, s.done, s.paused, s.remainingSec, s.fraction, POMODORO_RING_SIZE)
            if (s.taskTitle != null) {
                Spacer(GlanceModifier.height(POMODORO_TASK_GAP))
                TaskChip(s.taskTitle, theme)
            }
        }
        Spacer(GlanceModifier.height(POMODORO_BUTTON_GAP))
        ExpandedButtons(s.isIdle, s.done, s.paused, theme)
    }
}

@Composable
private fun PomodoroHeader(s: ExpandedState, theme: WTheme) {
    Row(modifier = GlanceModifier.fillMaxWidth().height(POMODORO_HEADER_HEIGHT), verticalAlignment = Alignment.CenterVertically) {
        PixelText("w_t_pomodoro", readableWidgetText(theme.palette.sub, theme.pomo.soft),
            POMODORO_TITLE_HEIGHT, width = POMODORO_TITLE_WIDTH)
        Spacer(GlanceModifier.defaultWeight())
        ModePill(s.resting, s.isIdle, theme)
    }
}

@Composable
fun PomodoroExpandedWide(snapshot: PomodoroSnapshot?, theme: WTheme, now: Long) {
    val s = deriveExpandedState(snapshot, now)
    Row(modifier = GlanceModifier.width(256.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = GlanceModifier.size(POMODORO_RING_SIZE)
            .semantics { contentDescription = "뽀모도로 열기" }
            .clickable(actionStartActivity(deepLinkIntent(DEEPLINK_POMODORO))), contentAlignment = Alignment.Center) {
            SessionRing(theme, now, s.activePhase, s.resting, s.isIdle, s.done, s.paused, s.remainingSec, s.fraction, POMODORO_RING_SIZE)
        }
        Spacer(GlanceModifier.width(20.dp))
        Column(modifier = GlanceModifier.width(140.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Box(modifier = GlanceModifier.fillMaxWidth()
                .semantics { contentDescription = s.taskTitle?.let { "$it. 뽀모도로 열기" } ?: "뽀모도로 열기" }
                .clickable(actionStartActivity(deepLinkIntent(DEEPLINK_POMODORO)))) {
                Spacer(GlanceModifier.height(WIDGET_TOUCH_SIZE))
                Column {
                    PomodoroHeader(s, theme)
                    if (s.taskTitle != null) {
                        Spacer(GlanceModifier.height(POMODORO_TASK_GAP))
                        TaskChip(s.taskTitle, theme)
                    }
                }
            }
            Spacer(GlanceModifier.height(POMODORO_BUTTON_GAP))
            ExpandedButtons(s.isIdle, s.done, s.paused, theme)
        }
    }
}

/** 모드 필 — idle이면 chip 배경+sub 문자, 아니면 휴식/집중 색 배경+onAccent 문자(edge 보더 이중 Box). */
@Composable
private fun ModePill(resting: Boolean, isIdle: Boolean, theme: WTheme) {
    val p = theme.palette
    val bg = if (isIdle) p.chip else (if (resting) theme.pomo.rest else theme.pomo.focus)
    val tint = if (isIdle) readableWidgetText(p.sub, p.chip) else readableWidgetText(p.onAccent, bg)
    Box(modifier = GlanceModifier.background(p.edge).cornerRadius(7.dp).padding(1.dp)) {
        Box(modifier = GlanceModifier.background(bg).cornerRadius(6.dp)
            .padding(horizontal = POMODORO_MODE_PADDING, vertical = 2.dp)) {
            PixelText(if (resting) "w_t_mode_break" else "w_t_mode_focus", tint,
                POMODORO_MODE_HEIGHT, width = POMODORO_MODE_WIDTH)
        }
    }
}

/**
 * 세션 링 — WidgetRing 비트맵(ringSize, 10dp 스트로크)을 Box 중앙에 놓고 그 위에 페이즈 라벨 +
 * 크로노미터(running)/남은 시간(paused)를 얹는다. idle이면 라벨·타이머를 생략(링만 0%로 표시).
 */
@Composable
private fun SessionRing(
    theme: WTheme, now: Long, activePhase: PomodoroPhase?, resting: Boolean, isIdle: Boolean,
    done: Boolean, paused: Boolean, remainingSec: Long, fraction: Float, ringSize: Dp,
) {
    val context = LocalContext.current
    val progressColor = (if (resting) theme.pomo.rest else theme.pomo.focus).toArgb()
    val bmp = WidgetRing.bitmap(
        px(context, ringSize), theme.pomo.ring.toArgb(), progressColor, fraction, px(context, 10.dp))
    Box(modifier = GlanceModifier.size(ringSize), contentAlignment = Alignment.Center) {
        Image(provider = ImageProvider(bmp), contentDescription = null, modifier = GlanceModifier.size(ringSize))
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            when {
                isIdle -> TomatoFlipper(40.dp)
                done -> PixelText("w_t_pomo_done", theme.palette.fg, 11.dp)
                paused -> {
                    if (activePhase != null) PhaseLabel(activePhase, theme, indexSp = 11.sp, textDp = 10.dp)
                    val time = "%d:%02d".format(remainingSec / 60, remainingSec % 60)
                    Text(time, maxLines = 1, style = TextStyle(
                        fontSize = ringTimerTextSize(context, time, ringSize, bold = false).sp,
                        color = ColorProvider(theme.palette.fg)))
                }
                activePhase != null -> {
                    PhaseLabel(activePhase, theme, indexSp = 11.sp, textDp = 10.dp)
                    val time = DateUtils.formatElapsedTime(
                        ((activePhase.endsAt - activePhase.startsAt + 999L) / 1000L).coerceAtLeast(0L),
                    )
                    val rv = chronometerRemoteViews(context, theme, activePhase, now,
                        textSizeSp = ringTimerTextSize(context, time, ringSize, bold = true))
                    Box(modifier = GlanceModifier.height(36.dp), contentAlignment = Alignment.Center) {
                        AndroidRemoteViews(remoteViews = rv)
                    }
                }
            }
        }
    }
}

// Chronometer는 60분부터 시간 자리도 출력한다. 150% 글자와 최대 120분 설정에서도
// 링 안쪽을 넘지 않게 페이즈 전체 길이와 가장 넓은 숫자로 공간을 예약한다.
private fun ringTimerTextSize(context: Context, time: String, ringSize: Dp, bold: Boolean): Float {
    val metrics = context.resources.displayMetrics
    val paint = Paint().apply {
        typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
    }
    val availableWidth = px(context, ringSize - 24.dp).toFloat()
    val digits = (0..9).map { "%d".format(it) }
    return fitRingTimerTextSize(availableWidth) { sizeSp ->
        paint.textSize = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, sizeSp, metrics)
        val widestDigit = digits.maxBy { paint.measureText(it) }
        paint.measureText(time.map { if (it.isDigit()) widestDigit else it.toString() }.joinToString(""))
    }
}

// Android의 비선형 글자 확대에서는 20sp 측정값을 비례 축소할 수 없으므로 후보마다 측정한다.
internal fun fitRingTimerTextSize(availableWidth: Float, measureAtSp: (Float) -> Float): Float {
    if (measureAtSp(20f) <= availableWidth) return 20f
    var lower = 0f
    var upper = 20f
    repeat(12) {
        val candidate = (lower + upper) / 2f
        if (measureAtSp(candidate) <= availableWidth) lower = candidate else upper = candidate
    }
    return lower
}

@Composable
private fun TaskChip(taskTitle: String, theme: WTheme) {
    Box(modifier = GlanceModifier.fillMaxWidth().height(POMODORO_TASK_HEIGHT)
        .background(theme.palette.card).cornerRadius(8.dp).padding(horizontal = 8.dp),
        contentAlignment = Alignment.CenterStart) {
        Text(taskTitle, maxLines = 1,
            style = TextStyle(fontSize = 13.sp, color = ColorProvider(theme.palette.fg)))
    }
}

@Composable
private fun ExpandedButtons(isIdle: Boolean, done: Boolean, paused: Boolean, theme: WTheme) {
    if (isIdle || done) {
        PixelButton(
            labelRes = "w_t_start", theme = theme, primary = true, accentOverride = theme.pomo.focus,
            onClick = actionRunCallback<PomodoroCommandAction>(
                actionParametersOf(PomodoroCommandAction.CommandParam to "start")),
            actionLabel = "뽀모도로 시작",
        )
    } else {
        Row(modifier = GlanceModifier.width(expandedTallPairedActionWidth()).height(WIDGET_TOUCH_SIZE),
            verticalAlignment = Alignment.CenterVertically) {
            ExpandedPrimaryButton(paused, theme, GlanceModifier.width(POMODORO_PRIMARY_ACTION_WIDTH))
            Spacer(GlanceModifier.width(POMODORO_ACTION_GAP))
            ResetIconButton(theme)
        }
    }
}

@Composable
private fun ExpandedPrimaryButton(paused: Boolean, theme: WTheme, modifier: GlanceModifier) {
    val command = if (paused) "resume" else "pause"
    PixelButton(
        labelRes = if (paused) "w_t_resume" else "w_t_pause",
        theme = theme,
        primary = true,
        accentOverride = theme.pomo.focus,
        onClick = actionRunCallback<PomodoroCommandAction>(
            actionParametersOf(PomodoroCommandAction.CommandParam to command)),
        actionLabel = if (paused) "뽀모도로 재개" else "뽀모도로 일시정지",
        modifier = modifier,
    )
}

@Composable
private fun ResetIconButton(theme: WTheme) {
    PixelIconButton(
        iconRes = "w_i_refresh",
        theme = theme,
        primary = false,
        onClick = actionRunCallback<PomodoroCommandAction>(
            actionParametersOf(PomodoroCommandAction.CommandParam to "reset")),
        actionLabel = "뽀모도로 초기화",
        modifier = GlanceModifier.width(POMODORO_RESET_ACTION_WIDTH),
    )
}
