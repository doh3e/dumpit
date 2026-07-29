package kr.dumpit.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import androidx.glance.background
import androidx.glance.layout.*
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
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        var snapshot = TodaySnapshot.from(WidgetStore.read(context, WidgetStore.KEY_TODAY))
        // 주기 onUpdate(30분)·재부팅 등으로 렌더될 때 미러가 오래됐으면 서버에서 직접 갱신.
        // 앱발 미러 직후(updatedAt 신선)는 건너뛰어 불필요한 네트워크를 막는다.
        if (snapshot == null || snapshot.isStale()) {
            withContext(Dispatchers.IO) { WidgetApi.refreshToday(context) }
            snapshot = TodaySnapshot.from(WidgetStore.read(context, WidgetStore.KEY_TODAY))
        }
        provideContent { TodayContent(snapshot) }
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
