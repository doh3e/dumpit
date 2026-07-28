package kr.dumpit.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback

/**
 * 컴파일용 no-op 뼈대 — 실구현은 Task 5(태스크 토글·목록 새로고침).
 * ActionCallback 구현체는 public 무인자 생성자가 있어야 하므로 companion만 갖는 최소 형태로 둔다.
 */
class ToggleTaskAction : ActionCallback {
    companion object {
        val TaskIdParam = ActionParameters.Key<String>("taskId")
    }

    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        // no-op — Task 5에서 구현
    }
}

/** 컴파일용 no-op 뼈대 — 실구현은 Task 5. */
class RefreshTodayAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        // no-op — Task 5에서 구현
    }
}
