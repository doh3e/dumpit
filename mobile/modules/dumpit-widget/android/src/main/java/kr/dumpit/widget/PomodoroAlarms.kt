package kr.dumpit.widget

import android.app.AlarmManager
import android.app.PendingIntent
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
