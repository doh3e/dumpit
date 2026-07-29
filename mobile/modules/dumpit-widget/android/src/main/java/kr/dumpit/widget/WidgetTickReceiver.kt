package kr.dumpit.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class WidgetTickReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        CoroutineScope(Dispatchers.Default).launch {
            try {
                // 페이즈 경계 틱은 phases 내용이 바뀌지 않은 채(taskTitle·phases 등 동일) 재렌더가
                // 필요한 경우다 — updateAll()만으로는 재구성이 보장되지 않는다(Glance 확정 버그:
                // 활성 세션에서 외부 데이터만 바뀐 update()/updateAll()은 재구성을 일으키지 않는다).
                // SharedPreferences의 현재 스냅샷을 Glance 상태로 다시 push해(넛지 키 포함) 무효화를
                // 강제한다.
                WidgetStore.pushPomodoroState(context, WidgetStore.read(context, WidgetStore.KEY_POMODORO))
            } finally {
                PomodoroAlarms.reschedule(context)
                pending.finish()
            }
        }
    }
}
