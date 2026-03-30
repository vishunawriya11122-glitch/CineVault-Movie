package com.cinevault.app.ui.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.asComposeRenderEffect
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.cinevault.app.ui.components.UpdateDialog
import com.cinevault.app.ui.screen.*
import com.cinevault.app.ui.theme.CineVaultTheme
import com.cinevault.app.ui.viewmodel.AppViewModel
import kotlin.math.cos
import kotlin.math.sin

data class BottomNavItem(val label: String, val icon: ImageVector, val route: String)

val bottomNavItems = listOf(
    BottomNavItem("Home", Icons.Filled.Home, Screen.Home.route),
    BottomNavItem("Downloads", Icons.Filled.Download, Screen.Downloads.route),
    BottomNavItem("Watchlist", Icons.Outlined.BookmarkBorder, Screen.Watchlist.route),
    BottomNavItem("Me", Icons.Filled.Person, Screen.Me.route),
)

// ═══════════════════════════════════════════════════════════════
// PREMIUM BOTTOM NAV BAR
// ═══════════════════════════════════════════════════════════════

@Composable
fun PremiumBottomNavBar(
    navController: NavHostController,
    currentRoute: String?,
) {
    val goldColor = CineVaultTheme.colors.accentGold
    val goldLight = CineVaultTheme.colors.accentLight
    val goldMuted = CineVaultTheme.colors.accentMuted

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color.Transparent,
                        CineVaultTheme.colors.surface.copy(alpha = 0.7f),
                        CineVaultTheme.colors.surface.copy(alpha = 0.97f),
                        CineVaultTheme.colors.surface,
                    )
                )
            )
            .navigationBarsPadding()
            .padding(top = 10.dp, bottom = 8.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.Bottom,
        ) {
            bottomNavItems.forEach { item ->
                val selected = currentRoute == item.route

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                        ) {
                            navController.navigate(item.route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    when (item.route) {
                        Screen.Home.route -> HomeNavItem(selected = selected, goldColor = goldColor, goldLight = goldLight, goldMuted = goldMuted)
                        Screen.Downloads.route -> DownloadNavItem(selected = selected, goldColor = goldColor, goldLight = goldLight, goldMuted = goldMuted)
                        Screen.Watchlist.route -> WatchlistNavItem(selected = selected, goldColor = goldColor, goldLight = goldLight)
                        Screen.Me.route -> MeNavItem(selected = selected, goldColor = goldColor)
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// HOME: House with star, roof drops from top, star zooms+rotates
// ═══════════════════════════════════════════════════════════════

@Composable
private fun HomeNavItem(selected: Boolean, goldColor: Color, goldLight: Color, goldMuted: Color) {
    // Roof drop: animates from above the icon down to its resting position
    val roofDrop by animateFloatAsState(
        targetValue = if (selected) 0f else -1f,
        animationSpec = spring(dampingRatio = 0.45f, stiffness = 280f),
        label = "roofDrop"
    )
    val roofAlpha by animateFloatAsState(
        targetValue = if (selected) 1f else 0f,
        animationSpec = tween(250),
        label = "roofAlpha"
    )

    // Star: scale from small to big + slight rotation + fade
    val starScale by animateFloatAsState(
        targetValue = if (selected) 1f else 0.4f,
        animationSpec = spring(dampingRatio = 0.35f, stiffness = 350f),
        label = "starScale"
    )
    val starAlpha by animateFloatAsState(
        targetValue = if (selected) 1f else 0.6f,
        animationSpec = tween(300),
        label = "starAlpha"
    )
    val starRotation by animateFloatAsState(
        targetValue = if (selected) 0f else -30f,
        animationSpec = spring(dampingRatio = 0.4f, stiffness = 300f),
        label = "starRotation"
    )

    val iconScale by animateFloatAsState(
        targetValue = if (selected) 1.05f else 1f,
        animationSpec = spring(dampingRatio = 0.5f, stiffness = 350f),
        label = "homeIconScale"
    )

    val gray = Color(0xFF808080)

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(vertical = 2.dp),
    ) {
        Canvas(
            modifier = Modifier
                .size(28.dp)
                .graphicsLayer {
                    scaleX = iconScale
                    scaleY = iconScale
                }
        ) {
            val w = size.width
            val h = size.height
            val strokeW = 1.5.dp.toPx()

            val outlineColor = if (selected) goldColor else gray
            val fillBrush = if (selected) Brush.verticalGradient(
                colors = listOf(goldLight, goldColor, goldMuted)
            ) else null

            // ── Measurements ──
            val bodyLeft = w * 0.15f
            val bodyRight = w * 0.85f
            val bodyTop = h * 0.38f
            val bodyBottom = h * 0.93f
            val bodyCorner = 5.dp.toPx()

            val roofPeakX = w * 0.5f
            val roofPeakY = h * 0.06f
            // Roof base aligns with body edges
            val roofLeftX = bodyLeft
            val roofRightX = bodyRight
            val roofBaseY = bodyTop + strokeW

            // Animated roof Y offset (drops from above)
            val roofOffsetY = roofDrop * h * 0.15f

            // ── HOUSE BODY (rounded rect) ──
            val bodyWidth = bodyRight - bodyLeft
            val bodyHeight = bodyBottom - bodyTop

            if (fillBrush != null) {
                drawRoundRect(
                    brush = fillBrush,
                    topLeft = Offset(bodyLeft, bodyTop),
                    size = Size(bodyWidth, bodyHeight),
                    cornerRadius = CornerRadius(bodyCorner, bodyCorner),
                )
            }
            drawRoundRect(
                color = outlineColor,
                topLeft = Offset(bodyLeft, bodyTop),
                size = Size(bodyWidth, bodyHeight),
                cornerRadius = CornerRadius(bodyCorner, bodyCorner),
                style = Stroke(width = strokeW, cap = StrokeCap.Round, join = StrokeJoin.Round),
            )

            // ── ROOF (triangle that aligns exactly with house edges) ──
            val roofPath = Path().apply {
                moveTo(roofPeakX, roofPeakY + roofOffsetY)
                lineTo(roofRightX + w * 0.02f, roofBaseY + roofOffsetY)
                lineTo(roofLeftX - w * 0.02f, roofBaseY + roofOffsetY)
                close()
            }

            if (selected) {
                // Only show roof filled when selected
                if (fillBrush != null) {
                    drawPath(roofPath, fillBrush, alpha = roofAlpha)
                }
                drawPath(
                    roofPath, outlineColor,
                    style = Stroke(width = strokeW, cap = StrokeCap.Round, join = StrokeJoin.Round),
                    alpha = roofAlpha,
                )
            } else {
                // Unselected: always show roof outline
                drawPath(
                    roofPath, outlineColor,
                    style = Stroke(width = strokeW, cap = StrokeCap.Round, join = StrokeJoin.Round),
                )
            }

            // ── STAR in center of body ──
            val starCX = w * 0.5f
            val starCY = (bodyTop + bodyBottom) / 2f + h * 0.01f
            val outerR = w * 0.115f * starScale
            val innerR = outerR * 0.42f
            val starColor = if (selected) Color(0xFF1A1A1A) else gray

            // Apply star rotation by drawing with rotated coordinates
            val rotRad = Math.toRadians(starRotation.toDouble())
            drawStarRotated(
                center = Offset(starCX, starCY),
                outerRadius = outerR,
                innerRadius = innerR,
                points = 5,
                color = starColor,
                alpha = starAlpha,
                rotationRad = rotRad.toFloat(),
                style = if (selected) Fill else Stroke(width = 1.2.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round),
            )
        }

        Spacer(modifier = Modifier.height(1.dp))

        Text(
            "Home",
            fontSize = 8.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = if (selected) goldColor else Color(0xFF808080),
        )
    }
}

// Draw a 5-pointed star with rotation
private fun DrawScope.drawStarRotated(
    center: Offset,
    outerRadius: Float,
    innerRadius: Float,
    points: Int,
    color: Color,
    alpha: Float,
    rotationRad: Float,
    style: androidx.compose.ui.graphics.drawscope.DrawStyle,
) {
    val path = Path()
    val angleStep = Math.PI / points
    var angle = -Math.PI / 2.0 + rotationRad

    for (i in 0 until points * 2) {
        val r = if (i % 2 == 0) outerRadius else innerRadius
        val x = center.x + (r * cos(angle)).toFloat()
        val y = center.y + (r * sin(angle)).toFloat()
        if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
        angle += angleStep
    }
    path.close()
    drawPath(path, color, alpha = alpha, style = style)
}

// ═══════════════════════════════════════════════════════════════
// DOWNLOAD: Rounded box with bold arrow, Top→Down→Up→Down→Stop
// ═══════════════════════════════════════════════════════════════

@Composable
private fun DownloadNavItem(selected: Boolean, goldColor: Color, goldLight: Color, goldMuted: Color) {
    // Arrow animation using Animatable for proper one-shot keyframe playback
    val arrowOffset = remember { Animatable(0f) }
    LaunchedEffect(selected) {
        if (selected) {
            arrowOffset.snapTo(-1f) // start from top
            arrowOffset.animateTo(
                targetValue = 0f,
                animationSpec = keyframes {
                    durationMillis = 1000
                    -1f at 0 using FastOutSlowInEasing       // top
                    1f at 250 using FastOutSlowInEasing      // ↓ down
                    -0.5f at 500 using FastOutSlowInEasing   // ↑ back up
                    0.7f at 720 using FastOutSlowInEasing    // ↓ down again
                    -0.05f at 880 using FastOutSlowInEasing  // tiny overshoot
                    0f at 1000 using FastOutSlowInEasing     // soft stop
                }
            )
        } else {
            arrowOffset.snapTo(0f)
        }
    }

    val iconScale by animateFloatAsState(
        targetValue = if (selected) 1.06f else 1f,
        animationSpec = spring(dampingRatio = 0.5f, stiffness = 300f),
        label = "dlScale"
    )

    val gray = Color(0xFF808080)

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(vertical = 2.dp),
    ) {
        Canvas(
            modifier = Modifier
                .size(28.dp)
                .graphicsLayer {
                    scaleX = iconScale
                    scaleY = iconScale
                }
        ) {
            val w = size.width
            val h = size.height
            val strokeW = 1.5.dp.toPx()
            val cornerR = 4.dp.toPx()

            val outlineColor = if (selected) goldColor else gray
            val fillBrush = if (selected) Brush.verticalGradient(
                colors = listOf(goldLight, goldColor, goldMuted)
            ) else null

            val boxLeft = w * 0.1f
            val boxTop = h * 0.06f
            val boxRight = w * 0.9f
            val boxBottom = h * 0.93f
            val boxWidth = boxRight - boxLeft
            val boxHeight = boxBottom - boxTop

            // ── OUTER BOX ──
            if (fillBrush != null) {
                drawRoundRect(
                    brush = fillBrush,
                    topLeft = Offset(boxLeft, boxTop),
                    size = Size(boxWidth, boxHeight),
                    cornerRadius = CornerRadius(cornerR, cornerR),
                )
            }
            drawRoundRect(
                color = outlineColor,
                topLeft = Offset(boxLeft, boxTop),
                size = Size(boxWidth, boxHeight),
                cornerRadius = CornerRadius(cornerR, cornerR),
                style = Stroke(width = strokeW, cap = StrokeCap.Round, join = StrokeJoin.Round),
            )

            // ── FOLD LINE ──
            val foldY = boxTop + boxHeight * 0.48f
            val foldColor = if (selected) Color(0xFF1A1A1A).copy(alpha = 0.3f) else gray.copy(alpha = 0.35f)
            drawLine(
                color = foldColor,
                start = Offset(boxLeft + cornerR * 0.5f, foldY),
                end = Offset(boxRight - cornerR * 0.5f, foldY),
                strokeWidth = strokeW * 0.7f,
                cap = StrokeCap.Round,
            )

            // ── BOLD ARROW pointing down ──
            val arrowColor = if (selected) Color(0xFF1A1A1A) else gray
            val arrowCX = w * 0.5f
            val arrowBounce = arrowOffset.value * 5.dp.toPx()

            // Thick shaft
            val shaftW = strokeW * 2f
            val shaftTop = boxTop + boxHeight * 0.16f + arrowBounce
            val shaftBottom = foldY - boxHeight * 0.08f + arrowBounce
            drawLine(
                color = arrowColor,
                start = Offset(arrowCX, shaftTop),
                end = Offset(arrowCX, shaftBottom),
                strokeWidth = shaftW,
                cap = StrokeCap.Round,
            )

            // Bold arrowhead (filled triangle, slightly smaller)
            val headW = w * 0.18f
            val headH = w * 0.13f
            val headTipY = shaftBottom + headH
            val arrowHead = Path().apply {
                moveTo(arrowCX, headTipY)
                lineTo(arrowCX - headW, shaftBottom)
                lineTo(arrowCX + headW, shaftBottom)
                close()
            }
            drawPath(arrowHead, arrowColor)
        }

        Spacer(modifier = Modifier.height(1.dp))

        Text(
            "Download",
            fontSize = 8.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = if (selected) goldColor else Color(0xFF808080),
        )
    }
}

// ═══════════════════════════════════════════════════════════════
// WATCHLIST: Bookmark with subtle scale + glow pulse
// ═══════════════════════════════════════════════════════════════

@Composable
private fun WatchlistNavItem(selected: Boolean, goldColor: Color, goldLight: Color) {
    val iconScale by animateFloatAsState(
        targetValue = if (selected) 1.12f else 1f,
        animationSpec = spring(dampingRatio = 0.4f, stiffness = 300f),
        label = "wlScale"
    )

    // Subtle pulse for selected state
    var triggerPulse by remember { mutableStateOf(false) }
    LaunchedEffect(selected) {
        if (selected) triggerPulse = true
    }
    val pulseScale by animateFloatAsState(
        targetValue = if (triggerPulse && selected) 1f else 1f,
        animationSpec = if (triggerPulse && selected) {
            keyframes {
                durationMillis = 500
                1f at 0
                1.2f at 150
                0.95f at 300
                1.05f at 420
                1f at 500
            }
        } else tween(200),
        label = "wlPulse",
        finishedListener = { triggerPulse = false }
    )

    val gray = Color(0xFF808080)

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(vertical = 2.dp),
    ) {
        Canvas(
            modifier = Modifier
                .size(28.dp)
                .graphicsLayer {
                    scaleX = iconScale * pulseScale
                    scaleY = iconScale * pulseScale
                }
        ) {
            val w = size.width
            val h = size.height
            val strokeW = 1.5.dp.toPx()
            val cornerR = 4.dp.toPx()
            val color = if (selected) goldColor else gray

            val left = w * 0.22f
            val right = w * 0.78f
            val top = h * 0.06f
            val bottom = h * 0.9f
            val notchY = bottom - h * 0.2f

            val bookmarkPath = Path().apply {
                moveTo(left + cornerR, top)
                lineTo(right - cornerR, top)
                cubicTo(right, top, right, top, right, top + cornerR)
                lineTo(right, notchY)
                lineTo((left + right) / 2f, bottom)
                lineTo(left, notchY)
                lineTo(left, top + cornerR)
                cubicTo(left, top, left, top, left + cornerR, top)
                close()
            }

            if (selected) {
                drawPath(bookmarkPath, Brush.verticalGradient(listOf(goldLight, goldColor)))
            }
            drawPath(bookmarkPath, color, style = Stroke(width = strokeW, cap = StrokeCap.Round, join = StrokeJoin.Round))

            // Plus sign in center
            val plusSize = w * 0.10f
            val plusCX = w * 0.5f
            val plusCY = h * 0.38f
            val plusColor = if (selected) Color(0xFF1A1A1A) else gray
            val plusStroke = strokeW * 0.9f
            drawLine(plusColor, Offset(plusCX - plusSize, plusCY), Offset(plusCX + plusSize, plusCY), strokeWidth = plusStroke, cap = StrokeCap.Round)
            drawLine(plusColor, Offset(plusCX, plusCY - plusSize), Offset(plusCX, plusCY + plusSize), strokeWidth = plusStroke, cap = StrokeCap.Round)
        }

        Spacer(modifier = Modifier.height(1.dp))

        Text(
            "Watchlist",
            fontSize = 8.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = if (selected) goldColor else Color(0xFF808080),
        )
    }
}

// ═══════════════════════════════════════════════════════════════
// ME: 😎 Real emoji with scale + rotation + bounce animation
// ═══════════════════════════════════════════════════════════════

@Composable
private fun MeNavItem(selected: Boolean, goldColor: Color) {
    val iconScale by animateFloatAsState(
        targetValue = if (selected) 1.2f else 1f,
        animationSpec = spring(dampingRatio = 0.35f, stiffness = 350f),
        label = "meScale"
    )
    val rotation by animateFloatAsState(
        targetValue = if (selected) 360f else 0f,
        animationSpec = tween(500, easing = FastOutSlowInEasing),
        label = "meRotate"
    )
    val bounceY by animateFloatAsState(
        targetValue = if (selected) -4f else 0f,
        animationSpec = spring(dampingRatio = 0.3f, stiffness = 400f),
        label = "meBounce"
    )

    // Desaturation: 0 = full grayscale, 1 = full color
    val saturation by animateFloatAsState(
        targetValue = if (selected) 0.7f else 0.0f,
        animationSpec = tween(350),
        label = "meSaturation"
    )
    val emojiAlpha by animateFloatAsState(
        targetValue = if (selected) 0.85f else 0.4f,
        animationSpec = tween(300),
        label = "meAlpha"
    )

    // Build a saturation ColorMatrix
    val colorMatrix = remember(saturation) {
        val s = saturation
        val inv = 1f - s
        val r = 0.213f * inv
        val g = 0.715f * inv
        val b = 0.072f * inv
        android.graphics.ColorMatrix(floatArrayOf(
            r + s, g,     b,     0f, 0f,
            r,     g + s, b,     0f, 0f,
            r,     g,     b + s, 0f, 0f,
            0f,    0f,    0f,    1f, 0f
        ))
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(vertical = 2.dp),
    ) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .graphicsLayer {
                    scaleX = iconScale
                    scaleY = iconScale
                    translationY = bounceY
                    rotationZ = rotation
                    alpha = emojiAlpha
                    renderEffect = android.graphics.RenderEffect
                        .createColorFilterEffect(
                            android.graphics.ColorMatrixColorFilter(colorMatrix)
                        )
                        .asComposeRenderEffect()
                },
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "\uD83D\uDE0E",
                fontSize = 26.sp,
                textAlign = TextAlign.Center,
            )
        }

        Spacer(modifier = Modifier.height(1.dp))

        Text(
            "Me",
            fontSize = 8.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = if (selected) goldColor else Color(0xFF808080),
        )
    }
}

@Composable
fun CineVaultNavHost(navController: NavHostController = rememberNavController()) {
    val appViewModel: AppViewModel = hiltViewModel()
    val updateInfo by appViewModel.updateInfo.collectAsState()

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val showBottomBar = currentRoute in bottomNavItems.map { it.route }

    Scaffold(
        containerColor = CineVaultTheme.colors.background,
        bottomBar = {
            if (showBottomBar) {
                PremiumBottomNavBar(
                    navController = navController,
                    currentRoute = currentRoute,
                )
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = Screen.Splash.route,
            modifier = Modifier.padding(paddingValues),
            enterTransition = { fadeIn(animationSpec = tween(300)) },
            exitTransition = { fadeOut(animationSpec = tween(300)) },
        ) {
            composable(Screen.Splash.route) {
                SplashScreen(
                    onNavigateToOnboarding = {
                        navController.navigate(Screen.Onboarding.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    },
                    onNavigateToHome = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    },
                    onNavigateToLogin = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    },
                )
            }

            composable(Screen.Onboarding.route) {
                OnboardingScreen(
                    onComplete = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(Screen.Onboarding.route) { inclusive = true }
                        }
                    }
                )
            }

            composable(Screen.Login.route) {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    },
                    onNavigateToRegister = { navController.navigate(Screen.Register.route) },
                    onNavigateToForgotPassword = { navController.navigate(Screen.ForgotPassword.route) },
                )
            }

            composable(Screen.Register.route) {
                RegisterScreen(
                    onRegisterSuccess = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Register.route) { inclusive = true }
                        }
                    },
                    onNavigateToLogin = { navController.popBackStack() },
                )
            }

            composable(Screen.ForgotPassword.route) {
                ForgotPasswordScreen(
                    onBack = { navController.popBackStack() },
                )
            }

            composable(Screen.Home.route) {
                HomeScreen(
                    onMovieClick = { movieId -> navController.navigate(Screen.MovieDetail.createRoute(movieId)) },
                    onPlayClick = { contentId -> navController.navigate(Screen.Player.createRoute(contentId, null)) },
                    onSearchClick = { navController.navigate(Screen.Search.route) },
                    onNotificationsClick = { navController.navigate(Screen.Notifications.route) },
                    onSectionClick = { section ->
                        SectionDataHolder.set(section)
                        navController.navigate(Screen.SectionDetail.createRoute(section.id))
                    },
                )
            }

            composable(Screen.Search.route) {
                SearchScreen(
                    onMovieClick = { movieId -> navController.navigate(Screen.MovieDetail.createRoute(movieId)) },
                )
            }

            composable(Screen.Watchlist.route) {
                WatchlistScreen(
                    onMovieClick = { movieId -> navController.navigate(Screen.MovieDetail.createRoute(movieId)) },
                )
            }

            composable(Screen.Me.route) {
                MeScreen(
                    onNavigateToNotifications = { navController.navigate(Screen.Notifications.route) },
                    onNavigateToSettings = { navController.navigate(Screen.Settings.route) },
                    onMovieClick = { movieId -> navController.navigate(Screen.MovieDetail.createRoute(movieId)) },
                    onHistoryItemClick = { contentId, episodeId ->
                        // Push DetailPage then Player: Back from Player → Trailer Page
                        navController.navigate(Screen.MovieDetail.createRoute(contentId))
                        navController.navigate(Screen.Player.createRoute(contentId, episodeId))
                    },
                )
            }

            composable(Screen.Settings.route) {
                SettingsScreen(
                    onBack = { navController.popBackStack() },
                    onLogout = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    onNavigateToNotifications = { navController.navigate(Screen.Notifications.route) },
                    onNavigateToWatchHistory = { navController.navigate(Screen.WatchHistory.route) },
                )
            }

            composable(Screen.Notifications.route) {
                NotificationsScreen(
                    onBack = { navController.popBackStack() },
                    onMovieClick = { movieId -> navController.navigate(Screen.MovieDetail.createRoute(movieId)) },
                )
            }

            composable(Screen.Downloads.route) {
                DownloadsScreen()
            }

            composable(Screen.WatchHistory.route) {
                WatchHistoryScreen(
                    onBack = { navController.popBackStack() },
                    onHistoryItemClick = { contentId, episodeId ->
                        // Push DetailPage then Player: Back from Player → Trailer Page
                        navController.navigate(Screen.MovieDetail.createRoute(contentId))
                        navController.navigate(Screen.Player.createRoute(contentId, episodeId))
                    },
                )
            }

            composable(
                Screen.SectionDetail.route,
                arguments = listOf(navArgument("sectionId") { type = NavType.StringType }),
            ) {
                val section = SectionDataHolder.get()
                SectionDetailScreen(
                    sectionTitle = section?.title ?: "Section",
                    movies = section?.items ?: emptyList(),
                    onMovieClick = { movieId -> navController.navigate(Screen.MovieDetail.createRoute(movieId)) },
                    onBack = { navController.popBackStack() },
                )
            }

            composable(
                Screen.MovieDetail.route,
                arguments = listOf(navArgument("movieId") { type = NavType.StringType }),
            ) {
                MovieDetailScreen(
                    onBack = { navController.popBackStack() },
                    onPlay = { contentId, episodeId ->
                        navController.navigate(Screen.Player.createRoute(contentId, episodeId))
                    },
                    onRelatedClick = { movieId ->
                        navController.navigate(Screen.MovieDetail.createRoute(movieId))
                    },
                )
            }

            composable(
                Screen.Player.route,
                arguments = listOf(
                    navArgument("contentId") { type = NavType.StringType },
                    navArgument("episodeId") { type = NavType.StringType; nullable = true; defaultValue = null },
                ),
            ) {
                PlayerScreen(
                    onBack = { navController.popBackStack() },
                )
            }
        }
    }

    // Show update dialog on top of everything when an update is available
    updateInfo?.let { info ->
        UpdateDialog(
            info = info,
            onDismiss = { appViewModel.dismissUpdate() }
        )
    }
}
