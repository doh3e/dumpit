package kr.dumpit.widget

import android.content.Context
import android.content.res.Configuration
import android.os.SystemClock
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
import androidx.glance.state.GlanceStateDefinition
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

class PomodoroWidget : GlanceAppWidget() {
    // TodayTasksWidget과 동일한 이유 — Glance가 보장하는 무효화 경로는 상태 변경 → update()뿐.
    override val stateDefinition: GlanceStateDefinition<Preferences> = PreferencesGlanceStateDefinition

    companion object {
        // COMPACT(2x2)·EXPANDED(2x3, 기본 배치) — 폭은 동일하고 높이만 갈라 세션 링을 보일지를 정한다.
        // EXPANDED 230dp — 헤더·밑줄·링(120dp)·태스크 칩·버튼 행을 다 쌓으면 실측 ~242dp라
        // 180dp로는 하단(버튼 행)이 밀도 높은 런처에서 잘린다(리뷰 지적, Task 12 실기기 미세조정 전
        // 안전 기본값).
        private val COMPACT = DpSize(110.dp, 110.dp)
        private val EXPANDED = DpSize(110.dp, 230.dp)
    }

    override val sizeMode: SizeMode = SizeMode.Responsive(setOf(COMPACT, EXPANDED))

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
            // Responsive(COMPACT 110x110 / EXPANDED 110x230) — 폭이 같으니 높이만으로 갈라진다.
            if (LocalSize.current.height >= 230.dp) {
                PomodoroExpanded(snapshot, theme, now)
            } else {
                PomodoroCompact(snapshot, theme, now)
            }
        }
    }
}

/**
 * 뽀모도로 컴팩트 레이아웃 — idle·running·paused·done 4상태 분기를 담은 자체완결 컴포저블.
 * Task 10부터는 작은 크기(COMPACT) 전용이고, 큰 크기(EXPANDED)는 형제 컴포저블 PomodoroExpanded가
 * 맡는다(분기는 PomodoroContent). 그래서 여기선 크기(LocalSize)를 참조하지 않는다.
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
    PhaseLabel(phase, theme)
    val context = LocalContext.current
    val rv = chronometerRemoteViews(context, theme, phase, now)
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

/**
 * 세트 진행 도트 — FOCUS 세트 수만큼 점을 찍고, 완료된 순서대로 채운다.
 * 주의(리뷰 Critical 수정, 링과 같은 결함): snapshot.phases는 phasesFrom()이 돌려주는 "남은"
 * FOCUS만 담고 있어(이미 끝난 FOCUS는 재미러 시점에 걸러짐) 예전엔 "찍는 점 개수"까지
 * phases 안 FOCUS 수를 썼다 — 재미러마다 점 개수 자체가 줄어들었다(총 세트 수가 아니게 됨).
 * focusDone(+focusTotal)을 얹어 "완료 수"와 "찍을 점 개수" 둘 다 세션 전체 기준으로 고정한다.
 */
@Composable
private fun SetDots(snapshot: PomodoroSnapshot, now: Long, theme: WTheme) {
    val focusVisible = snapshot.phases.count { it.kind == "FOCUS" }
    val completed = snapshot.focusDone + snapshot.phases.count { it.kind == "FOCUS" && it.endsAt <= now }
    val total = snapshot.focusTotal ?: (snapshot.focusDone + focusVisible).coerceAtLeast(1)
    Row(verticalAlignment = Alignment.CenterVertically) {
        for (i in 0 until total) {
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

/**
 * 페이즈 라벨(FOCUS면 "N번째 집중", REST/REST_LONG이면 해당 문구) — RunningContent(컴팩트)와
 * SessionRing(확장형) 공용. 크기만 파라미터로 갈라 두 문맥에 맞춘다.
 * 주의(TodayTasksWidget 이전과 동일 결론): engine.ts 계약상 FOCUS phase.index는 이미 1부터
 * 시작한다("FOCUS면 몇 번째 집중(1부터)"). +1을 더하면 오프바이원이 나므로 그대로 쓴다.
 */
@Composable
private fun PhaseLabel(phase: PomodoroPhase, theme: WTheme, indexSp: TextUnit = 14.sp, textDp: Dp = 13.dp) {
    if (phase.kind == "FOCUS") {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("${phase.index}", style = TextStyle(
                fontWeight = FontWeight.Bold, fontSize = indexSp, color = ColorProvider(theme.pomo.focus)))
            Spacer(GlanceModifier.width(2.dp))
            PixelText("w_t_nth_focus", theme.pomo.focus, textDp)
        }
    } else {
        PixelText(if (phase.long) "w_t_rest_long" else "w_t_rest", theme.palette.fg, textDp)
    }
}

/**
 * 크로노미터 RemoteViews 공용 생성 — 컴팩트(RunningContent)·확장형(SessionRing) 둘 다 여기를
 * 거친다. widget_chronometer.xml은 textColor가 라이트 fg로 고정돼 있어(다크·스킨 배경에서
 * 안 읽히는 Task 9 이후 발견 버그) setTextColor로 런타임에 덮어쓴다. XML 자체는 건드리지 않는다.
 */
private fun chronometerRemoteViews(context: Context, theme: WTheme, phase: PomodoroPhase, now: Long): RemoteViews =
    RemoteViews(context.packageName, R.layout.widget_chronometer).apply {
        setChronometerCountDown(R.id.widget_chronometer, true)
        setChronometer(R.id.widget_chronometer,
            SystemClock.elapsedRealtime() + (phase.endsAt - now), null, true)
        setTextColor(R.id.widget_chronometer, theme.palette.fg.toArgb())
    }

/** dp → px, WidgetRing 비트맵 생성 전용(Compose dp 단위계 밖에서 Bitmap 픽셀 크기가 필요). */
private fun px(context: Context, value: Dp): Int = (value.value * context.resources.displayMetrics.density).toInt()

/**
 * 뽀모도로 확장형(세로 180dp 이상) — POMODORO 타이틀·모드 필·세션 링을 갖춘 데스크탑 아이덴티티.
 * RetroFrame·바깥 클릭(딥링크)은 PomodoroContent가 이미 씌워주므로 여기선 Column 내용만 채운다.
 */
@Composable
fun PomodoroExpanded(snapshot: PomodoroSnapshot?, theme: WTheme, now: Long) {
    val p = theme.palette
    // 일시정지 중엔 pausedAt을 now로 고정해 계산한다 — 실시간 now를 그대로 쓰면 일시정지 중에도
    // 링·페이즈 판정이 몰래 전진해버린다("paused = compute with now frozen" 브리프 명시 사항).
    val effectiveNow = snapshot?.pausedAt ?: now
    val activePhase = snapshot?.takeIf { !it.done }?.currentPhase(effectiveNow)
    // 링 색·모드 필 배경 공용 — 진행 중 페이즈가 없으면(세션 없음/종료) 항상 focus 취급.
    val resting = activePhase != null && activePhase.kind != "FOCUS"
    // PomodoroCompact의 IdleContent 분기(스냅샷 없음 OR 페이즈 사이 빈틈)와 동일 조건.
    val isIdle = snapshot == null || (!snapshot.done && snapshot.pausedAt == null && activePhase == null)
    // 전체 페이즈 기준 진행률(브리프 명시: FOCUS만이 아니라 phases 전체).
    // 주의(리뷰 Critical 수정): snapshot.phases는 phasesFrom()이 돌려주는 "남은" 타임라인뿐이라
    // (이미 끝난 페이즈는 JS 미러 작성 시점에 걸러짐, 재미러마다 재생성) phases만으로 완료 수를
    // 세면 일시정지·재개·reconcile 직후 항상 0으로 보이고 분모(phases.size)도 세션이 진행될수록
    // 줄어든다. snapshot.phaseDone(+phaseTotal)이 "이미 끝난 만큼"을 별도로 실어보내므로 그 위에
    // phases 안에서 실시간으로 지난(now 전진에 따른, 틱 재구성 전제) 몫만 더한다.
    // phaseTotal이 null(무한 세션, 또는 신필드 없는 구 미러 — 이때 phaseDone도 0으로 폴백)이면
    // phaseDone+phases.size로 굴러가는(rolling) 분모를 근사한다.
    val fraction = when {
        snapshot == null -> 0f
        snapshot.done -> 1f
        else -> {
            val completed = snapshot.phaseDone + snapshot.phases.count { it.endsAt <= effectiveNow }
            val total = snapshot.phaseTotal ?: (snapshot.phaseDone + snapshot.phases.size).coerceAtLeast(1)
            completed.toFloat() / total
        }
    }
    // 아래로는 nullable snapshot을 직접 넘기지 않고 원시값만 넘긴다 — when 분기 사이에는 스마트
    // 캐스트가 이어지지 않아(isIdle 같은 별도 Boolean 플래그로는 컴파일러가 non-null을 못 좁힌다)
    // 자식 컴포저블 안에서 snapshot!!를 반복하면 컴파일 에러거나 취약해진다.
    val done = snapshot?.done == true
    val paused = snapshot?.pausedAt != null
    val remainingSec = snapshot?.remainingSecAtPause ?: 0L
    val taskTitle = snapshot?.taskTitle

    // horizontalAlignment 명시 — Glance Column 기본은 Start라, 없으면 위젯을 옆으로 늘렸을 때
    // 링·버튼 행이 왼쪽에 붙는다(PomodoroCompact는 이미 이걸 명시하고 있다. 리뷰 지적).
    Column(modifier = GlanceModifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
        Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            PixelText("w_t_pomodoro", p.sub, 11.dp)
            Spacer(GlanceModifier.defaultWeight())
            ModePill(resting, isIdle, theme)
        }
        Spacer(GlanceModifier.height(4.dp))
        Box(modifier = GlanceModifier.fillMaxWidth().height(2.dp).background(p.accent2)) {}
        Spacer(GlanceModifier.height(6.dp))
        SessionRing(theme, now, activePhase, resting, isIdle, done, paused, remainingSec, fraction)
        Spacer(GlanceModifier.height(6.dp))
        if (taskTitle != null) TaskChip(taskTitle, theme)
        Spacer(GlanceModifier.defaultWeight())
        ExpandedButtons(isIdle, done, paused, theme)
    }
}

/** 모드 필 — idle이면 chip 배경+sub 문자, 아니면 휴식/집중 색 배경+onAccent 문자(edge 보더 이중 Box). */
@Composable
private fun ModePill(resting: Boolean, isIdle: Boolean, theme: WTheme) {
    val p = theme.palette
    val bg = if (isIdle) p.chip else (if (resting) theme.pomo.rest else theme.pomo.focus)
    val tint = if (isIdle) p.sub else p.onAccent
    Box(modifier = GlanceModifier.background(p.edge).cornerRadius(7.dp).padding(1.dp)) {
        Box(modifier = GlanceModifier.background(bg).cornerRadius(6.dp)
            .padding(horizontal = 6.dp, vertical = 3.dp)) {
            PixelText(if (resting) "w_t_mode_break" else "w_t_mode_focus", tint, 10.dp)
        }
    }
}

/**
 * 세션 링 — WidgetRing 비트맵(120dp, 10dp 스트로크)을 Box 중앙에 놓고 그 위에 페이즈 라벨 +
 * 크로노미터(running)/남은 시간(paused)를 얹는다. idle이면 라벨·타이머를 생략(링만 0%로 표시).
 */
@Composable
private fun SessionRing(
    theme: WTheme, now: Long, activePhase: PomodoroPhase?, resting: Boolean, isIdle: Boolean,
    done: Boolean, paused: Boolean, remainingSec: Long, fraction: Float,
) {
    val context = LocalContext.current
    val progressColor = (if (resting) theme.pomo.rest else theme.pomo.focus).toArgb()
    val bmp = WidgetRing.bitmap(
        px(context, 120.dp), theme.pomo.ring.toArgb(), progressColor, fraction, px(context, 10.dp))
    Box(contentAlignment = Alignment.Center) {
        Image(provider = ImageProvider(bmp), contentDescription = null, modifier = GlanceModifier.size(120.dp))
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            when {
                isIdle -> {}
                done -> PixelText("w_t_pomo_done", theme.palette.fg, 11.dp)
                // paused는 항상 남은 시간을 보여준다(PausedContent와 동일 — activePhase가 정확히
                // 페이즈 경계에서 null로 풀리는 드문 경우에도 시간 표시는 계속 나와야 한다).
                paused -> {
                    if (activePhase != null) PhaseLabel(activePhase, theme, indexSp = 13.sp, textDp = 11.dp)
                    Text("%d:%02d".format(remainingSec / 60, remainingSec % 60),
                        style = TextStyle(fontSize = 16.sp, color = ColorProvider(theme.palette.fg)))
                }
                activePhase != null -> {
                    PhaseLabel(activePhase, theme, indexSp = 13.sp, textDp = 11.dp)
                    val rv = chronometerRemoteViews(context, theme, activePhase, now)
                    Box(modifier = GlanceModifier.height(40.dp), contentAlignment = Alignment.Center) {
                        AndroidRemoteViews(remoteViews = rv)
                    }
                }
            }
        }
    }
}

/** 태스크 칩 — 카드 배경 + 제목(시스템 폰트, 1줄) + 뽀모도로 딥링크. */
@Composable
private fun TaskChip(taskTitle: String, theme: WTheme) {
    Box(
        modifier = GlanceModifier.fillMaxWidth().background(theme.palette.card).cornerRadius(8.dp)
            .padding(horizontal = 8.dp, vertical = 6.dp)
            .clickable(actionStartActivity(deepLinkIntent(DEEPLINK_POMODORO))),
    ) {
        Text(taskTitle, maxLines = 1, style = TextStyle(fontSize = 13.sp, color = ColorProvider(theme.palette.fg)))
    }
}

/** 상태별 버튼 행 — idle/done은 시작(새 세션 포함), running은 일시정지+리셋, paused는 재개+리셋. */
@Composable
private fun ExpandedButtons(isIdle: Boolean, done: Boolean, paused: Boolean, theme: WTheme) {
    Row {
        when {
            isIdle || done -> PixelButton(
                labelRes = "w_t_start", theme = theme, primary = true, accentOverride = theme.pomo.focus,
                onClick = actionRunCallback<PomodoroCommandAction>(
                    actionParametersOf(PomodoroCommandAction.CommandParam to "start")),
            )
            paused -> {
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
            else -> {
                PixelButton(
                    labelRes = "w_t_pause", theme = theme, primary = true, accentOverride = theme.pomo.focus,
                    onClick = actionRunCallback<PomodoroCommandAction>(
                        actionParametersOf(PomodoroCommandAction.CommandParam to "pause")),
                )
                Spacer(GlanceModifier.width(8.dp))
                PixelButton(
                    labelRes = "w_t_reset", theme = theme, primary = false,
                    onClick = actionRunCallback<PomodoroCommandAction>(
                        actionParametersOf(PomodoroCommandAction.CommandParam to "reset")),
                )
            }
        }
    }
}
