package com.cinevault.app.ui.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.cinevault.app.ui.screen.*
import com.cinevault.app.ui.theme.CineVaultTheme

data class BottomNavItem(val label: String, val icon: ImageVector, val route: String)

val bottomNavItems = listOf(
    BottomNavItem("Home", Icons.Filled.Home, Screen.Home.route),
    BottomNavItem("Downloads", Icons.Filled.Download, Screen.Downloads.route),
    BottomNavItem("Watchlist", Icons.Outlined.BookmarkBorder, Screen.Watchlist.route),
    BottomNavItem("Me", Icons.Filled.Person, Screen.Me.route),
)

@Composable
fun CineVaultNavHost(navController: NavHostController = rememberNavController()) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val showBottomBar = currentRoute in bottomNavItems.map { it.route }

    Scaffold(
        containerColor = CineVaultTheme.colors.background,
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    containerColor = CineVaultTheme.colors.surface.copy(alpha = 0.95f),
                    contentColor = CineVaultTheme.colors.textPrimary,
                ) {
                    bottomNavItems.forEach { item ->
                        val selected = navBackStackEntry?.destination?.hierarchy?.any { it.route == item.route } == true
                        NavigationBarItem(
                            icon = { Icon(item.icon, contentDescription = item.label) },
                            label = { Text(item.label, style = CineVaultTheme.typography.label) },
                            selected = selected,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = CineVaultTheme.colors.accentGold,
                                selectedTextColor = CineVaultTheme.colors.accentGold,
                                unselectedIconColor = CineVaultTheme.colors.textSecondary,
                                unselectedTextColor = CineVaultTheme.colors.textSecondary,
                                indicatorColor = CineVaultTheme.colors.accentGold.copy(alpha = 0.12f),
                            ),
                        )
                    }
                }
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
}
