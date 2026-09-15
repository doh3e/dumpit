package kr.dumpit.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.ColorFilter
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.action.Action
import androidx.glance.action.clickable
import androidx.glance.appwidget.cornerRadius
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.semantics.contentDescription
import androidx.glance.semantics.semantics
import androidx.glance.unit.ColorProvider
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle

internal val WIDGET_FRAME_INSET = 8.dp
internal val WIDGET_SAFE_PADDING = 12.dp
internal val WIDGET_CONTENT_INSET = WIDGET_FRAME_INSET + WIDGET_SAFE_PADDING
internal val WIDGET_TOUCH_SIZE = 48.dp
private val LEGACY_WIDGET_RADIUS = 16.dp

internal fun widgetContentSize(size: Dp, padding: Dp): Dp =
    (size - padding - padding).coerceAtLeast(0.dp)

internal fun widgetSafeContentWidth(widgetWidth: Dp): Dp =
    widgetContentSize(widgetWidth, WIDGET_CONTENT_INSET)

internal fun systemWidgetRadius(context: Context): Dp {
    // Android 12 이전에는 시스템 위젯 반경 리소스가 없으므로 이름으로 조회해 구버전 호스트를 보호한다.
    val radiusId = context.resources.getIdentifier(
        "system_app_widget_background_radius",
        "dimen",
        "android",
    )
    if (radiusId == 0) return LEGACY_WIDGET_RADIUS
    return (context.resources.getDimension(radiusId) / context.resources.displayMetrics.density).dp
}

@Composable
fun drawableId(name: String): Int {
    val context = LocalContext.current
    return context.resources.getIdentifier(name, "drawable", context.packageName)
}

/** Flat widget frame — 스킨은 가장자리에 남기고 정보 표면은 불투명하게 분리한다. */
@Composable
fun RetroFrame(
    theme: WTheme,
    modifier: GlanceModifier = GlanceModifier,
    bgOverride: Color? = null,
    contentPadding: Dp = WIDGET_SAFE_PADDING,
    content: @Composable () -> Unit,
) {
    val bgColor = bgOverride ?: theme.palette.bg
    val outerRadius = systemWidgetRadius(LocalContext.current)
    val layoutModifiers = retroFrameLayoutModifiers(
        modifier = modifier,
        background = bgColor,
        card = theme.palette.card,
        useCardSurface = bgOverride == null,
        showPattern = bgOverride == null && theme.patternRes != null,
        contentPadding = contentPadding,
        outerRadius = outerRadius,
    )
    Box(modifier = layoutModifiers.frame) {
        layoutModifiers.pattern?.let { patternModifier ->
            Image(
                provider = ImageProvider(drawableId(checkNotNull(theme.patternRes))),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = patternModifier,
            )
        }
        Box(modifier = layoutModifiers.contentWrapper, contentAlignment = Alignment.Center) {
            val contentSurface = layoutModifiers.contentSurface
            if (contentSurface == null) content() else Box(modifier = contentSurface, contentAlignment = Alignment.Center) { content() }
        }
    }
}

internal data class RetroFrameLayoutModifiers(
    val frame: GlanceModifier,
    val pattern: GlanceModifier?,
    val contentWrapper: GlanceModifier,
    val contentSurface: GlanceModifier?,
)

internal fun retroFrameLayoutModifiers(
    modifier: GlanceModifier,
    background: Color,
    card: Color,
    useCardSurface: Boolean,
    showPattern: Boolean,
    contentPadding: Dp,
    outerRadius: Dp,
) = RetroFrameLayoutModifiers(
    frame = modifier.fillMaxSize().background(background).cornerRadius(outerRadius),
    pattern = if (showPattern) GlanceModifier.fillMaxSize().cornerRadius(outerRadius) else null,
    contentWrapper = GlanceModifier.fillMaxSize().padding(
        if (useCardSurface) WIDGET_FRAME_INSET else WIDGET_FRAME_INSET + contentPadding,
    ),
    contentSurface = if (useCardSurface) {
        GlanceModifier.fillMaxSize().background(card)
            .cornerRadius((outerRadius - WIDGET_FRAME_INSET).coerceAtLeast(0.dp))
            .padding(contentPadding)
    } else {
        null
    },
)

@Composable
internal fun WidgetResizeNotice(theme: WTheme, onClick: Action) {
    Box(
        modifier = GlanceModifier.fillMaxSize()
            .semantics { contentDescription = "위젯 크기를 키워주세요. 앱 열기" }.clickable(onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text("위젯 크기를 키워주세요", maxLines = 2,
            style = TextStyle(fontSize = 12.sp, color = ColorProvider(theme.palette.fg), textAlign = TextAlign.Center))
    }
}

@Composable
fun PixelText(res: String, tint: Color, height: Dp, width: Dp? = null, modifier: GlanceModifier = GlanceModifier) {
    Image(
        provider = ImageProvider(drawableId(res)),
        contentDescription = null,
        colorFilter = ColorFilter.tint(ColorProvider(tint)),
        modifier = (width?.let { modifier.width(it) } ?: modifier).height(height),
        contentScale = ContentScale.Fit,
    )
}

internal data class PixelButtonLayoutModifiers(
    val touchTarget: GlanceModifier,
    val frame: GlanceModifier,
    val secondarySurface: GlanceModifier?,
)

internal fun pixelButtonLayoutModifiers(
    modifier: GlanceModifier,
    primary: Boolean,
    border: Color,
    background: Color,
    surfaceWidth: Dp = 64.dp,
) = PixelButtonLayoutModifiers(
    touchTarget = modifier.height(WIDGET_TOUCH_SIZE),
    frame = GlanceModifier.width(surfaceWidth).height(34.dp).background(border).cornerRadius(8.dp).let {
        if (primary) it else it.padding(2.dp)
    },
    secondarySurface = if (primary) null else {
        GlanceModifier.fillMaxSize().background(background).cornerRadius(6.dp)
    },
)

@Composable
fun PixelIcon(res: String, tint: Color, size: Dp, onClick: Action? = null, actionLabel: String? = null) {
    if (onClick == null) {
        Image(provider = ImageProvider(drawableId(res)), contentDescription = null,
            colorFilter = ColorFilter.tint(ColorProvider(tint)), modifier = GlanceModifier.size(size))
    } else {
        Box(
            modifier = GlanceModifier.size(if (size < 48.dp) 48.dp else size)
                .semantics { contentDescription = actionLabel ?: "위젯 동작" }.clickable(onClick),
            contentAlignment = Alignment.Center,
        ) {
            Image(provider = ImageProvider(drawableId(res)), contentDescription = null,
                colorFilter = ColorFilter.tint(ColorProvider(tint)), modifier = GlanceModifier.size(size))
        }
    }
}

@Composable
fun PixelButton(
    labelRes: String,
    theme: WTheme,
    primary: Boolean,
    onClick: Action,
    actionLabel: String,
    accentOverride: Color? = null,
    modifier: GlanceModifier = GlanceModifier,
) {
    val bg = if (primary) (accentOverride ?: theme.palette.accent) else theme.palette.card
    val fg = if (primary) readableWidgetText(theme.palette.onAccent, bg) else theme.palette.fg
    val border = if (primary) bg else readableWidgetBorder(theme.palette.line, bg)
    val layout = pixelButtonLayoutModifiers(
        modifier.width(pixelButtonTouchWidth(labelRes)), primary, border, bg, pixelButtonSurfaceWidth(labelRes),
    )
    Box(modifier = layout.touchTarget.semantics { contentDescription = actionLabel }.clickable(onClick),
        contentAlignment = Alignment.Center) {
        Box(modifier = layout.frame, contentAlignment = Alignment.Center) {
            if (primary) {
                PixelText(labelRes, fg, 12.dp, width = pixelButtonLabelWidth(labelRes))
            } else {
                Box(modifier = checkNotNull(layout.secondarySurface), contentAlignment = Alignment.Center) {
                    PixelText(labelRes, fg, 12.dp, width = pixelButtonLabelWidth(labelRes))
                }
            }
        }
    }
}

@Composable
fun PixelIconButton(
    iconRes: String,
    theme: WTheme,
    primary: Boolean,
    onClick: Action,
    actionLabel: String,
    accentOverride: Color? = null,
    modifier: GlanceModifier = GlanceModifier,
) {
    val bg = if (primary) (accentOverride ?: theme.palette.accent) else theme.palette.card
    val fg = if (primary) readableWidgetText(theme.palette.onAccent, bg) else theme.palette.fg
    val border = if (primary) bg else readableWidgetBorder(theme.palette.line, bg)
    val layout = pixelButtonLayoutModifiers(modifier.width(WIDGET_TOUCH_SIZE), primary, border, bg, 34.dp)
    Box(modifier = layout.touchTarget.semantics { contentDescription = actionLabel }.clickable(onClick),
        contentAlignment = Alignment.Center) {
        Box(modifier = layout.frame, contentAlignment = Alignment.Center) {
            if (primary) {
                PixelIcon(iconRes, fg, 16.dp)
            } else {
                Box(modifier = checkNotNull(layout.secondarySurface), contentAlignment = Alignment.Center) {
                    PixelIcon(iconRes, fg, 16.dp)
                }
            }
        }
    }
}

internal fun pixelButtonLabelWidth(labelRes: String): Dp = when (labelRes) {
    "w_t_start" -> (12f * 162 / 33).dp
    "w_t_complete", "w_t_pause" -> (12f * 141 / 33).dp
    "w_t_resume" -> (12f * 72 / 33).dp
    "w_t_reset" -> (12f * 108 / 33).dp
    else -> (12f * 141 / 33).dp
}

internal fun pixelButtonSurfaceWidth(labelRes: String): Dp = if (labelRes == "w_t_start") 72.dp else 64.dp

internal fun pixelButtonTouchWidth(labelRes: String): Dp = if (labelRes == "w_t_start") 80.dp else 72.dp
