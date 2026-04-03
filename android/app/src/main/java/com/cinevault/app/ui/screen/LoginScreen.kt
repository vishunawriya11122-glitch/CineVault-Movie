package com.cinevault.app.ui.screen

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.cinevault.app.R
import com.cinevault.app.ui.components.GoldButton
import com.cinevault.app.ui.theme.CineVaultTheme
import com.cinevault.app.ui.viewmodel.AuthViewModel
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit,
    onNavigateToForgotPassword: () -> Unit,
    onNavigateToPhoneAuth: () -> Unit = {},
    viewModel: AuthViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current
    val context = LocalContext.current

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    // Google Sign-In client — sign out first each time to force the account picker
    val webClientId = stringResource(R.string.google_web_client_id)
    val googleSignInClient = remember(webClientId) {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(webClientId)
            .requestEmail()
            .build()
        GoogleSignIn.getClient(context, gso)
    }

    val googleLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            try {
                val account = GoogleSignIn.getSignedInAccountFromIntent(result.data)
                    .getResult(ApiException::class.java)
                val idToken = account.idToken
                if (idToken != null) {
                    viewModel.googleLogin(idToken)
                } else {
                    viewModel.onGoogleSignInError(
                        "Could not get Google token. Make sure your Web Client ID in strings.xml is correct."
                    )
                }
            } catch (e: ApiException) {
                viewModel.onGoogleSignInError("Google Sign-In failed (code ${e.statusCode}). Check your Web Client ID configuration.")
            }
        }
        // RESULT_CANCELED = user pressed back — no error needed
    }

    fun launchGoogleSignIn() {
        // Sign out first to always show the account picker
        googleSignInClient.signOut().addOnCompleteListener {
            googleLauncher.launch(googleSignInClient.signInIntent)
        }
    }

    LaunchedEffect(uiState.loginSuccess) {
        if (uiState.loginSuccess) {
            onLoginSuccess()
            viewModel.resetState()
        }
    }

    // Google Sign-Up success also navigates to home
    LaunchedEffect(uiState.googleSignupSuccess) {
        if (uiState.googleSignupSuccess) {
            onLoginSuccess()
            viewModel.resetState()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(CineVaultTheme.colors.background),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(80.dp))

            Text(
                "VELORA",
                style = CineVaultTheme.typography.heroTitle.copy(
                    fontSize = 32.sp,
                    letterSpacing = 6.sp,
                ),
                color = CineVaultTheme.colors.accentGold,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Sign in to continue",
                style = CineVaultTheme.typography.body,
                color = CineVaultTheme.colors.textSecondary,
            )

            Spacer(Modifier.height(48.dp))

            // Frosted glass card
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = CineVaultTheme.colors.surface.copy(alpha = 0.6f),
                tonalElevation = 0.dp,
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    CineVaultTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = "Email",
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Next,
                        ),
                        keyboardActions = KeyboardActions(
                            onNext = { focusManager.moveFocus(FocusDirection.Down) }
                        ),
                    )

                    Spacer(Modifier.height(16.dp))

                    CineVaultTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = "Password",
                        visualTransformation = if (passwordVisible) VisualTransformation.None
                        else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done,
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = {
                                focusManager.clearFocus()
                                viewModel.login(email, password)
                            }
                        ),
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    if (passwordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                                    contentDescription = "Toggle password",
                                    tint = CineVaultTheme.colors.textSecondary,
                                )
                            }
                        },
                    )

                    Spacer(Modifier.height(8.dp))

                    TextButton(
                        onClick = onNavigateToForgotPassword,
                        modifier = Modifier.align(Alignment.End),
                    ) {
                        Text(
                            "Forgot Password?",
                            style = CineVaultTheme.typography.label,
                            color = CineVaultTheme.colors.accentGold,
                        )
                    }

                    Spacer(Modifier.height(16.dp))

                    // Error
                    if (uiState.error != null) {
                        Text(
                            uiState.error!!,
                            style = CineVaultTheme.typography.label,
                            color = CineVaultTheme.colors.error,
                            modifier = Modifier.padding(bottom = 8.dp),
                        )
                    }

                    GoldButton(
                        text = "Sign In",
                        onClick = { viewModel.login(email, password) },
                        isLoading = uiState.isLoading,
                    )
                }
            }

            Spacer(Modifier.height(24.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Don't have an account?",
                    style = CineVaultTheme.typography.body,
                    color = CineVaultTheme.colors.textSecondary,
                )
                TextButton(onClick = onNavigateToRegister) {
                    Text(
                        "Sign Up",
                        style = CineVaultTheme.typography.body,
                        color = CineVaultTheme.colors.accentGold,
                    )
                }
            }

            Spacer(Modifier.height(24.dp))

            // Divider
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth(),
            ) {
                HorizontalDivider(modifier = Modifier.weight(1f), color = CineVaultTheme.colors.textSecondary.copy(alpha = 0.3f))
                Text(
                    "  OR  ",
                    style = CineVaultTheme.typography.label,
                    color = CineVaultTheme.colors.textSecondary,
                )
                HorizontalDivider(modifier = Modifier.weight(1f), color = CineVaultTheme.colors.textSecondary.copy(alpha = 0.3f))
            }

            Spacer(Modifier.height(16.dp))

            // Google Sign-In button
            Button(
                onClick = { launchGoogleSignIn() },
                enabled = !uiState.isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.White,
                    contentColor = Color(0xFF1F1F1F),
                ),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_google),
                        contentDescription = "Google",
                        tint = Color.Unspecified,
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(Modifier.width(12.dp))
                    Text(
                        "Continue with Google",
                        style = CineVaultTheme.typography.body.copy(fontSize = 15.sp),
                        color = Color(0xFF1F1F1F),
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            // Continue with Phone
            OutlinedButton(
                onClick = onNavigateToPhoneAuth,
                enabled = !uiState.isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = Color.White,
                ),
                border = androidx.compose.foundation.BorderStroke(1.dp, CineVaultTheme.colors.border),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                ) {
                    Icon(
                        Icons.Filled.Phone,
                        contentDescription = "Phone",
                        tint = CineVaultTheme.colors.accentGold,
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(Modifier.width(12.dp))
                    Text(
                        "Continue with Phone",
                        style = CineVaultTheme.typography.body.copy(fontSize = 15.sp),
                        color = Color.White,
                    )
                }
            }

            Spacer(Modifier.height(40.dp))
        }
    }
}

@Composable
fun CineVaultTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    trailingIcon: @Composable (() -> Unit)? = null,
    singleLine: Boolean = true,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        modifier = modifier.fillMaxWidth(),
        singleLine = singleLine,
        visualTransformation = visualTransformation,
        keyboardOptions = keyboardOptions,
        keyboardActions = keyboardActions,
        trailingIcon = trailingIcon,
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = CineVaultTheme.colors.accentGold,
            unfocusedBorderColor = CineVaultTheme.colors.border,
            focusedLabelColor = CineVaultTheme.colors.accentGold,
            unfocusedLabelColor = CineVaultTheme.colors.textSecondary,
            cursorColor = CineVaultTheme.colors.accentGold,
            focusedTextColor = CineVaultTheme.colors.textPrimary,
            unfocusedTextColor = CineVaultTheme.colors.textPrimary,
        ),
    )
}
