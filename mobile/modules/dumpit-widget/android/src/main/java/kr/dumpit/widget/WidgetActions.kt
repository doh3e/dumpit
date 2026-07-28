package kr.dumpit.widget

import android.content.Context
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

// 뼈대만 — Task 7에서 HeadlessJS 연결(명령 전달 → RN 뽀모도로 스토어 조작)로 실구현한다.
class PomodoroCommandAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        // Task 7에서 HeadlessJS 연결
    }
    companion object { val CommandParam = ActionParameters.Key<String>("command") }
}
