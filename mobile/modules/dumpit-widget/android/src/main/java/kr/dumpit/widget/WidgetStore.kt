package kr.dumpit.widget

import android.content.Context

object WidgetStore {
    private const val PREFS = "dumpit_widget"
    const val KEY_CONFIG = "config"
    const val KEY_TODAY = "today"
    const val KEY_POMODORO = "pomodoro"

    fun save(context: Context, key: String, json: String?) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(key, json).apply()
    }

    fun read(context: Context, key: String): String? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(key, null)
}
