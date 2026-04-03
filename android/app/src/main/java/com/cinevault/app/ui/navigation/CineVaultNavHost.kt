package com.cinevault.app.ui.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
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
import com.cinevault.app.R
import com.cinevault.app.ui.components.UpdateDialog
import com.cinevault.app.ui.screen.*
import com.cinevault.app.ui.theme.CineVaultTheme
import com.cinevault.app.ui.viewmodel.AppViewModel
import com.cinevault.app.ui.viewmodel.AuthViewModel

data class BottomNavItem(val label: String, val icon: ImageVector, val route: String)

val bottomNavItems = listOf(
    BottomNavItem("Home", Icons.Filled.Home, Screen.Home.route),
    BottomNavItem("Find", Icons.Filled.Search, Screen.Find.route),
    BottomNavItem("Download", Icons.Filled.Download, Screen.Downloads.route),
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
                        Screen.Find.route -> FindNavItem(selected = selected, goldColor = goldColor, goldLight = goldLight)
                        Screen.Downloads.route -> DownloadNavItem(selected = selected, goldColor = goldColor, goldLight = goldLight, goldMuted = goldMuted)
                        Screen.Me.route -> MeNavItem(selected = selected, goldColor = goldColor)
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// HOME: PNG icon — bounce up + spring scale + gold tint
// ═══════════════════════════════════════════════════════════════

@Composable
private fun HomeNavItem(selected: Boolean, goldColor: Color, goldLight: Color, goldMuted: Color) {
    val iconScale by animateFloatAsState(
        targetValue = if (selected) 1.18f else 1f,
        animationSpec = spring(dampingRatio = 0.35f, stiffness = 350f),
        label = "homeScale",
    )
    val bounceY by animateFloatAsState(
        targetValue = if (selected) -5f else 0f,
        animationSpec = spring(dampingRatio = 0.3f, stiffness = 400f),
        label = "homeBounce",
    )
    val iconAlpha by animateFloatAsState(
        targetValue = if (selected) 1f else 0.5f,
        animationSpec = tween(300),
        label = "homeAlpha",
    )
    val glowAlpha by animateFloatAsState(
        targetValue = if (selected) 0.35f else 0f,
        animationSpec = tween(400),
        label = "homeGlow",
    )

    val gray = Color(0xFF808080)

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(vertical = 2.dp),
    ) {
        Box(contentAlignment = Alignment.Center) {
            if (glowAlpha > 0f) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .graphicsLayer { alpha = glowAlpha }
                        .background(
                            Brush.radialGradient(
                                colors = listOf(goldColor.copy(alpha = 0.3f), Color.Transparent),
                            ),
                            shape = androidx.compose.foundation.shape.CircleShape,
                        ),
                )
            }
            Image(
                painter = painterResource(id = R.drawable.ic_nav_home),
                contentDescription = "Home",
                modifier = Modifier
                    .size(26.dp)
                    .graphicsLayer {
                        scaleX = iconScale
                        scaleY = iconScale
                        translationY = bounceY
                        alpha = iconAlpha
                    },
                colorFilter = ColorFilter.tint(if (selected) goldColor else gray),
            )
        }

        Spacer(modifier = Modifier.height(2.dp))

        Text(
            "Home",
            fontSize = 9.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = if (selected) goldColor else gray,
        )
    }
}

// ═══════════════════════════════════════════════════════════════
// FIND: PNG icon — spin + scale + glow pulse
// ═══════════════════════════════════════════════════════════════

@Composable
private fun FindNavItem(selected: Boolean, goldColor: Color, goldLight: Color) {
    val iconScale by animateFloatAsState(
        targetValue = if (selected) 1.2f else 1f,
        animationSpec = spring(dampingRatio = 0.35f, stiffness = 350f),
        label = "findScale",
    )
    val rotation by animateFloatAsState(
        targetValue = if (selected) 360f else 0f,
        animationSpec = tween(500, easing = FastOutSlowInEasing),
        label = "findRotate",
    )
    val bounceY by animateFloatAsState(
        targetValue = if (selected) -5f else 0f,
        animationSpec = spring(dampingRatio = 0.3f, stiffness = 400f),
        label = "findBounce",
    )
    val iconAlpha by animateFloatAsState(
        targetValue = if (selected) 1f else 0.5f,
        animationSpec = tween(300),
        label = "findAlpha",
    )
    val glowAlpha by animateFloatAsState(
        targetValue = if (selected) 0.35f else 0f,
        animationSpec = tween(400),
        label = "findGlow",
    )

    val gray = Color(0xFF808080)

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(vertical = 2.dp),
    ) {
        Box(contentAlignment = Alignment.Center) {
            if (glowAlpha > 0f) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .graphicsLayer { alpha = glowAlpha }
                        .background(
                            Brush.radialGradient(
                                colors = listOf(goldColor.copy(alpha = 0.3f), Color.Transparent),
                            ),
                            shape = androidx.compose.foundation.shape.CircleShape,
                        ),
                )
            }
            Image(
                painter = painterResource(id = R.drawable.ic_nav_find),
                contentDescription = "Find",
                modifier = Modifier
                    .size(26.dp)
                    .graphicsLayer {
                        scaleX = iconScale
                        scaleY = iconScale
                        translationY = bounceY
                        rotationZ = rotation
                        alpha = iconAlpha
                    },
                colorFilter = ColorFilter.tint(if (selected) goldColor else gray),
            )
        }

        Spacer(modifier = Modifier.height(2.dp))

        Text(
            "Find",
            fontSize = 9.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = if (selected) goldColor else gray,
        )
    }
}

// ═══════════════════════════════════════════════════════════════
// DOWNLOAD: PNG icon — arrow drop bounce keyframe + scale
// ═══════════════════════════════════════════════════════════════

@Composable
private fun DownloadNavItem(selected: Boolean, goldColor: Color, goldLight: Color, goldMuted: Color) {
    val dropBounce = remember { Animatable(0f) }
    LaunchedEffect(selected) {
        if (selected) {
            dropBounce.snapTo(-8f)
            dropBounce.animateTo(
                targetValue = 0f,
                animationSpec = keyframes {
                    durationMillis = 800
                    -8f at 0 using FastOutSlowInEasing
                    6f at 200 using FastOutSlowInEasing
                    -3f at 400 using FastOutSlowInEasing
                    2f at 580 using FastOutSlowInEasing
                    0f at 800 using FastOutSlowInEasing
                },
            )
        } else {
            dropBounce.snapTo(0f)
        }
    }
    val iconScale by animateFloatAsState(
        targetValue = if (selected) 1.15f else 1f,
        animationSpec = spring(dampingRatio = 0.4f, stiffness = 300f),
        label = "dlScale",
    )
    val iconAlpha by animateFloatAsState(
        targetValue = if (selected) 1f else 0.5f,
        animationSpec = tween(300),
        label = "dlAlpha",
    )
    val glowAlpha by animateFloatAsState(
        targetValue = if (selected) 0.3f else 0f,
        animationSpec = tween(400),
        label = "dlGlow",
    )

    val gray = Color(0xFF808080)

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(vertical = 2.dp),
    ) {
        Box(contentAlignment = Alignment.Center) {
            if (glowAlpha > 0f) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .graphicsLayer { alpha = glowAlpha }
                        .background(
                            Brush.radialGradient(
                                colors = listOf(goldColor.copy(alpha = 0.25f), Color.Transparent),
                            ),
                            shape = androidx.compose.foundation.shape.CircleShape,
                        ),
                )
            }
            Image(
                painter = painterResource(id = R.drawable.ic_nav_download),
                contentDescription = "Download",
                modifier = Modifier
                    .size(26.dp)
                    .graphicsLayer {
                        scaleX = iconScale
                        scaleY = iconScale
                        translationY = dropBounce.value
                        alpha = iconAlpha
                    },
                colorFilter = ColorFilter.tint(if (selected) goldColor else gray),
            )
        }

        Spacer(modifier = Modifier.height(2.dp))

        Text(
            "Download",
            fontSize = 9.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = if (selected) goldColor else gray,
        )
    }
}

// ═══════════════════════════════════════════════════════════════
// ME: PNG icon — spin + bounce + scale
// ═══════════════════════════════════════════════════════════════

@Composable
private fun MeNavItem(selected: Boolean, goldColor: Color) {
    val iconScale by animateFloatAsState(
        targetValue = if (selected) 1.2f else 1f,
        animationSpec = spring(dampingRatio = 0.35f, stiffness = 350f),
        label = "meScale",
    )
    val rotation by animateFloatAsState(
        targetValue = if (selected) 360f else 0f,
        animationSpec = tween(500, easing = FastOutSlowInEasing),
        label = "meRotate",
    )
    val bounceY by animateFloatAsState(
        targetValue = if (selected) -5f else 0f,
        animationSpec = spring(dampingRatio = 0.3f, stiffness = 400f),
        label = "meBounce",
    )
    val iconAlpha by animateFloatAsState(
        targetValue = if (selected) 1f else 0.5f,
        animationSpec = tween(300),
        label = "meAlpha",
    )

    val gray = Color(0xFF808080)

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(vertical = 2.dp),
    ) {
        Image(
            painter = painterResource(id = R.drawable.ic_nav_me),
            contentDescription = "Me",
            modifier = Modifier
                .size(26.dp)
                .graphicsLayer {
                    scaleX = iconScale
                    scaleY = iconScale
                    translationY = bounceY
                    rotationZ = rotation
                    alpha = iconAlpha
                },
            colorFilter = ColorFilter.tint(if (selected) goldColor else gray),
        )

        Spacer(modifier = Modifier.height(2.dp))

        Text(
            "Me",
            fontSize = 9.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = if (selected) goldColor else gray,
        )
    }
}

@Composable
fun CineVaultNavHost(navController: NavHostController = rememberNavController()) {
    val appViewModel: AppViewModel = hiltViewModel()
    val authViewModel: AuthViewModel = hiltViewModel()
    val updateInfo by appViewModel.updateInfo.collectAsState()

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val showBottomBar = currentRoute in bottomNavItems.map { it.route }

    // Auth state
    val isLoggedIn by authViewModel.isLoggedIn.collectAsState(initial = null)
    var showAuthSheet by remember { mutableStateOf(false) }
    var pendingAuthAction by remember { mutableStateOf<(() -> Unit)?>(null) }
    var hasShownAutoPopup by remember { mutableStateOf(false) }

    // Auto-show login popup on first Home visit when not logged in
    LaunchedEffect(isLoggedIn, currentRoute) {
        if (isLoggedIn == false && currentRoute == Screen.Home.route && !hasShownAutoPopup) {
            kotlinx.coroutines.delay(600)
            showAuthSheet = true
            hasShownAutoPopup = true
        }
    }

    // Reset auto-popup flag when user logs in and out again
    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn == true) hasShownAutoPopup = false
    }

    // Auth gate: wraps an action, shows login if needed
    val requireAuth: (() -> Unit) -> Unit = { action ->
        if (isLoggedIn == true) {
            action()
        } else {
            pendingAuthAction = action
            showAuthSheet = true
        }
    }

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
                        navController.navigate(Screen.Home.route) {
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
                    onNavigateToPhoneAuth = { navController.navigate(Screen.PhoneAuth.route) },
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
                    onNavigateToPhoneAuth = { navController.navigate(Screen.PhoneAuth.route) },
                )
            }

            composable(Screen.ForgotPassword.route) {
                ForgotPasswordScreen(
                    onBack = { navController.popBackStack() },
                )
            }

            composable(Screen.PhoneAuth.route) {
                PhoneAuthScreen(
                    onSuccess = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    onNavigateBack = { navController.popBackStack() },
                )
            }

            composable(Screen.Home.route) {
                HomeScreen(
                    onMovieClick = { movieId -> navController.navigate(Screen.MovieDetail.createRoute(movieId)) },
                    onPlayClick = { contentId ->
                        requireAuth { navController.navigate(Screen.Player.createRoute(contentId, null)) }
                    },
                    onSearchClick = { navController.navigate(Screen.Find.route) },
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

            composable(Screen.Find.route) {
                com.cinevault.app.ui.screen.FindScreen(
                    onMovieClick = { movieId -> navController.navigate(Screen.MovieDetail.createRoute(movieId)) },
                    onRankingClick = { navController.navigate(Screen.Ranking.route) },
                )
            }

            composable(Screen.Ranking.route) {
                com.cinevault.app.ui.screen.RankingScreen(
                    onBack = { navController.popBackStack() },
                    onMovieClick = { movieId -> navController.navigate(Screen.MovieDetail.createRoute(movieId)) },
                )
            }

            composable(Screen.Watchlist.route) {
                if (isLoggedIn == true) {
                    WatchlistScreen(
                        onMovieClick = { movieId -> navController.navigate(Screen.MovieDetail.createRoute(movieId)) },
                    )
                } else {
                    // Show empty state prompting login
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Login Required", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "Please login to view your watchlist",
                                color = Color(0xFF888888),
                                fontSize = 14.sp,
                            )
                            Spacer(Modifier.height(16.dp))
                            TextButton(onClick = { showAuthSheet = true }) {
                                Text("Login", color = CineVaultTheme.colors.accentGold, fontSize = 16.sp)
                            }
                        }
                    }
                }
            }

            composable(Screen.Me.route) {
                if (isLoggedIn == true) {
                    MeScreen(
                        onNavigateToNotifications = { navController.navigate(Screen.Notifications.route) },
                        onNavigateToSettings = { navController.navigate(Screen.Settings.route) },
                        onMovieClick = { movieId -> navController.navigate(Screen.MovieDetail.createRoute(movieId)) },
                        onHistoryItemClick = { contentId, episodeId ->
                            navController.navigate(Screen.MovieDetail.createRoute(contentId))
                            navController.navigate(Screen.Player.createRoute(contentId, episodeId))
                        },
                    )
                } else {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Login Required", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "Please login to view your profile",
                                color = Color(0xFF888888),
                                fontSize = 14.sp,
                            )
                            Spacer(Modifier.height(16.dp))
                            TextButton(onClick = { showAuthSheet = true }) {
                                Text("Login", color = CineVaultTheme.colors.accentGold, fontSize = 16.sp)
                            }
                        }
                    }
                }
            }

            composable(Screen.Settings.route) {
                SettingsScreen(
                    onBack = { navController.popBackStack() },
                    onLogout = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    onNavigateToNotifications = { navController.navigate(Screen.Notifications.route) },
                    onNavigateToWatchHistory = { navController.navigate(Screen.WatchHistory.route) },
                    onNavigateToAccountSettings = { navController.navigate(Screen.AccountSettings.route) },
                    onNavigateToPrivacySecurity = { navController.navigate(Screen.PrivacySecurity.route) },
                    onNavigateToChangePassword = { navController.navigate(Screen.ChangePassword.route) },
                    onNavigateToPlaybackQuality = { navController.navigate(Screen.PlaybackQuality.route) },
                    onNavigateToAbout = { navController.navigate(Screen.AboutCineVault.route) },
                    onNavigateToPrivacyPolicy = { navController.navigate(Screen.PrivacyPolicy.route) },
                    onNavigateToTerms = { navController.navigate(Screen.TermsOfService.route) },
                )
            }

            composable(Screen.ChangePassword.route) {
                ChangePasswordScreen(onBack = { navController.popBackStack() })
            }

            composable(Screen.AccountSettings.route) {
                AccountSettingsScreen(onBack = { navController.popBackStack() })
            }

            composable(Screen.PrivacySecurity.route) {
                PrivacySecurityScreen(
                    onBack = { navController.popBackStack() },
                    onNavigateToLogin = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                )
            }

            composable(Screen.PlaybackQuality.route) {
                PlaybackQualityScreen(onBack = { navController.popBackStack() })
            }

            composable(Screen.AboutCineVault.route) {
                AboutCineVaultScreen(
                    onBack = { navController.popBackStack() },
                    onPrivacyPolicy = { navController.navigate(Screen.PrivacyPolicy.route) },
                    onTermsOfService = { navController.navigate(Screen.TermsOfService.route) },
                )
            }

            composable(Screen.PrivacyPolicy.route) {
                PrivacyPolicyScreen(onBack = { navController.popBackStack() })
            }

            composable(Screen.TermsOfService.route) {
                TermsOfServiceScreen(onBack = { navController.popBackStack() })
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
                        requireAuth { navController.navigate(Screen.Player.createRoute(contentId, episodeId)) }
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

    // Auth bottom sheet overlay
    if (showAuthSheet) {
        AuthBottomSheet(
            onDismiss = {
                showAuthSheet = false
                pendingAuthAction = null
            },
            onLoginSuccess = {
                showAuthSheet = false
                // Execute pending auth action if any
                pendingAuthAction?.invoke()
                pendingAuthAction = null
            },
        )
    }

    // Show update dialog on top of everything when an update is available
    updateInfo?.let { info ->
        UpdateDialog(
            info = info,
            onDismiss = { appViewModel.dismissUpdate() }
        )
    }
}
