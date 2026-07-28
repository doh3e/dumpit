package kr.dumpit.widget

import androidx.glance.appwidget.updateAll
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DumpitWidgetModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("DumpitWidget")

        AsyncFunction("mirrorConfig") { json: String ->
            appContext.reactContext?.let { WidgetStore.save(it, WidgetStore.KEY_CONFIG, json) }
        }

        // Coroutine: expo-modules-kotlin의 suspend 지원(AsyncFunctionBuilder 인프릭스) — WidgetStore 저장 후
        // GlanceAppWidget.updateAll(suspend fun)을 곧바로 이어 부르기 위해 일반 AsyncFunction 대신 사용.
        AsyncFunction("mirrorTodayTasks") Coroutine { json: String ->
            val ctx = appContext.reactContext ?: return@Coroutine
            WidgetStore.save(ctx, WidgetStore.KEY_TODAY, json)
            TodayTasksWidget().updateAll(ctx)
        }

        AsyncFunction("mirrorPomodoro") Coroutine { json: String? ->
            val ctx = appContext.reactContext ?: return@Coroutine
            WidgetStore.save(ctx, WidgetStore.KEY_POMODORO, json)
            PomodoroWidget().updateAll(ctx)
            PomodoroAlarms.reschedule(ctx)
        }
    }
}
