package kr.dumpit.widget

import android.content.Context
import android.content.res.Configuration
import android.os.SystemClock
import android.widget.RemoteViews
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.Preferences
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.LocalContext
import androidx.glance.action.actionParametersOf
import androidx.glance.action.clickable
import androidx.glance.appwidget.AndroidRemoteViews
import androidx.glance.appwidget.GlanceAppWidget
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
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

class PomodoroWidget : GlanceAppWidget() {
    // TodayTasksWidget과 동일한 이유 — Glance가 보장하는 무효화 경로는 상태 변경 → update()뿐.
    override val stateDefinition: GlanceStateDefinition<Preferences> = PreferencesGlanceStateDefinition

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
            val theme = WidgetTheme.resolve(state[WidgetStore.THEME_STATE_KEY], systemDark)
            PomodoroContent(snapshot, theme, System.currentTimeMillis())
        }
    }
}

@Composable
private fun PomodoroContent(snapshot: PomodoroSnapshot?, theme: WTheme, now: Long) {
    // 뽀모도로 위젯은 pomo.soft 솔리드 배경 전용 — RetroFrame에 bgOverride를 넘기면 BG_SKINS 패턴
    // (히어로 전용 장식)이 자동으로 생략된다.
    RetroFrame(theme, bgOverride = theme.pomo.soft) {
        Box(
            modifier = GlanceModifier.fillMaxSize()
                .clickable(actionStartActivity(deepLinkIntent(DEEPLINK_POMODORO))),
            contentAlignment = Alignment.Center,
        ) {
            PomodoroCompact(snapshot, theme, now)
        }
    }
}

/**
 * 뽀모도로 컴팩트 레이아웃 — idle·running·paused·done 4상태 분기를 담은 자체완결 컴포저블.
 * Task 10에서 크기 기반 분기(Responsive)가 들어오면 이 함수는 작은 크기 전용으로 남고
 * PomodoroExpanded 같은 형제 컴포저블이 추가될 예정이라, 여기서 크기(LocalSize)를 참조하지 않는다.
 */
@Composable
fun PomodoroCompact(snapshot: PomodoroSnapshot?, theme: WTheme, now: Long) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        when {
            snapshot == null -> IdleContent(theme)
            snapshot.done -> DoneContent(theme)
            snapshot.pausedAt != null -> PausedContent(snapshot, theme)
            snapshot.currentPhase(now) != null -> RunningContent(snapshot, theme, now)
            // 페이즈 사이(예: 세션 시작 전) — done도 아니고 일시정지도 아니고 진행 중 페이즈도 없음.
            else -> IdleContent(theme)
        }
    }
}

@Composable
private fun IdleContent(theme: WTheme) {
    TomatoFlipper(theme, 48.dp)
    Spacer(GlanceModifier.height(8.dp))
    PixelButton(
        labelRes = "w_t_start", theme = theme, primary = true, accentOverride = theme.pomo.focus,
        onClick = actionRunCallback<PomodoroCommandAction>(
            actionParametersOf(PomodoroCommandAction.CommandParam to "start")),
    )
}

@Composable
private fun DoneContent(theme: WTheme) {
    PixelText("w_t_pomo_done", theme.palette.fg, 14.dp)
    Spacer(GlanceModifier.height(8.dp))
    PixelIcon("w_i_tomato_f1", theme.pomo.focus, 40.dp)
}

@Composable
private fun PausedContent(snapshot: PomodoroSnapshot, theme: WTheme) {
    val remaining = snapshot.remainingSecAtPause ?: 0
    Text(
        "%d:%02d".format(remaining / 60, remaining % 60),
        style = TextStyle(fontSize = 20.sp, color = ColorProvider(theme.palette.fg)),
    )
    Spacer(GlanceModifier.height(8.dp))
    Row {
        PixelButton(
            labelRes = "w_t_resume", theme = theme, primary = true, accentOverride = theme.pomo.focus,
            onClick = actionRunCallback<PomodoroCommandAction>(
                actionParametersOf(PomodoroCommandAction.CommandParam to "resume")),
        )
        Spacer(GlanceModifier.width(8.dp))
        PixelButton(
            labelRes = "w_t_reset", theme = theme, primary = false,
            onClick = actionRunCallback<PomodoroCommandAction>(
                actionParametersOf(PomodoroCommandAction.CommandParam to "reset")),
        )
    }
}

@Composable
private fun RunningContent(snapshot: PomodoroSnapshot, theme: WTheme, now: Long) {
    val phase = snapshot.currentPhase(now)!!
    // 주의(브리프 대비 편차, TodayTasksWidget 이전과 동일 결론): engine.ts의 스키마 계약상 FOCUS
    // phase.index는 이미 1부터 시작한다("FOCUS면 몇 번째 집중(1부터)"). +1을 더하면 최초 집중
    // 세트가 "2번째 집중"으로 표시되는 오프바이원이 나므로 그대로 쓴다.
    if (phase.kind == "FOCUS") {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("${phase.index}", style = TextStyle(
                fontWeight = FontWeight.Bold, fontSize = 14.sp, color = ColorProvider(theme.pomo.focus)))
            Spacer(GlanceModifier.width(2.dp))
            PixelText("w_t_nth_focus", theme.pomo.focus, 13.dp)
        }
    } else {
        PixelText(if (phase.long) "w_t_rest_long" else "w_t_rest", theme.palette.fg, 13.dp)
    }
    val context = LocalContext.current
    val rv = RemoteViews(context.packageName, R.layout.widget_chronometer).apply {
        setChronometerCountDown(R.id.widget_chronometer, true)
        setChronometer(R.id.widget_chronometer,
            SystemClock.elapsedRealtime() + (phase.endsAt - now), null, true)
    }
    // 실기기(갤럭시 S23U, 2x2)에서 크로노미터(AndroidRemoteViews)가 세로 공간을 독식해
    // 아래 버튼이 화면 밖으로 밀려 안 보이는 문제 — 높이를 고정해 공간을 제한한다.
    Box(modifier = GlanceModifier.height(40.dp), contentAlignment = Alignment.Center) {
        AndroidRemoteViews(remoteViews = rv)
    }
    Spacer(GlanceModifier.height(4.dp))
    SetDots(snapshot, now, theme)
    Spacer(GlanceModifier.height(4.dp))
    PixelButton(
        labelRes = "w_t_pause", theme = theme, primary = true, accentOverride = theme.pomo.focus,
        onClick = actionRunCallback<PomodoroCommandAction>(
            actionParametersOf(PomodoroCommandAction.CommandParam to "pause")),
    )
}

/** 세트 진행 도트 — FOCUS 페이즈 수만큼 점을 찍고, endsAt이 지난(완료된) 순서대로 채운다. */
@Composable
private fun SetDots(snapshot: PomodoroSnapshot, now: Long, theme: WTheme) {
    val focusPhases = snapshot.phases.filter { it.kind == "FOCUS" }
    val completed = focusPhases.count { it.endsAt <= now }
    Row(verticalAlignment = Alignment.CenterVertically) {
        focusPhases.forEachIndexed { i, _ ->
            if (i > 0) Spacer(GlanceModifier.width(6.dp))
            Box(modifier = GlanceModifier.size(10.dp).cornerRadius(5.dp)
                .background(if (i < completed) theme.pomo.focus else theme.pomo.ring)) {}
        }
    }
}

/**
 * 토마토 2프레임 자동 플립 — 히어로 위젯 PlanetFlipper와 같은 RemoteViews(ViewFlipper) 우회.
 * 행성 에셋과 달리 토마토 흰 글리프는 스킨색 tint가 필요해 setColorFilter를 얹는다(PixelIcon과
 * 동일한 착색이지만 AndroidRemoteViews 내부라 Glance ColorFilter를 못 쓴다).
 */
@Composable
private fun TomatoFlipper(theme: WTheme, size: Dp) {
    val context = LocalContext.current
    val f1 = drawableId("w_i_tomato_f1")
    val f2 = drawableId("w_i_tomato_f2")
    val tint = theme.pomo.focus.toArgb()
    val rv = RemoteViews(context.packageName, R.layout.widget_planet_flipper).apply {
        setImageViewResource(R.id.widget_planet_f1, f1)
        setImageViewResource(R.id.widget_planet_f2, f2)
        setInt(R.id.widget_planet_f1, "setColorFilter", tint)
        setInt(R.id.widget_planet_f2, "setColorFilter", tint)
    }
    Box(modifier = GlanceModifier.size(size)) { AndroidRemoteViews(remoteViews = rv) }
}
