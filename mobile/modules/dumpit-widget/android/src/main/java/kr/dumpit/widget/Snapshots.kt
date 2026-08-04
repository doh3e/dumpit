package kr.dumpit.widget

import org.json.JSONArray
import org.json.JSONObject

data class HeroTask(val taskId: String, val title: String, val deadlineLabel: String?)
data class QueueItem(val taskId: String, val title: String, val bucket: String, val done: Boolean)
data class HeroSnapshot(
    val updatedAt: Long, val loggedIn: Boolean, val allDone: Boolean,
    val todayDone: Int, val todayTotal: Int,
    val hero: HeroTask?, val suggestionTitle: String?, val suggestionMessage: String?,
    val queue: List<QueueItem>,
) {
    /** 30분 주기 onUpdate·재부팅 등으로 렌더될 때 미러가 오래됐으면 신선도 게이트가 서버에서 직접 갱신하도록 판정한다. */
    fun isStale(now: Long = System.currentTimeMillis()): Boolean = now - updatedAt > 25 * 60_000L

    companion object {
        fun from(json: String?): HeroSnapshot? = runCatching {
            val o = JSONObject(json ?: return null)
            val heroObj = o.optJSONObject("hero")
            val sug = o.optJSONObject("suggestion")
            val arr = o.optJSONArray("queue") ?: JSONArray()
            HeroSnapshot(
                updatedAt = o.optLong("updatedAt", 0L),
                loggedIn = o.optBoolean("loggedIn", true),
                allDone = o.optBoolean("allDone", false),
                todayDone = o.optInt("todayDone", 0),
                todayTotal = o.optInt("todayTotal", 0),
                hero = heroObj?.let {
                    HeroTask(it.getString("taskId"), it.getString("title"),
                        if (it.isNull("deadlineLabel")) null else it.getString("deadlineLabel"))
                },
                suggestionTitle = sug?.optString("title"),
                suggestionMessage = sug?.optString("message"),
                queue = (0 until arr.length()).map { i ->
                    val q = arr.getJSONObject(i)
                    QueueItem(q.getString("taskId"), q.getString("title"),
                        q.optString("bucket", "TODAY"), q.optBoolean("done", false))
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
    // phaseDone/focusDone(+total) — engine.ts phaseProgress() 전사. phases는 phasesFrom()이 돌려주는
    // "남은" 타임라인뿐이라(이미 끝난 페이즈는 미러 작성 시점에 걸러짐, 재미러마다 재생성) 그것만으로
    // "완료 수"를 셈하면 일시정지·재개·reconcile 직후 항상 0으로 보인다(세션 링·세트 도트 버그의
    // 원인). 이 필드들이 "이미 끝난 만큼"을 별도로 실어보낸다. total류는 무한 세션(setsTarget=0)이면
    // null — 위젯 쪽에서 굴러가는(rolling) 근사치로 대체한다.
    // 구 미러(이 필드가 없는 옛 앱 버전 JSON)는 isNull/optInt가 그대로 null/0으로 떨어져, 위젯이
    // phases만으로 근사하던 예전 동작으로 자연히 폴백한다.
    val phaseDone: Int,
    val phaseTotal: Int?,
    val focusDone: Int,
    val focusTotal: Int?,
) {
    fun currentPhase(now: Long): PomodoroPhase? = phases.firstOrNull { now >= it.startsAt && now < it.endsAt }

    /**
     * 위젯 단독(앱 미기동) 완료 판정 — done 플래그는 JS 미러가 상태 전이 때만 실어주므로 마지막
     * 페이즈가 "시간 경과"로 끝난 경우엔 여기서 파생해야 한다. 유한 세션(focusTotal 있음)에서 남은
     * 타임라인이 전부 지났으면 완료로 취급한다 — 안 하면 최종 완료 후 틱 재렌더가 idle(집중 시작)로
     * 떨어지고, 틱 전까지 크로노미터가 음수로 흘러가 보인다(실기기 지적).
     * 무한 세션(focusTotal=null)은 phases가 HORIZON 롤링 윈도우일 뿐이라 만료=완료가 아니다 — 제외.
     * 일시정지 중엔 시간이 얼어 있으므로 경과 판정을 하지 않는다.
     */
    fun effectivelyDone(now: Long): Boolean =
        done || (pausedAt == null && focusTotal != null && phases.isNotEmpty() && phases.all { it.endsAt <= now })

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
                phaseDone = o.optInt("phaseDone", 0),
                phaseTotal = if (o.isNull("phaseTotal")) null else o.optInt("phaseTotal"),
                focusDone = o.optInt("focusDone", 0),
                focusTotal = if (o.isNull("focusTotal")) null else o.optInt("focusTotal"),
            )
        }.getOrNull()
    }
}
