package com.genoffice.mobile

import android.content.Context
import android.content.res.Configuration

/**
 * Home-screen design tokens, semantically aligned with packages/ui/src/tokens.css
 * (light/dark columns per the design review §3.1). Resolved from the system
 * uiMode — the home follows the OS theme; there is no in-app theme switch.
 *
 * App badge identity colors are NOT part of this token set: they live in the
 * home_badge_* VectorDrawables (converted from the desktop FileBadge SVGs) and
 * stay constant across themes (design review P0-4 / P1-1).
 */
class HomeTheme(val night: Boolean) {
    val bg = if (night) 0xFF1A1A1A.toInt() else 0xFFFAFAFA.toInt()
    val surface = if (night) 0xFF1E1E1E.toInt() else 0xFFFFFFFF.toInt()
    val border = if (night) 0xFF3A3A3A.toInt() else 0xFFE3E6EA.toInt()
    val divider = if (night) 0xFF3A3A3A.toInt() else 0xFFEFEFEF.toInt()
    val text = if (night) 0xFFE4E4E4.toInt() else 0xFF242424.toInt()
    val secondary = if (night) 0xFFA0A0A0.toInt() else 0xFF606366.toInt()
    val iconMuted = if (night) 0xFF666666.toInt() else 0xFFB9BFC7.toInt()
    // Light accent darkened from the spec's #0F7FFF (3.66:1) to #0B6AD4 to meet
    // WCAG AA (>=4.5:1) for 14sp text — the review's §8-4 contrast requirement
    // wins over the exact hex in P0-1 (acceptance FAIL resolution). ~5.0:1 on
    // bg / 5.2:1 on white. Dark accent already compliant (5.98:1), unchanged.
    val accent = if (night) 0xFF3F99FF.toInt() else 0xFF0B6AD4.toInt()
    val accentPressed = if (night) 0xFF5BA5FF.toInt() else 0xFF0A5FB8.toInt()
    val accentSoft = if (night) 0xFF24354D.toInt() else 0xFFEAF0FD.toInt()
    val btnPrimary = if (night) 0xFFE4E4E4.toInt() else 0xFF232425.toInt()
    val btnPrimaryText = if (night) 0xFF1E1E1E.toInt() else 0xFFFFFFFF.toInt()
    val btnPrimaryPressed = if (night) 0xFFD0D0D0.toInt() else 0xFF393A3B.toInt()
    val ripple = if (night) 0x1FFFFFFF.toInt() else 0x1F0F7FFF.toInt()

    companion object {
        fun from(ctx: Context): HomeTheme {
            val night = (ctx.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
                Configuration.UI_MODE_NIGHT_YES
            return HomeTheme(night)
        }
    }
}
