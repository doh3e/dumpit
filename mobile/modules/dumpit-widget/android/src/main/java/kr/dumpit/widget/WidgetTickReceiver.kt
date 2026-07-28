package kr.dumpit.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class WidgetTickReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        CoroutineScope(Dispatchers.Default).launch {
            try {
                // 주의(브리프 대비 편차): 확장함수는 Kotlin 호출부에서 완전정규명(FQN) 함수
                // 스타일로 부를 수 없다(`androidx.glance.appwidget.updateAll(receiver, ctx)`는
                // Java 상호운용에서만 유효) — 브리프 Step 3 주의사항이 예고한 대로 리시버.함수()
                // 점 표기로 고쳤다. DumpitWidgetModule.mirrorTodayTasks와 동일한 호출 형태.
                PomodoroWidget().updateAll(context)
            } finally {
                PomodoroAlarms.reschedule(context)
                pending.finish()
            }
        }
    }
}
