package kr.dumpit.widget

import android.content.Context
import android.content.Intent
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class ToggleTaskAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val taskId = parameters[TaskIdParam] ?: return
        withContext(Dispatchers.IO) {
            WidgetApi.completeTask(context, taskId)   // 실패 시에도 재조회로 실상태 복원
            WidgetApi.refreshToday(context)
        }
        // updateAll() 단독으로는 활성 세션을 재구성하지 않는다(실기기 확정 버그) — 최신
        // SharedPreferences 스냅샷을 Glance 상태로 다시 push해 무효화를 강제한다.
        WidgetStore.pushTodayState(context, WidgetStore.read(context, WidgetStore.KEY_TODAY))
    }
    companion object { val TaskIdParam = ActionParameters.Key<String>("taskId") }
}

class RefreshTodayAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        withContext(Dispatchers.IO) { WidgetApi.refreshToday(context) }
        WidgetStore.pushTodayState(context, WidgetStore.read(context, WidgetStore.KEY_TODAY))
    }
}

class PomodoroCommandAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val command = parameters[CommandParam] ?: return
        val intent = Intent(context, PomodoroCommandService::class.java).putExtra("command", command)
        // 위젯 상호작용은 일시적 백그라운드 예외가 허용되는 창구다 — 그래도 Android 8+ 백그라운드
        // 제한 창을 벗어나면 startService가 IllegalStateException을 던질 수 있어 다른 WidgetApi
        // 호출부와 동일하게 runCatching으로 감싼다(무가드면 예외가 코루틴 밖으로 침묵 전파해
        // 진단 로그 0줄로 버튼이 죽는다).
        runCatching { context.startService(intent) }
            .onFailure { android.util.Log.w("DumpitWidget", "뽀모도로 커맨드 서비스 시작 실패", it) }
    }
    companion object { val CommandParam = ActionParameters.Key<String>("command") }
}
