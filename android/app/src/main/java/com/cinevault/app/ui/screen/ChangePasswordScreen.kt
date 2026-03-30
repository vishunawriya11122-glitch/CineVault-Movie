package com.cinevault.app.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.cinevault.app.ui.theme.CineVaultTheme
import com.cinevault.app.ui.viewmodel.SettingsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChangePasswordScreen(
    onBack: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current

    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var showCurrent by remember { mutableStateOf(false) }
    var showNew by remember { mutableStateOf(false) }
    var showConfirm by remember { mutableStateOf(false) }

    LaunchedEffect(uiState.changePasswordSuccess) {
        if (uiState.changePasswordSuccess) {
            kotlinx.coroutines.delay(1500)
            onBack()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CineVaultTheme.colors.background),
    ) {
        TopAppBar(
            title = { Text("Change Password", style = CineVaultTheme.typography.sectionTitle, color = CineVaultTheme.colors.textPrimary) },
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
                .padding(horizontal = 24.dp),
        ) {
            Spacer(Modifier.height(16.dp))

            if (uiState.changePasswordSuccess) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = CineVaultTheme.colors.accentGold.copy(alpha = 0.15f),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        "Password changed successfully!",
                        color = CineVaultTheme.colors.accentGold,
                        modifier = Modifier.padding(16.dp),
                        fontSize = 14.sp,
                    )
                }
                Spacer(Modifier.height(16.dp))
            }

            uiState.error?.let { error ->
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = CineVaultTheme.colors.error.copy(alpha = 0.15f),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(error, color = CineVaultTheme.colors.error, modifier = Modifier.padding(16.dp), fontSize = 14.sp)
                }
                Spacer(Modifier.height(16.dp))
            }

            Surface(
                shape = RoundedCornerShape(16.dp),
                color = CineVaultTheme.colors.surface,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    PasswordField("Current Password", currentPassword, { currentPassword = it }, showCurrent, { showCurrent = !showCurrent }, ImeAction.Next)
                    Spacer(Modifier.height(16.dp))
                    PasswordField("New Password", newPassword, { newPassword = it }, showNew, { showNew = !showNew }, ImeAction.Next)
                    Spacer(Modifier.height(4.dp))
                    PasswordStrengthIndicator(newPassword)
                    Spacer(Modifier.height(16.dp))
                    PasswordField("Confirm New Password", confirmPassword, { confirmPassword = it }, showConfirm, { showConfirm = !showConfirm }, ImeAction.Done)
                    Spacer(Modifier.height(24.dp))

                    Button(
                        onClick = {
                            focusManager.clearFocus()
                            viewModel.changePassword(currentPassword, newPassword, confirmPassword)
                        },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = CineVaultTheme.colors.accentGold),
                        enabled = !uiState.isLoading,
                    ) {
                        if (uiState.isLoading) {
                            CircularProgressIndicator(color = CineVaultTheme.colors.background, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                        } else {
                            Text("Change Password", color = CineVaultTheme.colors.background, fontSize = 16.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PasswordField(
    label: String, value: String, onValueChange: (String) -> Unit,
    visible: Boolean, onToggle: () -> Unit, imeAction: ImeAction,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = CineVaultTheme.colors.textSecondary) },
        visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
        trailingIcon = {
            IconButton(onClick = onToggle) {
                Icon(if (visible) Icons.Default.Visibility else Icons.Default.VisibilityOff, contentDescription = null, tint = CineVaultTheme.colors.textSecondary)
            }
        },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = imeAction),
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = CineVaultTheme.colors.accentGold,
            unfocusedBorderColor = CineVaultTheme.colors.border,
            focusedTextColor = CineVaultTheme.colors.textPrimary,
            unfocusedTextColor = CineVaultTheme.colors.textPrimary,
            cursorColor = CineVaultTheme.colors.accentGold,
        ),
        singleLine = true,
    )
}

@Composable
private fun PasswordStrengthIndicator(password: String) {
    if (password.isEmpty()) return
    val hasLength = password.length >= 8
    val hasUpper = password.any { it.isUpperCase() }
    val hasLower = password.any { it.isLowerCase() }
    val hasDigit = password.any { it.isDigit() }
    val score = listOf(hasLength, hasUpper, hasLower, hasDigit).count { it }
    val (label, color) = when (score) {
        4 -> "Strong" to CineVaultTheme.colors.accentGold
        3 -> "Good" to CineVaultTheme.colors.accentLight
        2 -> "Fair" to CineVaultTheme.colors.textSecondary
        else -> "Weak" to CineVaultTheme.colors.error
    }
    Row(verticalAlignment = Alignment.CenterVertically) {
        repeat(4) { i ->
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(3.dp)
                    .padding(end = if (i < 3) 4.dp else 0.dp)
                    .background(if (i < score) color else CineVaultTheme.colors.border, RoundedCornerShape(2.dp))
            )
        }
        Spacer(Modifier.width(8.dp))
        Text(label, fontSize = 11.sp, color = color)
    }
}
