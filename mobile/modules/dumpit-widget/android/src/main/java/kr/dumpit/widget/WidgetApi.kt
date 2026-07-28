package kr.dumpit.widget

import android.content.Context
import android.webkit.CookieManager
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

object WidgetApi {
    private val client = OkHttpClient()
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

    /** GET /tasks/today → KEY_TODAY 갱신. 401이면 loggedIn=false 기록. */
    fun refreshToday(context: Context): Boolean {
        val base = baseUrl(context) ?: return false
        val cookie = cookieFor(base) ?: run { markLoggedOut(context); return false }
        val request = Request.Builder()
            .url("$base/tasks/today")
            .header("Cookie", cookie)
            .header("X-Requested-With", "XMLHttpRequest")
            .build()
        return runCatching {
            client.newCall(request).execute().use { res ->
                if (res.code == 401 || res.code == 403) { markLoggedOut(context); return false }
                if (!res.isSuccessful) return false
                val body = JSONArray(res.body?.string() ?: return false)
                val tasks = JSONArray()
                for (i in 0 until body.length()) {
                    val t = body.getJSONObject(i)
                    tasks.put(JSONObject().apply {
                        put("taskId", t.getString("taskId"))
                        put("title", t.getString("title"))
                        val deadline = if (t.isNull("deadline")) null else t.getString("deadline")
                        put("deadline", if (deadline != null && deadline.length >= 16) deadline.substring(11, 16) else JSONObject.NULL)
                        put("status", t.optString("status", "TODO"))
                    })
                }
                val snapshot = JSONObject().apply {
                    put("updatedAt", System.currentTimeMillis())
                    put("loggedIn", true)
                    put("tasks", tasks)
                }
                WidgetStore.save(context, WidgetStore.KEY_TODAY, snapshot.toString())
                true
            }
        }.getOrDefault(false)
    }

    private fun markLoggedOut(context: Context) {
        WidgetStore.save(context, WidgetStore.KEY_TODAY,
            """{"updatedAt":${System.currentTimeMillis()},"loggedIn":false,"tasks":[]}""")
    }
}
