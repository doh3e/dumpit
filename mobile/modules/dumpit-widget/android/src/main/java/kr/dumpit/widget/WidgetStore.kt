package kr.dumpit.widget

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.state.updateAppWidgetState

object WidgetStore {
    private const val PREFS = "dumpit_widget"
    const val KEY_CONFIG = "config"
    const val KEY_TODAY = "today"
    const val KEY_POMODORO = "pomodoro"
    const val KEY_THEME = "theme"

    // Glance 상태(stateDefinition=PreferencesGlanceStateDefinition) 키 — composable은 이 키로
    // currentState()를 읽는다. SharedPreferences(KEY_TODAY/KEY_POMODORO)는 부트·비컴포즈 문맥
    // (신선도 게이트, 알람 재예약)에서 계속 쓰이므로 폐기하지 않고 이원화(dual-write)한다.
    val TODAY_STATE_KEY: Preferences.Key<String> = stringPreferencesKey("today")
    val POMODORO_STATE_KEY: Preferences.Key<String> = stringPreferencesKey("pomodoro")
    val THEME_STATE_KEY: Preferences.Key<String> = stringPreferencesKey("theme")

    // 뽀모도로 페이즈 경계 틱(WidgetTickReceiver)은 phases 내용이 바뀌지 않은 채(taskTitle·phases
    // 등 동일) 재렌더가 필요하다 — Preferences DataStore가 바이트 동일 재기록을 델타로 안 취급할
    // 가능성에 대비해, push마다 값이 달라지는 넛지 키를 함께 써서 재구성을 확실히 유발한다.
    private val POMODORO_TICK_KEY = stringPreferencesKey("pomodoroTick")

    fun save(context: Context, key: String, json: String?) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(key, json).apply()
    }

    fun read(context: Context, key: String): String? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(key, null)

    /**
     * TodayTasksWidget의 모든 활성 인스턴스에 today 스냅샷을 Glance 상태로 반영하고 재구성을
     * 유발한다. 활성 Glance 세션에서 GlanceAppWidget.update()/updateAll()은(외부 데이터만 바뀐
     * 경우) 재구성을 일으키지 않는다(실기기 3회 재현 확정 버그) — Glance가 보장하는 무효화 경로는
     * "위젯 상태 변경 → update()" 조합뿐이라, updateAppWidgetState로 먼저 쓰고 나서 update()를
     * 부른다.
     */
    suspend fun pushTodayState(context: Context, json: String?) {
        val manager = GlanceAppWidgetManager(context)
        manager.getGlanceIds(TodayTasksWidget::class.java).forEach { id ->
            updateAppWidgetState(context, id) { prefs ->
                if (json == null) prefs.remove(TODAY_STATE_KEY) else prefs[TODAY_STATE_KEY] = json
            }
            TodayTasksWidget().update(context, id)
        }
    }

    /** PomodoroWidget 버전 — 동일 패턴. 넛지 키를 함께 써서 내용 무변경 재push도 재구성을 보장한다. */
    suspend fun pushPomodoroState(context: Context, json: String?) {
        val manager = GlanceAppWidgetManager(context)
        manager.getGlanceIds(PomodoroWidget::class.java).forEach { id ->
            updateAppWidgetState(context, id) { prefs ->
                if (json == null) prefs.remove(POMODORO_STATE_KEY) else prefs[POMODORO_STATE_KEY] = json
                prefs[POMODORO_TICK_KEY] = System.currentTimeMillis().toString()
            }
            PomodoroWidget().update(context, id)
        }
    }

    /** 테마는 두 위젯 모두에 반영한다 */
    suspend fun pushThemeState(context: Context, json: String?) {
        val manager = GlanceAppWidgetManager(context)
        manager.getGlanceIds(TodayTasksWidget::class.java).forEach { id ->
            updateAppWidgetState(context, id) { prefs ->
                if (json == null) prefs.remove(THEME_STATE_KEY) else prefs[THEME_STATE_KEY] = json
            }
            TodayTasksWidget().update(context, id)
        }
        manager.getGlanceIds(PomodoroWidget::class.java).forEach { id ->
            updateAppWidgetState(context, id) { prefs ->
                if (json == null) prefs.remove(THEME_STATE_KEY) else prefs[THEME_STATE_KEY] = json
            }
            PomodoroWidget().update(context, id)
        }
    }
}
