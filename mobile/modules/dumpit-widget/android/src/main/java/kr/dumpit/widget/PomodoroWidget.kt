package kr.dumpit.widget

import android.content.Context
import android.os.SystemClock
import android.widget.RemoteViews
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

class PomodoroWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snapshot = PomodoroSnapshot.from(WidgetStore.read(context, WidgetStore.KEY_POMODORO))
        val now = System.currentTimeMillis()
        provideContent { PomodoroContent(snapshot, now) }
    }
}

@Composable
private fun PomodoroContent(snapshot: PomodoroSnapshot?, now: Long) {
    Column(
        modifier = GlanceModifier.fillMaxSize().background(WidgetPalette.bg).cornerRadius(12.dp).padding(10.dp)
            .clickable(actionStartActivity(deepLinkIntent(DEEPLINK_POMODORO))),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        when {
            snapshot == null || snapshot.done || snapshot.currentPhase(now) == null && snapshot.pausedAt == null ->
                IdleContent(done = snapshot?.done == true)
            snapshot.pausedAt != null -> PausedContent(snapshot)
            else -> RunningContent(snapshot, now)
        }
    }
}

@Composable
private fun IdleContent(done: Boolean) {
    Text(if (done) "🎉 오늘의 집중 완료!" else "🍅 뽀모도로",
        style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 14.sp, color = ColorProvider(WidgetPalette.fg)))
    Spacer(GlanceModifier.height(8.dp))
    CommandButton(label = "집중 시작", command = "start")
}

@Composable
private fun PausedContent(snapshot: PomodoroSnapshot) {
    val remaining = snapshot.remainingSecAtPause ?: 0
    Text("⏸ 일시정지 · %d:%02d 남음".format(remaining / 60, remaining % 60),
        style = TextStyle(fontSize = 14.sp, color = ColorProvider(WidgetPalette.fg)))
    Spacer(GlanceModifier.height(8.dp))
    CommandButton(label = "재개", command = "resume")
}

@Composable
private fun RunningContent(snapshot: PomodoroSnapshot, now: Long) {
    val phase = snapshot.currentPhase(now)!!
    // 주의(브리프 대비 편차): engine.ts의 스키마 계약상 FOCUS phase.index는 이미 1부터
    // 시작한다("FOCUS면 몇 번째 집중(1부터)"). 브리프 원문은 `${phase.index + 1}번째 집중`으로
    // +1을 더해 최초 집중 세트가 "2번째 집중"으로 표시되는 오프바이원 버그가 있었다 — 계약과
    // 어긋나는 전사 오차로 판단해 +1을 제거했다.
    val label = if (phase.kind == "FOCUS") "${phase.index}번째 집중"
                else if (phase.long) "긴 휴식" else "휴식"
    Text(label, style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 13.sp,
        color = ColorProvider(if (phase.kind == "FOCUS") WidgetPalette.accent else WidgetPalette.fg)))
    val context = LocalContext.current
    val rv = RemoteViews(context.packageName, R.layout.widget_chronometer).apply {
        setChronometerCountDown(R.id.widget_chronometer, true)
        setChronometer(R.id.widget_chronometer,
            SystemClock.elapsedRealtime() + (phase.endsAt - now), null, true)
    }
    AndroidRemoteViews(remoteViews = rv)
    Spacer(GlanceModifier.height(6.dp))
    CommandButton(label = "일시정지", command = "pause")
}

@Composable
private fun CommandButton(label: String, command: String) {
    Box(modifier = GlanceModifier.background(WidgetPalette.card).cornerRadius(8.dp)
        .padding(horizontal = 14.dp, vertical = 6.dp)
        .clickable(actionRunCallback<PomodoroCommandAction>(
            actionParametersOf(PomodoroCommandAction.CommandParam to command)))) {
        Text(label, style = TextStyle(fontSize = 13.sp, color = ColorProvider(WidgetPalette.fg)))
    }
}
