package kr.dumpit.widget

import android.content.Context
import android.content.Intent
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

class ToggleTaskAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val taskId = parameters[TaskIdParam] ?: return
        // 낙관 반영: 스냅샷에서 해당 항목만 done으로 바꿔 즉시 렌더
        val current = WidgetStore.read(context, WidgetStore.KEY_TODAY)
        optimisticJson(current, taskId)?.let { WidgetStore.pushTodayState(context, it) }
        withContext(Dispatchers.IO) {
            WidgetApi.completeTask(context, taskId)   // 실패해도 아래 재조회가 실상태 복원
            WidgetApi.refreshToday(context)
        }
        WidgetStore.pushTodayState(context, WidgetStore.read(context, WidgetStore.KEY_TODAY))
    }

    companion object {
        val TaskIdParam = ActionParameters.Key<String>("taskId")

        /** hero면 hero 제거+진행 +1, 큐면 done=true. 파싱 실패 시 null(낙관 생략) */
        fun optimisticJson(json: String?, taskId: String): String? = runCatching {
            val o = JSONObject(json ?: return null)
            val hero = o.optJSONObject("hero")
            if (hero != null && hero.getString("taskId") == taskId) {
                o.put("hero", JSONObject.NULL)
                o.put("todayDone", o.optInt("todayDone") + 1)
                // todayTotal=0(완료한 항목의 마감이 오늘이 아닌 경우)이면 0>=0으로 오발화하므로
                // 서버 정의(WidgetApi: total > 0 && done == total)와 동일하게 total>0 가드 필요
                if (o.optInt("todayTotal") > 0 && o.optInt("todayDone") >= o.optInt("todayTotal")) o.put("allDone", true)
            } else {
                val queue = o.optJSONArray("queue") ?: return null
                for (i in 0 until queue.length()) {
                    val q = queue.getJSONObject(i)
                    if (q.getString("taskId") == taskId) q.put("done", true)
                }
            }
            o.toString()
        }.getOrNull()
    }
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
