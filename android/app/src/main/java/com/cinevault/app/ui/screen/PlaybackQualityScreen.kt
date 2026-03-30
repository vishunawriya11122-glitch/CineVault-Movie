package com.cinevault.app.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.cinevault.app.ui.theme.CineVaultTheme
import com.cinevault.app.ui.viewmodel.SettingsViewModel

private val QUALITY_OPTIONS = listOf("Auto", "1080p", "720p", "480p", "360p")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlaybackQualityScreen(
    onBack: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CineVaultTheme.colors.background),
    ) {
        TopAppBar(
            title = { Text("Playback Quality", style = CineVaultTheme.typography.sectionTitle, color = CineVaultTheme.colors.textPrimary) },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = CineVaultTheme.colors.textPrimary)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = CineVaultTheme.colors.background),
        )

        Column(modifier = Modifier.padding(horizontal = 20.dp)) {
            Spacer(Modifier.height(16.dp))

            Text(
                "Select the default video playback quality. \"Auto\" adjusts quality based on your internet speed.",
                fontSize = 13.sp,
                color = CineVaultTheme.colors.textSecondary,
                lineHeight = 18.sp,
            )

            Spacer(Modifier.height(20.dp))

            Surface(shape = RoundedCornerShape(14.dp), color = CineVaultTheme.colors.surface, modifier = Modifier.fillMaxWidth()) {
                Column {
                    QUALITY_OPTIONS.forEachIndexed { index, quality ->
                        val isSelected = uiState.playbackQuality == quality
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { viewModel.setPlaybackQuality(quality) }
                                .padding(horizontal = 16.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    quality,
                                    fontSize = 16.sp,
                                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                    color = if (isSelected) CineVaultTheme.colors.accentGold else CineVaultTheme.colors.textPrimary,
                                )
                                if (quality == "Auto") {
                                    Text("Recommended", fontSize = 12.sp, color = CineVaultTheme.colors.textSecondary)
                                }
                            }
                            if (isSelected) {
                                Icon(Icons.Default.Check, contentDescription = null, tint = CineVaultTheme.colors.accentGold, modifier = Modifier.size(22.dp))
                            }
                        }
                        if (index < QUALITY_OPTIONS.lastIndex) {
                            HorizontalDivider(color = CineVaultTheme.colors.border.copy(alpha = 0.3f), modifier = Modifier.padding(start = 16.dp))
                        }
                    }
                }
            }
        }
    }
}
