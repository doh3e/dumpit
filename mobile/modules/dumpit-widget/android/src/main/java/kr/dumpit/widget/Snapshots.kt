package kr.dumpit.widget

import org.json.JSONObject

data class TodayTask(val taskId: String, val title: String, val deadline: String?, val status: String)
data class TodaySnapshot(val updatedAt: Long, val loggedIn: Boolean, val tasks: List<TodayTask>) {
    /** 30분 주기 onUpdate·재부팅 등으로 렌더될 때 미러가 오래됐으면 신선도 게이트가 서버에서 직접 갱신하도록 판정한다. */
    fun isStale(now: Long = System.currentTimeMillis()): Boolean = now - updatedAt > 25 * 60_000L

    companion object {
        fun from(json: String?): TodaySnapshot? = runCatching {
            val o = JSONObject(json ?: return null)
            val arr = o.getJSONArray("tasks")
            TodaySnapshot(
                updatedAt = o.optLong("updatedAt", 0L),
                loggedIn = o.optBoolean("loggedIn", true),
                tasks = (0 until arr.length()).map { i ->
                    val t = arr.getJSONObject(i)
                    TodayTask(
                        taskId = t.getString("taskId"),
                        title = t.getString("title"),
                        deadline = if (t.isNull("deadline")) null else t.getString("deadline"),
                        status = t.optString("status", "TODO"),
                    )
                },
            )
        }.getOrNull()
    }
}

data class PomodoroPhase(val kind: String, val index: Int, val long: Boolean, val startsAt: Long, val endsAt: Long)
data class PomodoroSnapshot(
    val taskTitle: String?,
    val pausedAt: Long?,
    val remainingSecAtPause: Long?,
    val done: Boolean,
    val phases: List<PomodoroPhase>,
) {
    fun currentPhase(now: Long): PomodoroPhase? = phases.firstOrNull { now >= it.startsAt && now < it.endsAt }

    companion object {
        fun from(json: String?): PomodoroSnapshot? = runCatching {
            val o = JSONObject(json ?: return null)
            val arr = o.getJSONArray("phases")
            PomodoroSnapshot(
                taskTitle = if (o.isNull("taskTitle")) null else o.getString("taskTitle"),
                pausedAt = if (o.isNull("pausedAt")) null else o.getLong("pausedAt"),
                remainingSecAtPause = if (o.isNull("remainingSecAtPause")) null else o.getLong("remainingSecAtPause"),
                done = o.optBoolean("done", false),
                phases = (0 until arr.length()).map { i ->
                    val p = arr.getJSONObject(i)
                    PomodoroPhase(p.getString("kind"), p.getInt("index"), p.getBoolean("long"),
                        p.getLong("startsAt"), p.getLong("endsAt"))
                },
            )
        }.getOrNull()
    }
}
