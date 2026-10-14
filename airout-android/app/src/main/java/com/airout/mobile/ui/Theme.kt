package com.airout.mobile.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Ink = Color(0xFF2C2540)
val Muted = Color(0xFF746C88)
val Canvas = Color(0xFFF4F7FF)
val Primary = Color(0xFF7C6BF5)
val Blush = Color(0xFFF8D5EE)
val Sky = Color(0xFFD9E6FF)
val Lilac = Color(0xFFE7DCFF)
val Bubble = Color(0xFFE9D7FF)
val Warm = Color(0xFFFFF6EE)

private val LightColors = lightColorScheme(
    primary = Primary,
    onPrimary = Color.White,
    background = Canvas,
    surface = Color.White,
    onSurface = Ink,
    secondary = Color(0xFF5B7CDB),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFC9BEFF),
    onPrimary = Color(0xFF241F33),
    background = Color(0xFF171326),
    surface = Color(0xFF241E38),
    onSurface = Color(0xFFF6F3FB),
)

@Composable
fun AiroutTheme(dark: Boolean, content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (dark) DarkColors else LightColors, content = content)
}
