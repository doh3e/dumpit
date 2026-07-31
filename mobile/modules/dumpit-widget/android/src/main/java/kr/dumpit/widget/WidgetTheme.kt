package kr.dumpit.widget

import androidx.compose.ui.graphics.Color
import org.json.JSONObject

data class WPalette(
    val bg: Color, val card: Color, val fg: Color, val sub: Color,
    val line: Color, val edge: Color, val chip: Color,
    val accent: Color, val accent2: Color, val onAccent: Color,
    val shadowHero: Color, val shadowSm: Color, val warn: Color, val starlight: Color,
)
data class WPomo(val focus: Color, val rest: Color, val ring: Color, val soft: Color)
data class WTheme(val palette: WPalette, val pomo: WPomo, val dark: Boolean,
                  val patternRes: String?, val planetSuffix: String)

object WidgetTheme {
    private fun c(hex: String) = Color(android.graphics.Color.parseColor(hex))

    private val LIGHT = WPalette(
        bg = c("#F7EFDF"), card = c("#FFFDF6"), fg = c("#33271E"), sub = c("#8C7C66"),
        line = c("#E0D2B6"), edge = c("#3A2C21"), chip = c("#F0DFBB"),
        accent = c("#D95F52"), accent2 = c("#3E8E85"), onAccent = c("#FFFBF0"),
        shadowHero = c("#EBC0AC"), shadowSm = c("#DCC5A0"), warn = c("#D98E2B"), starlight = c("#E9B44C"),
    )
    private val DARK = WPalette(
        bg = c("#1F1B2E"), card = c("#2B2442"), fg = c("#F2E9D8"), sub = c("#9D93A8"),
        line = c("#413966"), edge = c("#141021"), chip = c("#3A3156"),
        accent = c("#F09355"), accent2 = c("#5FC4B4"), onAccent = c("#241E14"),
        shadowHero = c("#141021"), shadowSm = c("#141021"), warn = c("#E9B44C"), starlight = c("#E9B44C"),
    )
    // BG_SKINS 전사: 스킨이 덮는 필드만 override (fg·sub·warn·starlight는 기본 유지 — skins.ts 상단 주석과 동일 규칙)
    private data class BgOverride(
        val bg: String, val card: String, val chip: String, val line: String, val edge: String,
        val accent: String, val accent2: String, val onAccent: String,
        val shadowHero: String, val shadowSm: String, val hasPattern: Boolean,
    )
    private val BG_SKINS: Map<String, Pair<BgOverride, BgOverride>> = mapOf( // (light, dark)
        "ocean" to Pair(
            BgOverride("#E4EFEC", "#FCFEFD", "#D3E6E1", "#B7D4CD", "#28423C", "#2E7D8A", "#D97757", "#F4FBF9", "#A9CEC5", "#C6DDD7", false),
            BgOverride("#152430", "#1E3240", "#28414F", "#375366", "#0B141C", "#5FB8C9", "#F09355", "#0F1D26", "#0B141C", "#0B141C", false)),
        "lavender" to Pair(
            BgOverride("#EEEAF4", "#FDFCFF", "#E2DAEC", "#CBBEDC", "#372C48", "#8A63C4", "#3E8E85", "#FBF9FF", "#CDBEE2", "#D8CCE8", false),
            BgOverride("#251D3A", "#32294E", "#40355F", "#4F4373", "#151022", "#B79CE8", "#5FC4B4", "#1D1630", "#151022", "#151022", false)),
        "rose" to Pair(
            BgOverride("#F5E9EA", "#FEFCFC", "#EDD8DB", "#DDBCC2", "#43282E", "#C25B6E", "#6E9E62", "#FFF7F8", "#E3C2C8", "#E9CFD4", false),
            BgOverride("#2A1B20", "#3A282E", "#48333A", "#5C424B", "#170D10", "#E8899B", "#8FBF6F", "#251318", "#170D10", "#170D10", false)),
        "sprout" to Pair(
            BgOverride("#EAF2E3", "#FBFEF7", "#DCEBCE", "#C2DBAA", "#2F4224", "#5C8A3C", "#C4708F", "#F7FCF0", "#BFD8A6", "#CFE2BA", true),
            BgOverride("#1B2617", "#26351F", "#31452A", "#40573A", "#0E150B", "#8FBF6F", "#D98BA6", "#131C0E", "#0E150B", "#0E150B", true)),
        "galaxy" to Pair(
            BgOverride("#E9EAF6", "#FDFDFF", "#DBDDF0", "#C2C5E4", "#2E3050", "#6D74C9", "#C9922E", "#F8F9FF", "#C6C9E8", "#D2D5EC", true),
            BgOverride("#151329", "#201D3D", "#2B2750", "#3D3866", "#0A0918", "#8F97E8", "#E9B44C", "#12102A", "#0A0918", "#0A0918", true)),
        "wood" to Pair(
            BgOverride("#F1E5D2", "#FDF8EE", "#E7D5B8", "#D6BE97", "#3E2E1C", "#A8763E", "#5C8A6E", "#FFF9EC", "#D9C29B", "#E3D2B2", true),
            BgOverride("#241B10", "#2F2517", "#3B2F1E", "#4E3F2A", "#120C06", "#C99B5C", "#7FAF8F", "#1D150A", "#120C06", "#120C06", true)),
        "candy" to Pair(
            BgOverride("#F7E7EE", "#FEFAFC", "#F2D7E2", "#E5BCCE", "#46243A", "#E05C8A", "#3E93B8", "#FFF6FA", "#EBC4D4", "#F0D2DE", true),
            BgOverride("#2A1722", "#3A2230", "#482C3D", "#5E3B50", "#160A11", "#F08CAE", "#7FB8E8", "#2A1220", "#160A11", "#160A11", true)),
    )
    // POMO_SKINS 전사 (focus, rest, soft, ring?) — ring 생략 시 해당 scheme 기본 line
    private data class PomoOverride(val focus: String, val rest: String, val soft: String, val ring: String?)
    private val POMO_SKINS: Map<String, Pair<PomoOverride, PomoOverride>> = mapOf(
        "ocean" to Pair(PomoOverride("#2E7D8A", "#D97757", "#E4EFEC", null), PomoOverride("#5FB8C9", "#F09355", "#1E3240", null)),
        "lavender" to Pair(PomoOverride("#8A63C4", "#3E8E85", "#EEEAF4", null), PomoOverride("#B79CE8", "#5FC4B4", "#32294E", null)),
        "rose" to Pair(PomoOverride("#C25B6E", "#6E9E62", "#F5E9EA", null), PomoOverride("#E8899B", "#8FBF6F", "#3A282E", null)),
        "sprout" to Pair(PomoOverride("#5C8A3C", "#C4708F", "#EAF2E3", null), PomoOverride("#8FBF6F", "#D98BA6", "#1B2617", null)),
        "galaxy" to Pair(PomoOverride("#6D74C9", "#C9922E", "#E9EAF6", null), PomoOverride("#8F97E8", "#E9B44C", "#151329", null)),
        "wood" to Pair(PomoOverride("#A8763E", "#5C8A6E", "#F1E5D2", null), PomoOverride("#C99B5C", "#7FAF8F", "#241B10", null)),
        "candy" to Pair(PomoOverride("#E05C8A", "#5CA8E0", "#FBE4EE", "#F0C4D8"), PomoOverride("#F08CAE", "#7FB8E8", "#402832", "#5A3A48")),
    )

    fun resolve(json: String?, systemDark: Boolean): WTheme {
        val o = runCatching { JSONObject(json ?: "{}") }.getOrDefault(JSONObject())
        val mode = o.optString("mode", "light")
        val dark = if (mode == "system") systemDark else mode == "dark"
        val base = if (dark) DARK else LIGHT
        val bgSkin = o.optString("bgSkin").takeIf { it.isNotEmpty() && it != "null" }
        val pomoSkin = o.optString("pomoSkin").takeIf { it.isNotEmpty() && it != "null" }
        val planet = o.optString("planet").takeIf { it.isNotEmpty() && it != "null" } ?: "default"

        val ov = bgSkin?.let { BG_SKINS[it] }?.let { if (dark) it.second else it.first }
        val palette = if (ov == null) base else base.copy(
            bg = c(ov.bg), card = c(ov.card), chip = c(ov.chip), line = c(ov.line), edge = c(ov.edge),
            accent = c(ov.accent), accent2 = c(ov.accent2), onAccent = c(ov.onAccent),
            shadowHero = c(ov.shadowHero), shadowSm = c(ov.shadowSm),
        )
        val po = pomoSkin?.let { POMO_SKINS[it] }?.let { if (dark) it.second else it.first }
        val pomo = if (po == null)
            (if (dark) WPomo(c("#F09355"), c("#5FC4B4"), c("#413966"), c("#1F1B2E"))
             else WPomo(c("#D95F52"), c("#3E8E85"), c("#E0D2B6"), c("#F7EFDF")))
        else WPomo(c(po.focus), c(po.rest), po.ring?.let(::c) ?: palette.line, c(po.soft))

        val patternRes = if (ov?.hasPattern == true) "w_pattern_${bgSkin}_${if (dark) "dark" else "light"}" else null
        return WTheme(palette, pomo, dark, patternRes, planet)
    }
}
