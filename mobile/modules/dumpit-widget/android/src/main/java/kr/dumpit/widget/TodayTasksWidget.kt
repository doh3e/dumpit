package kr.dumpit.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.Preferences
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.background
import androidx.glance.currentState
import androidx.glance.layout.*
import androidx.glance.state.GlanceStateDefinition
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object WidgetPalette {
    val bg = Color(0xFFF7EFDF)
    val card = Color(0xFFFFFDF6)
    val fg = Color(0xFF33271E)
    val sub = Color(0xFF8C7C66)
    val accent = Color(0xFFD95F52)
}

const val DEEPLINK_HOME = "dumpit:///"
const val DEEPLINK_POMODORO = "dumpit:///pomodoro"

fun deepLinkIntent(url: String): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

class TodayTasksWidget : GlanceAppWidget() {
    // Glance가 보장하는 무효화 경로는 "위젯 상태(stateDefinition) 변경 → update()" 조합뿐이다 —
    // 활성 세션에서 update()/updateAll()만으로는(외부 데이터만 바뀐 경우) 재구성이 안 되는
    // 확정 버그가 있어, SharedPreferences 스냅샷을 이 상태로 이관한다(WidgetStore.pushTodayState
    // 등이 기록).
    override val stateDefinition: GlanceStateDefinition<Preferences> = PreferencesGlanceStateDefinition

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // 세션 시작 시 1회: 주기 onUpdate(30분)·재부팅 등으로 렌더될 때 미러가 오래됐으면
        // 서버에서 직접 갱신. 앱발 미러 직후(updatedAt 신선)는 건너뛰어 불필요한 네트워크를 막는다.
        // 신선도 판정은 SharedPreferences(비컴포즈 문맥) 읽기로 한다.
        val initial = TodaySnapshot.from(WidgetStore.read(context, WidgetStore.KEY_TODAY))
        if (initial == null || initial.isStale()) {
            withContext(Dispatchers.IO) { WidgetApi.refreshToday(context) }
        }
        // 세션 시작 시 SharedPreferences의 최신 스냅샷을 Glance 상태로 동기화해둔다 — 앱 업데이트
        // 직후처럼 이 GlanceId에 한 번도 상태가 쓰인 적 없을 수 있고(신선도 게이트를 안 탄 경우도
        // 포함), 매 provideGlance마다 맞춰야 한다. 자기 자신 update() 호출은 불필요하다 — 세션
        // 시작 직전이라 상태만 써두면 곧이어 실행되는 provideContent가 currentState()로 즉시 읽는다.
        val latest = WidgetStore.read(context, WidgetStore.KEY_TODAY)
        updateAppWidgetState(context, id) { prefs ->
            if (latest == null) prefs.remove(WidgetStore.TODAY_STATE_KEY) else prefs[WidgetStore.TODAY_STATE_KEY] = latest
        }
        provideContent {
            // 재구성마다 Glance 상태를 읽는다 — SharedPreferences 직접 읽기(구 방식)는 활성 세션
            // 생존 중 스테일해질 수 있다(실기기 확정 버그). remember로 감싸지 말 것 — 감싸면 다시
            // 스테일해진다.
            val snapshot = TodaySnapshot.from(currentState<Preferences>()[WidgetStore.TODAY_STATE_KEY])
            TodayContent(snapshot)
        }
    }
}

@Composable
private fun TodayContent(snapshot: TodaySnapshot?) {
    Column(
        modifier = GlanceModifier.fillMaxSize().background(WidgetPalette.bg).cornerRadius(12.dp).padding(10.dp),
    ) {
        Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("☀️ 오늘 할 일", style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 14.sp,
                color = ColorProvider(WidgetPalette.fg)),
                modifier = GlanceModifier.defaultWeight().clickable(actionStartActivity(deepLinkIntent(DEEPLINK_HOME))))
            Text("↻", style = TextStyle(fontSize = 14.sp, color = ColorProvider(WidgetPalette.sub)),
                modifier = GlanceModifier.padding(horizontal = 6.dp)
                    .clickable(actionRunCallback<RefreshTodayAction>()))
        }
        Spacer(modifier = GlanceModifier.height(6.dp))
        when {
            snapshot == null || !snapshot.loggedIn -> Message("로그인이 필요해요 — 탭해서 열기")
            snapshot.tasks.isEmpty() -> Message("오늘 할 일이 없어요 🎉")
            else -> LazyColumn {
                items(snapshot.tasks, itemId = { it.taskId.hashCode().toLong() }) { task -> TaskRow(task) }
            }
        }
    }
}

@Composable
private fun Message(text: String) {
    Box(modifier = GlanceModifier.fillMaxSize().clickable(actionStartActivity(deepLinkIntent(DEEPLINK_HOME))),
        contentAlignment = Alignment.Center) {
        Text(text, style = TextStyle(fontSize = 13.sp, color = ColorProvider(WidgetPalette.sub)))
    }
}

// 주의(브리프 대비 편차): Glance의 LazyColumn 아이템 content는 단일 루트 컴포저블만 emit할 수 있다
// (RemoteViews 한 슬롯 = 한 아이템). 브리프 원안은 Row 다음에 형제로 Spacer를 뒀는데 그러면
// "본문 실패: content emitted multiple layouts" 계열 컴파일/런타임 오류가 난다. Column으로 감싸
// 단일 루트로 만들고 그 안에서 Row + Spacer 순서를 유지했다.
@Composable
private fun TaskRow(task: TodayTask) {
    Column {
        Row(
            modifier = GlanceModifier.fillMaxWidth().background(WidgetPalette.card).cornerRadius(8.dp)
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("☐", style = TextStyle(fontSize = 16.sp, color = ColorProvider(WidgetPalette.accent)),
                modifier = GlanceModifier.padding(end = 8.dp)
                    .clickable(actionRunCallback<ToggleTaskAction>(
                        androidx.glance.action.actionParametersOf(ToggleTaskAction.TaskIdParam to task.taskId))))
            Text(task.title, maxLines = 1, style = TextStyle(fontSize = 13.sp, color = ColorProvider(WidgetPalette.fg)),
                modifier = GlanceModifier.defaultWeight().clickable(actionStartActivity(deepLinkIntent(DEEPLINK_HOME))))
            if (task.deadline != null) {
                Text(task.deadline, style = TextStyle(fontSize = 11.sp, color = ColorProvider(WidgetPalette.sub)))
            }
        }
        Spacer(modifier = GlanceModifier.height(4.dp))
    }
}
