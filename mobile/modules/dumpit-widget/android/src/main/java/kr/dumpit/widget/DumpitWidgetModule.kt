package kr.dumpit.widget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DumpitWidgetModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("DumpitWidget")

        AsyncFunction("mirrorConfig") { json: String ->
            appContext.reactContext?.let { WidgetStore.save(it, WidgetStore.KEY_CONFIG, json) }
        }

        AsyncFunction("mirrorTodayTasks") { json: String ->
            appContext.reactContext?.let { WidgetStore.save(it, WidgetStore.KEY_TODAY, json) }
        }

        AsyncFunction("mirrorPomodoro") { json: String? ->
            appContext.reactContext?.let { WidgetStore.save(it, WidgetStore.KEY_POMODORO, json) }
        }
    }
}
