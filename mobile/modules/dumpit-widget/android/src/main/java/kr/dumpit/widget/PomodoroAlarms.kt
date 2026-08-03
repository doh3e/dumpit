package kr.dumpit.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build

object PomodoroAlarms {
    private const val REQUEST_CODE = 43_00

    /** 다음 페이즈 경계에 1발 예약 — 울리면 재렌더 후 다시 예약(릴레이) */
    fun reschedule(context: Context) {
        val am = context.getSystemService(AlarmManager::class.java) ?: return
        val pi = PendingIntent.getBroadcast(
            context, REQUEST_CODE, Intent(context, WidgetTickReceiver::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        // 위젯이 홈에 하나도 없으면 정확 알람 릴레이를 돌릴 이유가 없다 —
        // 앱만 쓰는(위젯 미설치) 유저까지 페이즈 경계마다 RTC_WAKEUP 기상을 강제하지 않는다.
        // 단, 히어로 위젯(TodayTasksWidget)도 pushPomodoroState로 "집중 타임"을 표시하는
        // 페이즈 틱 소비자가 됐다(Task 7) — 뽀모도로 전용 위젯이 없어도 히어로만 있으면
        // 릴레이를 유지해야 FOCUS→휴식/종료 전환이 최대 30분 지연되지 않는다.
        val awm = AppWidgetManager.getInstance(context)
        val widgetIds = awm.getAppWidgetIds(ComponentName(context, PomodoroWidgetReceiver::class.java))
        val heroIds = awm.getAppWidgetIds(ComponentName(context, TodayTasksWidgetReceiver::class.java))
        if (widgetIds.isEmpty() && heroIds.isEmpty()) { am.cancel(pi); return }  // 둘 다 없으면 기상 예약 안 함(기존 예약도 걷기)

        am.cancel(pi)

        val snap = PomodoroSnapshot.from(WidgetStore.read(context, WidgetStore.KEY_POMODORO)) ?: return
        if (snap.pausedAt != null || snap.done) return
        val now = System.currentTimeMillis()
        val next = snap.phases.map { it.endsAt }.filter { it > now }.minOrNull() ?: return
        if (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi)
        } else {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi)  // 정확알람 미허용 폴백
        }
    }
}
