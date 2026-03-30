package com.cinevault.app.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cinevault.app.ui.theme.CineVaultTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AboutCineVaultScreen(
    onBack: () -> Unit,
    onPrivacyPolicy: () -> Unit,
    onTermsOfService: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CineVaultTheme.colors.background),
    ) {
        TopAppBar(
            title = { Text("About CineVault", style = CineVaultTheme.typography.sectionTitle, color = CineVaultTheme.colors.textPrimary) },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = CineVaultTheme.colors.textPrimary)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = CineVaultTheme.colors.background),
        )

        Column(modifier = Modifier.padding(horizontal = 20.dp)) {
            Spacer(Modifier.height(24.dp))

            // App logo + name
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = CineVaultTheme.colors.accentGold.copy(alpha = 0.12f),
                        modifier = Modifier.size(72.dp),
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Movie, contentDescription = null, tint = CineVaultTheme.colors.accentGold, modifier = Modifier.size(36.dp))
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    Text("CineVault", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = CineVaultTheme.colors.textPrimary)
                    Text("Version 1.0.0", fontSize = 13.sp, color = CineVaultTheme.colors.textSecondary)
                }
            }

            Spacer(Modifier.height(32.dp))

            Surface(shape = RoundedCornerShape(14.dp), color = CineVaultTheme.colors.surface, modifier = Modifier.fillMaxWidth()) {
                Column {
                    AboutItem(icon = Icons.Default.Description, label = "Privacy Policy", onClick = onPrivacyPolicy)
                    HorizontalDivider(color = CineVaultTheme.colors.border.copy(alpha = 0.3f), modifier = Modifier.padding(start = 54.dp))
                    AboutItem(icon = Icons.Default.Gavel, label = "Terms of Service", onClick = onTermsOfService)
                }
            }

            Spacer(Modifier.height(16.dp))

            Surface(shape = RoundedCornerShape(14.dp), color = CineVaultTheme.colors.surface, modifier = Modifier.fillMaxWidth()) {
                Column {
                    AboutItem(icon = Icons.Default.Email, label = "Contact Us", subtitle = "cinevaultapp@gmail.com")
                    HorizontalDivider(color = CineVaultTheme.colors.border.copy(alpha = 0.3f), modifier = Modifier.padding(start = 54.dp))
                    AboutItem(icon = Icons.Default.Code, label = "Developer", subtitle = "CineVault Team")
                }
            }

            Spacer(Modifier.height(32.dp))

            Text(
                "\u00a9 2025 CineVault. All rights reserved.",
                fontSize = 12.sp,
                color = CineVaultTheme.colors.textSecondary,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun AboutItem(
    icon: ImageVector,
    label: String,
    subtitle: String? = null,
    onClick: (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = CineVaultTheme.colors.accentGold, modifier = Modifier.size(24.dp))
        Spacer(Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(label, fontSize = 15.sp, color = CineVaultTheme.colors.textPrimary)
            if (subtitle != null) {
                Text(subtitle, fontSize = 12.sp, color = CineVaultTheme.colors.textSecondary)
            }
        }
        if (onClick != null) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = CineVaultTheme.colors.textSecondary, modifier = Modifier.size(20.dp))
        }
    }
}
