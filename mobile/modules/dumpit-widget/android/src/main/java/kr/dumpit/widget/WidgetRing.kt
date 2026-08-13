package kr.dumpit.widget

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF

object WidgetRing {
    fun bitmap(sizePx: Int, trackColor: Int, progressColor: Int, fraction: Float, strokePx: Int): Bitmap {
        val bmp = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = strokePx.toFloat()
            strokeCap = Paint.Cap.BUTT   // 픽셀 감성 — 라운드 캡 금지
        }
        val inset = strokePx / 2f + 1f
        val rect = RectF(inset, inset, sizePx - inset, sizePx - inset)
        paint.color = trackColor
        canvas.drawArc(rect, 0f, 360f, false, paint)
        paint.color = progressColor
        canvas.drawArc(rect, -90f, 360f * fraction.coerceIn(0f, 1f), false, paint)
        return bmp
    }
}
