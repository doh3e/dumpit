package kr.dumpit.widget

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

// 주의: GlanceAppWidgetReceiver는 자신의 onReceive에서 이미 goAsync()를 사용한다.
// 여기서 onUpdate를 오버라이드해 goAsync()를 또 부르면 null이 반환되어
// pending.finish()가 NPE를 던지고 앱 프로세스가 죽는다(실기기 확인, 30분 주기·위젯 추가 시마다).
// 주기 갱신은 TodayTasksWidget.provideGlance의 신선도 게이트(TodaySnapshot.isStale)로 옮겼다.
class TodayTasksWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TodayTasksWidget()
}
