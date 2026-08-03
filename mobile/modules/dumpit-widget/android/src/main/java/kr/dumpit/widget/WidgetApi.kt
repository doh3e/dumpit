package kr.dumpit.widget

import android.content.Context
import android.webkit.CookieManager
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.time.Duration

object WidgetApi {
    // 기본 타임아웃(connect/read 각 10s)은 completeTask→refreshToday 직렬 호출에서
    // Glance ActionCallback 실행 창을 넘길 수 있다 — 콜 전체를 7초로 상한.
    private val client = OkHttpClient.Builder()
        .callTimeout(Duration.ofSeconds(7))
        .build()
    private val JSON_TYPE = "application/json; charset=utf-8".toMediaType()

    private fun baseUrl(context: Context): String? = runCatching {
        JSONObject(WidgetStore.read(context, WidgetStore.KEY_CONFIG) ?: return null)
            .getString("apiBaseUrl").trimEnd('/')
    }.getOrNull()

    /**
     * RN 네트워킹의 쿠키 저장소(webkit CookieManager)에서 세션 쿠키를 읽는다.
     * WebView 프로바이더 비활성/미설치(MissingWebViewPackageException)나 콜드 프로세스에서
     * 첫 WebView 엔진 초기화가 걸리는 경우 CookieManager.getInstance()/getCookie() 자체가
     * 예외를 던질 수 있다 — runCatching으로 감싸 null로 수렴시켜야 호출부의
     * `?: run { markLoggedOut; return false }` 안전망이 실제로 동작한다.
     */
    private fun cookieFor(url: String): String? = runCatching {
        CookieManager.getInstance().getCookie(url)
    }.getOrNull()?.takeIf { it.isNotBlank() }

    fun completeTask(context: Context, taskId: String): Boolean {
        val base = baseUrl(context) ?: return false
        val cookie = cookieFor(base) ?: run { markLoggedOut(context); return false }
        val request = Request.Builder()
            .url("$base/tasks/$taskId")
            .patch("""{"status":"DONE"}""".toRequestBody(JSON_TYPE))
            .header("Cookie", cookie)
            .header("X-Requested-With", "XMLHttpRequest")
            .build()
        return runCatching {
            client.newCall(request).execute().use { res ->
                if (res.code == 401 || res.code == 403) { markLoggedOut(context); return false }
                res.isSuccessful
            }
        }.getOrDefault(false)
    }

    /** GET /dashboard/planning → HeroSnapshot 스키마로 KEY_TODAY 갱신. 401이면 loggedIn=false 기록. */
    fun refreshToday(context: Context): Boolean {
        val base = baseUrl(context) ?: return false
        val cookie = cookieFor(base) ?: run { markLoggedOut(context); return false }
        val request = Request.Builder()
            .url("$base/dashboard/planning")
            .header("Cookie", cookie)
            .header("X-Requested-With", "XMLHttpRequest")
            .build()
        return runCatching {
            client.newCall(request).execute().use { res ->
                if (res.code == 401 || res.code == 403) { markLoggedOut(context); return false }
                if (!res.isSuccessful) return false
                val o = JSONObject(res.body?.string() ?: return false)
                WidgetStore.save(context, WidgetStore.KEY_TODAY, heroJsonFrom(o).toString())
                true
            }
        }.getOrDefault(false)
    }

    /** planning 응답 → 히어로 스냅샷. 규칙은 JS buildHeroMirror(mirror.ts)와 동일해야 한다. */
    private fun heroJsonFrom(o: JSONObject): JSONObject {
        val today = java.time.LocalDate.now()
        val tasks = o.optJSONArray("tasks") ?: JSONArray()
        fun isTodayDeadline(t: JSONObject): Boolean {
            val d = if (t.isNull("deadline")) null else t.getString("deadline")
            return d != null && d.length >= 10 && java.time.LocalDate.parse(d.substring(0, 10)) == today
        }
        var total = 0; var done = 0
        for (i in 0 until tasks.length()) {
            val t = tasks.getJSONObject(i)
            if (!isTodayDeadline(t) || t.optString("status") == "CANCELLED") continue
            total++
            if (t.optString("status") == "DONE") done++
        }
        val allDone = total > 0 && done == total
        val sug = o.optJSONObject("nowSuggestion")
        val heroTask = if (allDone) null else sug?.optJSONObject("task")
        val recs = o.optJSONArray("focusRecommendations") ?: JSONArray()
        val queue = JSONArray()
        for (i in 0 until minOf(3, recs.length())) {
            val r = recs.getJSONObject(i)
            val t = r.getJSONObject("task")
            queue.put(JSONObject().apply {
                put("taskId", t.getString("taskId")); put("title", t.getString("title"))
                put("bucket", r.optString("bucket", "TODAY")); put("done", false)
            })
        }
        return JSONObject().apply {
            put("updatedAt", System.currentTimeMillis())
            put("loggedIn", true); put("allDone", allDone)
            put("todayDone", done); put("todayTotal", total)
            put("hero", heroTask?.let { t ->
                JSONObject().apply {
                    put("taskId", t.getString("taskId")); put("title", t.getString("title"))
                    val d = if (t.isNull("deadline")) null else t.getString("deadline")
                    put("deadlineLabel", when {
                        d == null || d.length < 16 -> JSONObject.NULL
                        java.time.LocalDate.parse(d.substring(0, 10)) == today -> "${d.substring(11, 16)} 마감"
                        else -> "${d.substring(5, 7).trimStart('0')}/${d.substring(8, 10).trimStart('0')} 마감"
                    })
                }
            } ?: JSONObject.NULL)
            put("suggestion", JSONObject().apply {
                put("title", sug?.optString("title") ?: "지금은 비어 있는 시간이에요.")
                put("message", sug?.optString("message") ?: "가벼운 일부터 하나 시작해볼까요?")
            })
            put("queue", queue)
        }
    }

    private fun markLoggedOut(context: Context) {
        WidgetStore.save(context, WidgetStore.KEY_TODAY,
            """{"updatedAt":${System.currentTimeMillis()},"loggedIn":false,"allDone":false,"todayDone":0,"todayTotal":0,"hero":null,"suggestion":null,"queue":[]}""")
    }
}
