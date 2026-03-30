package com.cinevault.app.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.cinevault.app.ui.theme.CineVaultTheme
import com.cinevault.app.ui.viewmodel.SettingsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrivacySecurityScreen(
    onBack: () -> Unit,
    onNavigateToLogin: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showLogoutAllDialog by remember { mutableStateOf(false) }

    LaunchedEffect(uiState.deleteAccountSuccess) {
        if (uiState.deleteAccountSuccess) {
            onNavigateToLogin()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CineVaultTheme.colors.background),
    ) {
        TopAppBar(
            title = { Text("Privacy & Security", style = CineVaultTheme.typography.sectionTitle, color = CineVaultTheme.colors.textPrimary) },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = CineVaultTheme.colors.textPrimary)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = CineVaultTheme.colors.background),
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
        ) {
            Spacer(Modifier.height(16.dp))

            // Session Management
            Text("SESSION", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = CineVaultTheme.colors.textSecondary, letterSpacing = 1.sp)
            Spacer(Modifier.height(8.dp))

            Surface(shape = RoundedCornerShape(14.dp), color = CineVaultTheme.colors.surface, modifier = Modifier.fillMaxWidth()) {
                Column {
                    // Log out all devices
                    TextButton(
                        onClick = { showLogoutAllDialog = true },
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
                        contentPadding = PaddingValues(16.dp),
                    ) {
                        Icon(Icons.Default.PhonelinkErase, contentDescription = null, tint = CineVaultTheme.colors.accentGold, modifier = Modifier.size(24.dp))
                        Spacer(Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Log Out All Devices", fontSize = 15.sp, color = CineVaultTheme.colors.textPrimary, fontWeight = FontWeight.Medium)
                            Spacer(Modifier.height(2.dp))
                            Text("Sign out from all devices except this one", fontSize = 12.sp, color = CineVaultTheme.colors.textSecondary)
                        }
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            // Danger Zone
            Text("DANGER ZONE", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFFFF4444), letterSpacing = 1.sp)
            Spacer(Modifier.height(8.dp))

            Surface(shape = RoundedCornerShape(14.dp), color = Color(0xFFFF4444).copy(alpha = 0.06f), modifier = Modifier.fillMaxWidth()) {
                TextButton(
                    onClick = { showDeleteDialog = true },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
                    contentPadding = PaddingValues(16.dp),
                    enabled = !uiState.isLoading,
                ) {
                    Icon(Icons.Default.DeleteForever, contentDescription = null, tint = Color(0xFFFF4444), modifier = Modifier.size(24.dp))
                    Spacer(Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Delete Account", fontSize = 15.sp, color = Color(0xFFFF4444), fontWeight = FontWeight.Medium)
                        Spacer(Modifier.height(2.dp))
                        Text("Permanently delete your account and all data", fontSize = 12.sp, color = CineVaultTheme.colors.textSecondary)
                    }
                    if (uiState.isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = Color(0xFFFF4444))
                    }
                }
            }

            uiState.error?.let {
                Spacer(Modifier.height(12.dp))
                Text(it, color = Color(0xFFFF4444), fontSize = 13.sp)
            }
        }
    }

    // Log Out All Devices dialog
    if (showLogoutAllDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutAllDialog = false },
            title = { Text("Log Out All Devices", color = CineVaultTheme.colors.textPrimary) },
            text = { Text("This will sign you out from all other devices. You will remain logged in on this device.", color = CineVaultTheme.colors.textSecondary) },
            confirmButton = {
                TextButton(onClick = {
                    showLogoutAllDialog = false
                    // TODO: implement logoutAll when backend supports it
                }) { Text("Log Out All", color = CineVaultTheme.colors.accentGold) }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutAllDialog = false }) { Text("Cancel", color = CineVaultTheme.colors.textSecondary) }
            },
            containerColor = CineVaultTheme.colors.surface,
        )
    }

    // Delete Account dialog
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete Account?", color = Color(0xFFFF4444)) },
            text = { Text("This action is permanent and cannot be undone. All your data, watch history, and saved content will be permanently deleted.", color = CineVaultTheme.colors.textSecondary) },
            confirmButton = {
                TextButton(onClick = {
                    showDeleteDialog = false
                    viewModel.deleteAccount()
                }) { Text("Delete Account", color = Color(0xFFFF4444), fontWeight = FontWeight.Bold) }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text("Cancel", color = CineVaultTheme.colors.textSecondary) }
            },
            containerColor = CineVaultTheme.colors.surface,
        )
    }
}
