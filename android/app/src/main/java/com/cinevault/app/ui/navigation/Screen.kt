package com.cinevault.app.ui.navigation

sealed class Screen(val route: String) {
    data object Splash : Screen("splash")
    data object Onboarding : Screen("onboarding")
    data object Login : Screen("login")
    data object Register : Screen("register")
    data object ForgotPassword : Screen("forgot_password")
    data object PhoneAuth : Screen("phone_auth")
    data object ProfileSelector : Screen("profile_selector")
    data object Home : Screen("home")
    data object Find : Screen("find")
    data object Search : Screen("search")
    data object TvTab : Screen("tv_tab")
    data object Watchlist : Screen("watchlist")
    data object Me : Screen("me")
    data object Notifications : Screen("notifications")
    data object Downloads : Screen("downloads")
    data object Ranking : Screen("ranking")
    data object WatchHistory : Screen("watch_history")
    data object Settings : Screen("settings")
    data object ChangePassword : Screen("change_password")
    data object AccountSettings : Screen("account_settings")
    data object PrivacySecurity : Screen("privacy_security")
    data object PlaybackQuality : Screen("playback_quality")
    data object AboutCineVault : Screen("about_cinevault")
    data object PrivacyPolicy : Screen("privacy_policy")
    data object TermsOfService : Screen("terms_of_service")

    data object SectionDetail : Screen("section/{sectionId}") {
        fun createRoute(sectionId: String) = "section/$sectionId"
    }

    data object MovieDetail : Screen("movie/{movieId}") {
        fun createRoute(movieId: String) = "movie/$movieId"
    }

    data object Player : Screen("player/{contentId}?episodeId={episodeId}") {
        fun createRoute(contentId: String, episodeId: String? = null): String {
            return if (episodeId != null) "player/$contentId?episodeId=$episodeId"
            else "player/$contentId"
        }
    }
}
