package kr.dumpit.widget

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
import androidx.glance.unit.ColorProvider

@Composable
fun drawableId(name: String): Int {
    val context = LocalContext.current
    return context.resources.getIdentifier(name, "drawable", context.packageName)
}

/** RetroCard 미러 — 섀도(우하 3dp)·edge 보더(2dp)·내용(bg+패턴) 3겹 */
@Composable
fun RetroFrame(theme: WTheme, modifier: GlanceModifier = GlanceModifier, bgOverride: Color? = null, content: @Composable () -> Unit) {
    Box(modifier = modifier.fillMaxSize()) {
        Box(modifier = GlanceModifier.fillMaxSize().padding(start = 3.dp, top = 3.dp)) {
            Box(modifier = GlanceModifier.fillMaxSize().background(theme.palette.shadowHero).cornerRadius(12.dp)) {}
        }
        Box(modifier = GlanceModifier.fillMaxSize().padding(end = 3.dp, bottom = 3.dp)) {
            Box(modifier = GlanceModifier.fillMaxSize().background(theme.palette.edge).cornerRadius(12.dp).padding(2.dp)) {
                val bgColor = bgOverride ?: theme.palette.bg
                Box(modifier = GlanceModifier.fillMaxSize().background(bgColor).cornerRadius(10.dp)) {
                    if (bgOverride == null && theme.patternRes != null) {
                        Image(
                            provider = ImageProvider(drawableId(theme.patternRes)),
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = GlanceModifier.fillMaxSize().cornerRadius(10.dp),
                        )
                    }
                    Box(modifier = GlanceModifier.fillMaxSize().padding(10.dp)) { content() }
                }
            }
        }
    }
}

@Composable
fun PixelText(res: String, tint: Color, height: Dp, modifier: GlanceModifier = GlanceModifier) {
    Image(
        provider = ImageProvider(drawableId(res)),
        contentDescription = null,
        colorFilter = ColorFilter.tint(ColorProvider(tint)),
        modifier = modifier.height(height),
        contentScale = ContentScale.Fit,
    )
}

@Composable
fun PixelIcon(res: String, tint: Color, size: Dp, onClick: Action? = null) {
    val m = GlanceModifier.size(size).let { if (onClick != null) it.clickable(onClick) else it }
    Image(
        provider = ImageProvider(drawableId(res)),
        contentDescription = null,
        colorFilter = ColorFilter.tint(ColorProvider(tint)),
        modifier = m,
    )
}

@Composable
fun PixelButton(labelRes: String, theme: WTheme, primary: Boolean, onClick: Action, accentOverride: Color? = null) {
    val bg = if (primary) (accentOverride ?: theme.palette.accent) else theme.palette.card
    val fg = if (primary) theme.palette.onAccent else theme.palette.fg
    Box(modifier = GlanceModifier.background(theme.palette.edge).cornerRadius(9.dp).padding(2.dp).clickable(onClick)) {
        Box(modifier = GlanceModifier.background(bg).cornerRadius(7.dp).padding(horizontal = 12.dp, vertical = 6.dp)) {
            PixelText(labelRes, fg, 14.dp)
        }
    }
}
