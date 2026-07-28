package kr.dumpit.widget

import android.content.Context
import android.content.Intent
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class ToggleTaskAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val taskId = parameters[TaskIdParam] ?: return
        withContext(Dispatchers.IO) {
            WidgetApi.completeTask(context, taskId)   // 실패 시에도 재조회로 실상태 복원
            WidgetApi.refreshToday(context)
        }
        TodayTasksWidget().updateAll(context)
    }
    companion object { val TaskIdParam = ActionParameters.Key<String>("taskId") }
}

class RefreshTodayAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        withContext(Dispatchers.IO) { WidgetApi.refreshToday(context) }
        TodayTasksWidget().updateAll(context)
    }
}

class PomodoroCommandAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val command = parameters[CommandParam] ?: return
        val intent = Intent(context, PomodoroCommandService::class.java).putExtra("command", command)
        // 위젯 상호작용은 일시적 백그라운드 예외가 허용되는 창구다
        context.startService(intent)
    }
    companion object { val CommandParam = ActionParameters.Key<String>("command") }
}
