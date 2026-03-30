package com.cinevault.app.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountSettingsScreen(
    onBack: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var showEditName by remember { mutableStateOf(false) }
    var newName by remember { mutableStateOf(uiState.userName) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CineVaultTheme.colors.background),
    ) {
        TopAppBar(
            title = { Text("Account Settings", style = CineVaultTheme.typography.sectionTitle, color = CineVaultTheme.colors.textPrimary) },
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

            // Profile Avatar
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Surface(
                    shape = CircleShape,
                    color = CineVaultTheme.colors.accentGold.copy(alpha = 0.15f),
                    modifier = Modifier.size(80.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            uiState.userName.take(1).uppercase(),
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Bold,
                            color = CineVaultTheme.colors.accentGold,
                        )
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            // Name
            Surface(shape = RoundedCornerShape(14.dp), color = CineVaultTheme.colors.surface, modifier = Modifier.fillMaxWidth()) {
                Column {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { showEditName = true }
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Default.Person, contentDescription = null, tint = CineVaultTheme.colors.accentGold, modifier = Modifier.size(24.dp))
                        Spacer(Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Name", fontSize = 12.sp, color = CineVaultTheme.colors.textSecondary)
                            Spacer(Modifier.height(2.dp))
                            Text(uiState.userName.ifBlank { "Not set" }, fontSize = 16.sp, color = CineVaultTheme.colors.textPrimary)
                        }
                        Icon(Icons.Default.Edit, contentDescription = null, tint = CineVaultTheme.colors.textSecondary, modifier = Modifier.size(18.dp))
                    }
                    HorizontalDivider(color = CineVaultTheme.colors.border.copy(alpha = 0.3f), modifier = Modifier.padding(start = 54.dp))

                    // Email (read only)
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Default.Email, contentDescription = null, tint = CineVaultTheme.colors.accentGold, modifier = Modifier.size(24.dp))
                        Spacer(Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Email", fontSize = 12.sp, color = CineVaultTheme.colors.textSecondary)
                            Spacer(Modifier.height(2.dp))
                            Text(uiState.userEmail, fontSize = 16.sp, color = CineVaultTheme.colors.textPrimary)
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // Account Info
            Surface(shape = RoundedCornerShape(14.dp), color = CineVaultTheme.colors.surface, modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Default.Info, contentDescription = null, tint = CineVaultTheme.colors.accentGold, modifier = Modifier.size(24.dp))
                    Spacer(Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Account Type", fontSize = 12.sp, color = CineVaultTheme.colors.textSecondary)
                        Spacer(Modifier.height(2.dp))
                        Text("Standard", fontSize = 16.sp, color = CineVaultTheme.colors.textPrimary)
                    }
                }
            }
        }
    }

    if (showEditName) {
        AlertDialog(
            onDismissRequest = { showEditName = false },
            title = { Text("Edit Name", color = CineVaultTheme.colors.textPrimary) },
            text = {
                OutlinedTextField(
                    value = newName,
                    onValueChange = { newName = it },
                    label = { Text("Name", color = CineVaultTheme.colors.textSecondary) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = CineVaultTheme.colors.accentGold,
                        unfocusedBorderColor = CineVaultTheme.colors.border,
                        focusedTextColor = CineVaultTheme.colors.textPrimary,
                        unfocusedTextColor = CineVaultTheme.colors.textPrimary,
                        cursorColor = CineVaultTheme.colors.accentGold,
                    ),
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.updateName(newName)
                    showEditName = false
                }) { Text("Save", color = CineVaultTheme.colors.accentGold) }
            },
            dismissButton = {
                TextButton(onClick = { showEditName = false }) { Text("Cancel", color = CineVaultTheme.colors.textSecondary) }
            },
            containerColor = CineVaultTheme.colors.surface,
        )
    }
}
