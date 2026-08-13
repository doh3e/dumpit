package kr.dumpit.widget

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class PomodoroCommandService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        val command = intent?.getStringExtra("command") ?: return null
        return HeadlessJsTaskConfig(
            "DumpitPomodoroCommand",
            Arguments.createMap().apply { putString("command", command) },
            30_000,
            true, // 포그라운드에서도 허용 — 앱이 떠 있어도 위젯 버튼이 동작해야 한다
        )
    }
}
