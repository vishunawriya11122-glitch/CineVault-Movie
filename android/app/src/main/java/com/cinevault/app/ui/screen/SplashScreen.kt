package com.cinevault.app.ui.screen

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.cinevault.app.ui.theme.CineVaultTheme
import com.cinevault.app.ui.viewmodel.AuthViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.firstOrNull

@Composable
fun SplashScreen(
    onNavigateToOnboarding: () -> Unit,
    onNavigateToHome: () -> Unit,
    onNavigateToLogin: () -> Unit = onNavigateToHome,
    viewModel: AuthViewModel = hiltViewModel(),
) {
    var logoAlpha by remember { mutableFloatStateOf(0f) }
    var taglineAlpha by remember { mutableFloatStateOf(0f) }

    val alphaAnim by animateFloatAsState(
        targetValue = logoAlpha,
        animationSpec = tween(durationMillis = 1200, easing = EaseOutCubic),
        label = "logo_alpha",
    )
    val taglineAnim by animateFloatAsState(
        targetValue = taglineAlpha,
        animationSpec = tween(durationMillis = 800, easing = EaseOutCubic),
        label = "tagline_alpha",
    )

    LaunchedEffect(Unit) {
        logoAlpha = 1f
        delay(600)
        taglineAlpha = 1f
        delay(1400)

        val hasOnboarded = viewModel.hasCompletedOnboarding.firstOrNull() ?: false

        when {
            !hasOnboarded -> onNavigateToOnboarding()
            else -> onNavigateToHome()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(CineVaultTheme.colors.background),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "VELORA",
                modifier = Modifier.alpha(alphaAnim),
                style = CineVaultTheme.typography.heroTitle.copy(
                    fontSize = 42.sp,
                    letterSpacing = 8.sp,
                ),
                color = CineVaultTheme.colors.accentGold,
            )
            Spacer(Modifier.height(12.dp))
            Text(
                text = "Premium Streaming Experience",
                modifier = Modifier.alpha(taglineAnim),
                style = CineVaultTheme.typography.body,
                color = CineVaultTheme.colors.textSecondary,
            )
        }
    }
}
