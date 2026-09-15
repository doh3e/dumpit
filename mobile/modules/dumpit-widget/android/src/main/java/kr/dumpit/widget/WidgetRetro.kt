package kr.dumpit.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
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

internal val WIDGET_SAFE_PADDING = 12.dp
private val LEGACY_WIDGET_RADIUS = 16.dp

internal fun widgetSafeContentWidth(widgetWidth: Dp): Dp =
    (widgetWidth - WIDGET_SAFE_PADDING - WIDGET_SAFE_PADDING).coerceAtLeast(0.dp)

internal enum class CompactButtonArrangement { Inline, Stacked }

internal fun compactButtonArrangement(widgetWidth: Dp): CompactButtonArrangement =
    if (widgetSafeContentWidth(widgetWidth) >= 100.dp) {
        CompactButtonArrangement.Inline
    } else {
        CompactButtonArrangement.Stacked
    }

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
fun RetroFrame(theme: WTheme, modifier: GlanceModifier = GlanceModifier, bgOverride: Color? = null, content: @Composable () -> Unit) {
    val bgColor = bgOverride ?: theme.palette.bg
    val outerRadius = systemWidgetRadius(LocalContext.current)
    val layoutModifiers = retroFrameLayoutModifiers(
        modifier = modifier,
        background = bgColor,
        card = theme.palette.card,
        useCardSurface = bgOverride == null,
        showPattern = bgOverride == null && theme.patternRes != null,
        contentPadding = WIDGET_SAFE_PADDING,
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
        Box(modifier = layoutModifiers.contentWrapper) {
            val contentSurface = layoutModifiers.contentSurface
            if (contentSurface == null) content() else Box(modifier = contentSurface) { content() }
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
    contentWrapper = GlanceModifier.fillMaxSize().padding(contentPadding),
    contentSurface = if (useCardSurface) {
        GlanceModifier.fillMaxSize().background(card)
            .cornerRadius((outerRadius - contentPadding).coerceAtLeast(0.dp))
    } else {
        null
    },
)

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
    val frame: GlanceModifier,
    val secondarySurface: GlanceModifier?,
)

internal fun pixelButtonLayoutModifiers(
    modifier: GlanceModifier,
    primary: Boolean,
    border: Color,
    background: Color,
) = PixelButtonLayoutModifiers(
    frame = modifier.height(48.dp).background(border).cornerRadius(8.dp).let {
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
    val labelWidth = pixelButtonLabelWidth(labelRes)
    val layoutModifiers = pixelButtonLayoutModifiers(modifier, primary, border, bg)
    Box(
        modifier = layoutModifiers.frame
            .semantics { contentDescription = actionLabel }.clickable(onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (primary) {
            PixelText(labelRes, fg, 14.dp, width = labelWidth)
        } else {
            Box(
                modifier = checkNotNull(layoutModifiers.secondarySurface),
                contentAlignment = Alignment.Center,
            ) {
                PixelText(labelRes, fg, 14.dp, width = labelWidth)
            }
        }
    }
}

internal fun pixelButtonLabelWidth(labelRes: String): Dp = when (labelRes) {
    "w_t_complete", "w_t_pause" -> 60.dp
    "w_t_resume" -> 31.dp
    "w_t_reset" -> 46.dp
    else -> 60.dp
}
