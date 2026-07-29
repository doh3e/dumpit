package kr.dumpit.widget

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
        // WidgetStore.push*State(suspend fun)를 곧바로 이어 부르기 위해 일반 AsyncFunction 대신 사용.
        AsyncFunction("mirrorTodayTasks") Coroutine { json: String ->
            val ctx = appContext.reactContext ?: return@Coroutine
            // SharedPreferences 저장은 유지(부트·비컴포즈 문맥용, dual-write) — Glance 상태 반영·재구성
            // 유발은 push 헬퍼가 담당한다(update()/updateAll() 단독 호출은 활성 세션을 재구성하지
            // 않는 확정 버그가 있어 제거).
            WidgetStore.save(ctx, WidgetStore.KEY_TODAY, json)
            WidgetStore.pushTodayState(ctx, json)
        }

        AsyncFunction("mirrorPomodoro") Coroutine { json: String? ->
            val ctx = appContext.reactContext ?: return@Coroutine
            WidgetStore.save(ctx, WidgetStore.KEY_POMODORO, json)
            WidgetStore.pushPomodoroState(ctx, json)
            PomodoroAlarms.reschedule(ctx)  // 알람은 SharedPreferences를 읽으므로 dual-write 필수
        }
    }
}
