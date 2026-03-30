package com.cinevault.app.ui.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.*
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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.graphicsLayer
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
    val goldMuted = CineVaultTheme.colors.accentMuted

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color.Transparent,
                        CineVaultTheme.colors.surface.copy(alpha = 0.6f),
                        CineVaultTheme.colors.surface.copy(alpha = 0.97f),
                        CineVaultTheme.colors.surface,
                    )
                )
            )
            .navigationBarsPadding()
            .padding(top = 8.dp, bottom = 6.dp),
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
                        Screen.Home.route -> HomeNavItem(selected = selected, goldColor = goldColor)
                        Screen.Downloads.route -> DownloadNavItem(selected = selected, goldColor = goldColor)
                        Screen.Watchlist.route -> WatchlistNavItem(selected = selected, goldColor = goldColor)
                        Screen.Me.route -> MeNavItem(selected = selected, goldColor = goldColor)
                    }
                }
            }
        }
    }
}

// ── HOME NAV ITEM: House icon with drop + roof animation ──

@Composable
private fun HomeNavItem(selected: Boolean, goldColor: Color) {
    val dropOffset by animateFloatAsState(
        targetValue = if (selected) 4f else 0f,
        animationSpec = spring(dampingRatio = 0.4f, stiffness = 300f),
        label = "homeDrop"
    )
    val roofAlpha by animateFloatAsState(
        targetValue = if (selected) 1f else 0f,
        animationSpec = tween(350, easing = FastOutSlowInEasing),
        label = "roofAlpha"
    )
    val roofScale by animateFloatAsState(
        targetValue = if (selected) 1f else 0.5f,
        animationSpec = spring(dampingRatio = 0.5f, stiffness = 350f),
        label = "roofScale"
    )
    val iconScale by animateFloatAsState(
        targetValue = if (selected) 1.15f else 1f,
        animationSpec = spring(dampingRatio = 0.5f, stiffness = 350f),
        label = "homeScale"
    )

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(vertical = 2.dp),
    ) {
        // Roof / triangle on top
        Box(
            modifier = Modifier
                .width(28.dp)
                .height(8.dp)
                .graphicsLayer {
                    alpha = roofAlpha
                    scaleX = roofScale
                    scaleY = roofScale
                }
                .drawBehind {
                    val path = Path().apply {
                        moveTo(size.width / 2f, 0f)
                        lineTo(0f, size.height)
                        lineTo(size.width, size.height)
                        close()
                    }
                    drawPath(path, goldColor, style = Fill)
                }
        )

        Spacer(modifier = Modifier.height(2.dp))

        // House icon with drop
        Icon(
            Icons.Filled.Home,
            contentDescription = "Home",
            tint = if (selected) goldColor else CineVaultTheme.colors.textSecondary,
            modifier = Modifier
                .size(26.dp)
                .graphicsLayer {
                    translationY = dropOffset
                    scaleX = iconScale
                    scaleY = iconScale
                }
        )

        Spacer(modifier = Modifier.height(3.dp))

        Text(
            "Home",
            fontSize = 11.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = if (selected) goldColor else CineVaultTheme.colors.textSecondary,
        )
    }
}

// ── DOWNLOAD NAV ITEM: Premium box-style icon ──

@Composable
private fun DownloadNavItem(selected: Boolean, goldColor: Color) {
    val bounceOffset by animateFloatAsState(
        targetValue = if (selected) 6f else 0f,
        animationSpec = spring(dampingRatio = 0.35f, stiffness = 400f),
        label = "dlBounce"
    )
    val boxAlpha by animateFloatAsState(
        targetValue = if (selected) 1f else 0.5f,
        animationSpec = tween(300),
        label = "dlBoxAlpha"
    )
    val iconScale by animateFloatAsState(
        targetValue = if (selected) 1.15f else 1f,
        animationSpec = spring(dampingRatio = 0.5f, stiffness = 350f),
        label = "dlScale"
    )

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(vertical = 2.dp),
    ) {
        Spacer(modifier = Modifier.height(10.dp))

        // Premium download icon: arrow inside a box/tray
        Box(
            modifier = Modifier
                .size(28.dp)
                .graphicsLayer {
                    scaleX = iconScale
                    scaleY = iconScale
                }
                .drawBehind {
                    val color = if (selected) goldColor else Color(0xFFA0A0A0)

                    // Draw the tray/box at bottom
                    val trayHeight = size.height * 0.35f
                    val trayTop = size.height - trayHeight
                    val strokeW = 2.dp.toPx()

                    // Left wall
                    drawRect(
                        color = color.copy(alpha = boxAlpha),
                        topLeft = Offset(0f, trayTop),
                        size = Size(strokeW, trayHeight),
                    )
                    // Bottom wall
                    drawRect(
                        color = color.copy(alpha = boxAlpha),
                        topLeft = Offset(0f, size.height - strokeW),
                        size = Size(size.width, strokeW),
                    )
                    // Right wall
                    drawRect(
                        color = color.copy(alpha = boxAlpha),
                        topLeft = Offset(size.width - strokeW, trayTop),
                        size = Size(strokeW, trayHeight),
                    )

                    // Draw the down arrow
                    val arrowCenterX = size.width / 2f
                    val arrowTop = size.height * 0.05f
                    val arrowBottom = trayTop - 2.dp.toPx()
                    val arrowW = strokeW * 1.2f

                    // Vertical shaft
                    drawRect(
                        color = color,
                        topLeft = Offset(arrowCenterX - arrowW / 2f, arrowTop + bounceOffset),
                        size = Size(arrowW, arrowBottom - arrowTop - 4.dp.toPx()),
                    )

                    // Arrow head (V shape)
                    val headSize = size.width * 0.3f
                    val headTipY = arrowBottom + bounceOffset
                    val headTopY = headTipY - headSize * 0.7f
                    val arrowPath = Path().apply {
                        moveTo(arrowCenterX, headTipY)
                        lineTo(arrowCenterX - headSize, headTopY)
                        lineTo(arrowCenterX + headSize, headTopY)
                        close()
                    }
                    drawPath(arrowPath, color)
                },
            contentAlignment = Alignment.Center,
        ) { }

        Spacer(modifier = Modifier.height(3.dp))

        Text(
            "Download",
            fontSize = 11.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = if (selected) goldColor else CineVaultTheme.colors.textSecondary,
        )
    }
}

// ── WATCHLIST NAV ITEM ──

@Composable
private fun WatchlistNavItem(selected: Boolean, goldColor: Color) {
    val iconScale by animateFloatAsState(
        targetValue = if (selected) 1.2f else 1f,
        animationSpec = spring(dampingRatio = 0.4f, stiffness = 300f),
        label = "wlScale"
    )
    val glowAlpha by animateFloatAsState(
        targetValue = if (selected) 0.4f else 0f,
        animationSpec = tween(400),
        label = "wlGlow"
    )

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(vertical = 2.dp),
    ) {
        Spacer(modifier = Modifier.height(10.dp))

        Box(contentAlignment = Alignment.Center) {
            // Glow behind icon
            if (glowAlpha > 0f) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(18.dp))
                        .background(goldColor.copy(alpha = glowAlpha * 0.3f))
                )
            }
            Icon(
                Icons.Outlined.BookmarkBorder,
                contentDescription = "Watchlist",
                tint = if (selected) goldColor else CineVaultTheme.colors.textSecondary,
                modifier = Modifier
                    .size(26.dp)
                    .graphicsLayer {
                        scaleX = iconScale
                        scaleY = iconScale
                    }
            )
        }

        Spacer(modifier = Modifier.height(3.dp))

        Text(
            "Watchlist",
            fontSize = 11.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = if (selected) goldColor else CineVaultTheme.colors.textSecondary,
        )
    }
}

// ── ME NAV ITEM: 😎 Emoji with animation ──

@Composable
private fun MeNavItem(selected: Boolean, goldColor: Color) {
    val iconScale by animateFloatAsState(
        targetValue = if (selected) 1.25f else 1f,
        animationSpec = spring(dampingRatio = 0.35f, stiffness = 350f),
        label = "meScale"
    )
    val rotation by animateFloatAsState(
        targetValue = if (selected) 360f else 0f,
        animationSpec = tween(500, easing = FastOutSlowInEasing),
        label = "meRotate"
    )
    val bounceY by animateFloatAsState(
        targetValue = if (selected) -6f else 0f,
        animationSpec = spring(dampingRatio = 0.3f, stiffness = 400f),
        label = "meBounce"
    )

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(vertical = 2.dp),
    ) {
        Spacer(modifier = Modifier.height(10.dp))

        Text(
            text = "😎",
            fontSize = 24.sp,
            modifier = Modifier
                .graphicsLayer {
                    scaleX = iconScale
                    scaleY = iconScale
                    translationY = bounceY
                    rotationZ = rotation
                },
            textAlign = TextAlign.Center,
        )

        Spacer(modifier = Modifier.height(3.dp))

        Text(
            "Me",
            fontSize = 11.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = if (selected) goldColor else CineVaultTheme.colors.textSecondary,
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
