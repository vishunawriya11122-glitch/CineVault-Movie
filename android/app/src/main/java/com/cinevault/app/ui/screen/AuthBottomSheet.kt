package com.cinevault.app.ui.screen

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckBox
import androidx.compose.material.icons.filled.CheckBoxOutlineBlank
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.cinevault.app.R
import com.cinevault.app.ui.theme.CineVaultTheme
import com.cinevault.app.ui.viewmodel.AuthViewModel
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.delay

private enum class AuthPage {
    MAIN, EMAIL_INPUT, EMAIL_OTP, PHONE_INPUT, PHONE_OTP
}

// ═══════════════════════════════════════════════════════════════
// MASKING UTILITIES
// ═══════════════════════════════════════════════════════════════

private fun maskEmail(email: String): String {
    val parts = email.split("@")
    if (parts.size != 2) return email
    val local = parts[0]
    val domain = parts[1]
    val visible = local.take(3)
    val tld = domain.substringAfterLast(".")
    return "$visible*****.$tld"
}

private fun maskPhone(phone: String): String {
    val digits = phone.filter { it.isDigit() }
    if (digits.length < 4) return phone
    val first2 = digits.take(2)
    val last2 = digits.takeLast(2)
    return "$first2*****$last2"
}

// ═══════════════════════════════════════════════════════════════
// AUTH BOTTOM SHEET
// ═══════════════════════════════════════════════════════════════

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthBottomSheet(
    onDismiss: () -> Unit,
    onLoginSuccess: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // Saved account data from ViewModel
    val lastGoogleName by viewModel.lastGoogleName.collectAsState(initial = null)
    val lastGoogleEmail by viewModel.lastGoogleEmail.collectAsState(initial = null)
    val lastGoogleAvatar by viewModel.lastGoogleAvatar.collectAsState(initial = null)
    val lastPhoneName by viewModel.lastPhoneName.collectAsState(initial = null)
    val lastPhoneNumber by viewModel.lastPhoneNumber.collectAsState(initial = null)

    // Internal state
    var currentPage by remember { mutableStateOf(AuthPage.MAIN) }
    var emailInput by remember { mutableStateOf("") }
    var otpInput by remember { mutableStateOf("") }
    var phoneInput by remember { mutableStateOf("") }
    var trustedDevice by remember { mutableStateOf(true) }
    var showPhoneConfirmDialog by remember { mutableStateOf(false) }

    // Firebase phone auth state
    val activity = context as Activity
    val firebaseAuth = remember { FirebaseAuth.getInstance() }
    var verificationId by remember { mutableStateOf<String?>(null) }
    var resendToken by remember { mutableStateOf<PhoneAuthProvider.ForceResendingToken?>(null) }
    var phoneError by remember { mutableStateOf<String?>(null) }
    var phoneLoading by remember { mutableStateOf(false) }
    var countdownSeconds by remember { mutableIntStateOf(0) }

    // Google Sign-In
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
                    viewModel.onGoogleSignInError("Could not get Google token.")
                }
            } catch (e: ApiException) {
                viewModel.onGoogleSignInError("Google Sign-In failed (code ${e.statusCode}).")
            }
        }
    }

    fun launchGoogleSignIn() {
        googleSignInClient.signOut().addOnCompleteListener {
            googleLauncher.launch(googleSignInClient.signInIntent)
        }
    }

    // Firebase phone OTP sending
    fun sendFirebaseOtp(phone: String, forceResend: Boolean = false) {
        val fullPhone = if (phone.startsWith("+")) phone else "+91$phone"
        phoneLoading = true
        phoneError = null

        val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
            override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                phoneLoading = true
                firebaseAuth.signInWithCredential(credential)
                    .addOnSuccessListener { result ->
                        result.user?.getIdToken(false)?.addOnSuccessListener { tokenResult ->
                            val idToken = tokenResult.token ?: return@addOnSuccessListener
                            viewModel.firebasePhoneVerify(idToken)
                        }
                    }
                    .addOnFailureListener { e ->
                        phoneError = e.localizedMessage ?: "Auto-verification failed"
                        phoneLoading = false
                    }
            }

            override fun onVerificationFailed(e: com.google.firebase.FirebaseException) {
                phoneError = e.localizedMessage ?: "Verification failed"
                phoneLoading = false
            }

            override fun onCodeSent(vId: String, token: PhoneAuthProvider.ForceResendingToken) {
                verificationId = vId
                resendToken = token
                phoneLoading = false
                currentPage = AuthPage.PHONE_OTP
            }
        }

        val optionsBuilder = PhoneAuthOptions.newBuilder(firebaseAuth)
            .setPhoneNumber(fullPhone)
            .setTimeout(60L, TimeUnit.SECONDS)
            .setActivity(activity)
            .setCallbacks(callbacks)

        if (forceResend && resendToken != null) {
            optionsBuilder.setForceResendingToken(resendToken!!)
        }

        PhoneAuthProvider.verifyPhoneNumber(optionsBuilder.build())
    }

    // Countdown timer for phone OTP
    LaunchedEffect(currentPage) {
        if (currentPage == AuthPage.PHONE_OTP) {
            countdownSeconds = 60
            while (countdownSeconds > 0) {
                delay(1000L)
                countdownSeconds--
            }
        }
    }

    // Listen for login success from any method
    LaunchedEffect(uiState.loginSuccess, uiState.googleSignupSuccess, uiState.phoneLoginSuccess, uiState.emailLoginSuccess) {
        if (uiState.loginSuccess || uiState.googleSignupSuccess || uiState.phoneLoginSuccess || uiState.emailLoginSuccess) {
            viewModel.resetState()
            onLoginSuccess()
        }
    }

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Color(0xFF1E1E1E),
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
        scrimColor = Color.Black.copy(alpha = 0.5f),
        dragHandle = {
            // Custom drag handle matching screenshot
            Box(
                modifier = Modifier
                    .padding(top = 12.dp, bottom = 8.dp)
                    .width(40.dp)
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(Color(0xFF666666))
            )
        },
    ) {
        AnimatedContent(
            targetState = currentPage,
            transitionSpec = {
                if (targetState.ordinal > initialState.ordinal) {
                    slideInHorizontally { it } + fadeIn() togetherWith slideOutHorizontally { -it } + fadeOut()
                } else {
                    slideInHorizontally { -it } + fadeIn() togetherWith slideOutHorizontally { it } + fadeOut()
                }
            },
            label = "authPageTransition",
        ) { page ->
            when (page) {
                AuthPage.MAIN -> MainAuthPage(
                    lastGoogleName = lastGoogleName,
                    lastGoogleEmail = lastGoogleEmail,
                    lastGoogleAvatar = lastGoogleAvatar,
                    lastPhoneName = lastPhoneName,
                    lastPhoneNumber = lastPhoneNumber,
                    onEmailClick = { currentPage = AuthPage.EMAIL_INPUT },
                    onGoogleClick = { launchGoogleSignIn() },
                    onPhoneSavedClick = { showPhoneConfirmDialog = true },
                    onPhoneNewClick = { currentPage = AuthPage.PHONE_INPUT },
                    isLoading = uiState.isLoading,
                    error = uiState.error,
                )

                AuthPage.EMAIL_INPUT -> EmailInputPage(
                    email = emailInput,
                    onEmailChange = { emailInput = it },
                    trustedDevice = trustedDevice,
                    onTrustedDeviceChange = { trustedDevice = it },
                    onSendOtp = {
                        viewModel.sendEmailOtp(emailInput)
                    },
                    onBack = {
                        viewModel.clearError()
                        currentPage = AuthPage.MAIN
                    },
                    isLoading = uiState.isLoading,
                    error = uiState.error,
                )

                AuthPage.EMAIL_OTP -> EmailOtpPage(
                    email = emailInput,
                    otp = otpInput,
                    onOtpChange = { otpInput = it },
                    onVerify = { viewModel.verifyEmailOtp(emailInput, otpInput) },
                    onBack = {
                        viewModel.clearError()
                        viewModel.resetEmailOtpSent()
                        otpInput = ""
                        currentPage = AuthPage.EMAIL_INPUT
                    },
                    onResend = { viewModel.sendEmailOtp(emailInput) },
                    isLoading = uiState.isLoading,
                    error = uiState.error,
                    devOtp = uiState.emailDevOtp,
                )

                AuthPage.PHONE_INPUT -> PhoneInputPage(
                    phone = phoneInput,
                    onPhoneChange = { phoneInput = it },
                    onSendOtp = { sendFirebaseOtp(phoneInput) },
                    onBack = {
                        phoneError = null
                        currentPage = AuthPage.MAIN
                    },
                    isLoading = phoneLoading,
                    error = phoneError,
                )

                AuthPage.PHONE_OTP -> PhoneOtpPage(
                    phone = phoneInput,
                    otp = otpInput,
                    onOtpChange = { otpInput = it },
                    onVerify = {
                        val vId = verificationId ?: return@PhoneOtpPage
                        val credential = PhoneAuthProvider.getCredential(vId, otpInput)
                        phoneLoading = true
                        phoneError = null
                        firebaseAuth.signInWithCredential(credential)
                            .addOnSuccessListener { result ->
                                result.user?.getIdToken(false)?.addOnSuccessListener { tokenResult ->
                                    val idToken = tokenResult.token ?: return@addOnSuccessListener
                                    viewModel.firebasePhoneVerify(idToken)
                                }
                            }
                            .addOnFailureListener { e ->
                                phoneError = e.localizedMessage ?: "Invalid OTP"
                                phoneLoading = false
                            }
                    },
                    onBack = {
                        phoneError = null
                        otpInput = ""
                        currentPage = AuthPage.PHONE_INPUT
                    },
                    onResend = {
                        otpInput = ""
                        sendFirebaseOtp(phoneInput, forceResend = true)
                    },
                    isLoading = phoneLoading || uiState.isLoading,
                    error = phoneError ?: uiState.error,
                    countdown = countdownSeconds,
                )
            }
        }
    }

    // Navigate to OTP page when email OTP is sent
    LaunchedEffect(uiState.emailOtpSent) {
        if (uiState.emailOtpSent && currentPage == AuthPage.EMAIL_INPUT) {
            currentPage = AuthPage.EMAIL_OTP
        }
    }

    // Phone confirm dialog for saved phone number
    if (showPhoneConfirmDialog && lastPhoneNumber != null) {
        PhoneConfirmDialog(
            name = lastPhoneName ?: "User",
            phone = lastPhoneNumber!!,
            onContinue = {
                showPhoneConfirmDialog = false
                phoneInput = lastPhoneNumber!!.removePrefix("+91")
                sendFirebaseOtp(lastPhoneNumber!!)
            },
            onDifferentAccount = {
                showPhoneConfirmDialog = false
                currentPage = AuthPage.PHONE_INPUT
            },
            onDismiss = { showPhoneConfirmDialog = false },
        )
    }
}

// ═══════════════════════════════════════════════════════════════
// MAIN AUTH PAGE
// ═══════════════════════════════════════════════════════════════

@Composable
private fun MainAuthPage(
    lastGoogleName: String?,
    lastGoogleEmail: String?,
    lastGoogleAvatar: String?,
    lastPhoneName: String?,
    lastPhoneNumber: String?,
    onEmailClick: () -> Unit,
    onGoogleClick: () -> Unit,
    onPhoneSavedClick: () -> Unit,
    onPhoneNewClick: () -> Unit,
    isLoading: Boolean,
    error: String?,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .navigationBarsPadding(),
    ) {
        // Error message
        if (error != null) {
            Text(
                error,
                style = CineVaultTheme.typography.label,
                color = CineVaultTheme.colors.error,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
            )
        }

        // Loading indicator
        if (isLoading) {
            LinearProgressIndicator(
                modifier = Modifier.fillMaxWidth(),
                color = CineVaultTheme.colors.accentGold,
                trackColor = Color.Transparent,
            )
        }

        // ── Continue with E-mail ──
        LoginOptionRow(
            icon = {
                Icon(
                    Icons.Filled.Email,
                    contentDescription = null,
                    tint = Color(0xFFB0B0B0),
                    modifier = Modifier.size(28.dp),
                )
            },
            title = "Continue with E-mail",
            onClick = onEmailClick,
        )

        HorizontalDivider(color = Color(0xFF333333), thickness = 0.5.dp, modifier = Modifier.padding(horizontal = 16.dp))

        // ── Continue with Google (always visible) ──
        LoginOptionRow(
            icon = {
                Icon(
                    painter = painterResource(id = R.drawable.ic_google),
                    contentDescription = "Google",
                    tint = Color.Unspecified,
                    modifier = Modifier.size(28.dp),
                )
            },
            title = if (lastGoogleName != null && lastGoogleEmail != null) lastGoogleName else "Continue with Google",
            subtitle = if (lastGoogleEmail != null) maskEmail(lastGoogleEmail) else null,
            onClick = onGoogleClick,
        )

        HorizontalDivider(color = Color(0xFF333333), thickness = 0.5.dp, modifier = Modifier.padding(horizontal = 16.dp))

        // ── Phone Account (saved) ──
        if (lastPhoneName != null && lastPhoneNumber != null) {
            LoginOptionRow(
                icon = {
                    Icon(
                        Icons.Filled.Phone,
                        contentDescription = null,
                        tint = Color(0xFF25D366),
                        modifier = Modifier.size(28.dp),
                    )
                },
                title = lastPhoneName,
                subtitle = maskPhone(lastPhoneNumber),
                onClick = onPhoneSavedClick,
            )
            HorizontalDivider(color = Color(0xFF333333), thickness = 0.5.dp, modifier = Modifier.padding(horizontal = 16.dp))
        }

        // ── Continue with Phone ──
        LoginOptionRow(
            icon = {
                Icon(
                    Icons.Filled.PhoneAndroid,
                    contentDescription = null,
                    tint = Color(0xFFB0B0B0),
                    modifier = Modifier.size(28.dp),
                )
            },
            title = "Continue with Phone",
            onClick = onPhoneNewClick,
        )

        Spacer(Modifier.height(24.dp))

        // Terms text
        TermsText(modifier = Modifier.padding(horizontal = 24.dp))

        Spacer(Modifier.height(20.dp))
    }
}

@Composable
private fun LoginOptionRow(
    icon: @Composable () -> Unit,
    title: String,
    subtitle: String? = null,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 24.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(Color(0xFF333333)),
            contentAlignment = Alignment.Center,
        ) {
            icon()
        }

        Spacer(Modifier.width(16.dp))

        Column {
            Text(
                title,
                style = CineVaultTheme.typography.body.copy(
                    fontWeight = FontWeight.Medium,
                    fontSize = 15.sp,
                ),
                color = Color.White,
            )
            if (subtitle != null) {
                Text(
                    subtitle,
                    style = CineVaultTheme.typography.label.copy(fontSize = 13.sp),
                    color = Color(0xFF888888),
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// EMAIL INPUT PAGE
// ═══════════════════════════════════════════════════════════════

@Composable
private fun EmailInputPage(
    email: String,
    onEmailChange: (String) -> Unit,
    trustedDevice: Boolean,
    onTrustedDeviceChange: (Boolean) -> Unit,
    onSendOtp: () -> Unit,
    onBack: () -> Unit,
    isLoading: Boolean,
    error: String?,
) {
    val focusManager = LocalFocusManager.current

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .navigationBarsPadding(),
    ) {
        // Header with back button
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White,
                )
            }
            Text(
                "Sign up",
                style = CineVaultTheme.typography.title.copy(fontSize = 20.sp),
                color = Color.White,
            )
        }

        Spacer(Modifier.height(24.dp))

        // Email input
        OutlinedTextField(
            value = email,
            onValueChange = onEmailChange,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            placeholder = {
                Text("Email address", color = Color(0xFF666666))
            },
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Email,
                imeAction = ImeAction.Done,
            ),
            keyboardActions = KeyboardActions(
                onDone = {
                    focusManager.clearFocus()
                    if (email.isNotBlank()) onSendOtp()
                },
            ),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFF444444),
                unfocusedBorderColor = Color(0xFF333333),
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                cursorColor = Color.White,
                focusedContainerColor = Color(0xFF2A2A2A),
                unfocusedContainerColor = Color(0xFF2A2A2A),
            ),
            shape = RoundedCornerShape(12.dp),
        )

        Spacer(Modifier.height(20.dp))

        // Trusted device checkbox
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .clickable { onTrustedDeviceChange(!trustedDevice) },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                if (trustedDevice) Icons.Filled.CheckBox else Icons.Filled.CheckBoxOutlineBlank,
                contentDescription = null,
                tint = if (trustedDevice) Color(0xFF00BFA5) else Color(0xFF666666),
                modifier = Modifier.size(24.dp),
            )
            Spacer(Modifier.width(8.dp))
            Text(
                "Mark this device as a trusted device",
                style = CineVaultTheme.typography.body.copy(fontSize = 14.sp),
                color = Color.White,
            )
            Spacer(Modifier.width(4.dp))
            Icon(
                Icons.Filled.HelpOutline,
                contentDescription = null,
                tint = Color(0xFF666666),
                modifier = Modifier.size(18.dp),
            )
        }

        Spacer(Modifier.height(20.dp))

        // Error
        if (error != null) {
            Text(
                error,
                style = CineVaultTheme.typography.label,
                color = CineVaultTheme.colors.error,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 4.dp),
            )
        }

        // Send OTP button
        Button(
            onClick = {
                focusManager.clearFocus()
                onSendOtp()
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .height(50.dp),
            enabled = email.isNotBlank() && !isLoading,
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF3A3A3A),
                contentColor = Color.White,
                disabledContainerColor = Color(0xFF2A2A2A),
                disabledContentColor = Color(0xFF666666),
            ),
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = Color.White,
                    strokeWidth = 2.dp,
                )
            } else {
                Text("Send OTP", fontSize = 15.sp)
            }
        }

        Spacer(Modifier.height(12.dp))

        // Authorize on Original Device
        Button(
            onClick = { /* Optional advanced feature */ },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .height(50.dp),
            enabled = false,
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF2A2A2A),
                contentColor = Color(0xFF666666),
                disabledContainerColor = Color(0xFF2A2A2A),
                disabledContentColor = Color(0xFF666666),
            ),
        ) {
            Text("Authorize on Original Device", fontSize = 15.sp)
        }

        Spacer(Modifier.height(24.dp))

        // Terms
        TermsText(modifier = Modifier.padding(horizontal = 24.dp))

        Spacer(Modifier.height(20.dp))
    }
}

// ═══════════════════════════════════════════════════════════════
// EMAIL OTP PAGE
// ═══════════════════════════════════════════════════════════════

@Composable
private fun EmailOtpPage(
    email: String,
    otp: String,
    onOtpChange: (String) -> Unit,
    onVerify: () -> Unit,
    onBack: () -> Unit,
    onResend: () -> Unit,
    isLoading: Boolean,
    error: String?,
    devOtp: String?,
) {
    val focusManager = LocalFocusManager.current

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .navigationBarsPadding(),
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White,
                )
            }
            Text(
                "Verify OTP",
                style = CineVaultTheme.typography.title.copy(fontSize = 20.sp),
                color = Color.White,
            )
        }

        Spacer(Modifier.height(16.dp))

        Text(
            "Enter the 6-digit code sent to",
            style = CineVaultTheme.typography.body.copy(fontSize = 14.sp),
            color = Color(0xFF888888),
            modifier = Modifier.padding(horizontal = 24.dp),
        )
        Text(
            email,
            style = CineVaultTheme.typography.body.copy(fontWeight = FontWeight.Bold, fontSize = 14.sp),
            color = CineVaultTheme.colors.accentGold,
            modifier = Modifier.padding(horizontal = 24.dp),
        )

        Spacer(Modifier.height(24.dp))

        // Dev OTP hint
        if (devOtp != null) {
            Text(
                "Dev OTP: $devOtp",
                style = CineVaultTheme.typography.label.copy(fontSize = 12.sp),
                color = CineVaultTheme.colors.accentGold,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 4.dp),
            )
        }

        // OTP input
        OutlinedTextField(
            value = otp,
            onValueChange = { value ->
                val digits = value.filter { it.isDigit() }.take(6)
                onOtpChange(digits)
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            placeholder = {
                Text("• • • • • •", color = Color(0xFF666666), letterSpacing = 6.sp)
            },
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.NumberPassword,
                imeAction = ImeAction.Done,
            ),
            keyboardActions = KeyboardActions(
                onDone = {
                    focusManager.clearFocus()
                    if (otp.length == 6) onVerify()
                },
            ),
            textStyle = LocalTextStyle.current.copy(
                letterSpacing = 8.sp,
                textAlign = TextAlign.Center,
                fontSize = 22.sp,
                color = Color.White,
            ),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = CineVaultTheme.colors.accentGold,
                unfocusedBorderColor = Color(0xFF333333),
                cursorColor = CineVaultTheme.colors.accentGold,
                focusedContainerColor = Color(0xFF2A2A2A),
                unfocusedContainerColor = Color(0xFF2A2A2A),
            ),
            shape = RoundedCornerShape(12.dp),
        )

        Spacer(Modifier.height(12.dp))

        // Resend
        TextButton(
            onClick = onResend,
            modifier = Modifier.align(Alignment.CenterHorizontally),
        ) {
            Text(
                "Resend OTP",
                color = CineVaultTheme.colors.accentGold,
                fontSize = 14.sp,
            )
        }

        Spacer(Modifier.height(8.dp))

        // Error
        if (error != null) {
            Text(
                error,
                style = CineVaultTheme.typography.label,
                color = CineVaultTheme.colors.error,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 4.dp),
            )
        }

        // Verify button
        Button(
            onClick = {
                focusManager.clearFocus()
                onVerify()
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .height(50.dp),
            enabled = otp.length == 6 && !isLoading,
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = CineVaultTheme.colors.accentGold,
                contentColor = Color.Black,
                disabledContainerColor = Color(0xFF2A2A2A),
                disabledContentColor = Color(0xFF666666),
            ),
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = Color.Black,
                    strokeWidth = 2.dp,
                )
            } else {
                Text("Verify & Continue", fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(Modifier.height(20.dp))
    }
}

// ═══════════════════════════════════════════════════════════════
// PHONE INPUT PAGE
// ═══════════════════════════════════════════════════════════════

@Composable
private fun PhoneInputPage(
    phone: String,
    onPhoneChange: (String) -> Unit,
    onSendOtp: () -> Unit,
    onBack: () -> Unit,
    isLoading: Boolean,
    error: String?,
) {
    val focusManager = LocalFocusManager.current

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .navigationBarsPadding(),
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White,
                )
            }
            Text(
                "Phone Login",
                style = CineVaultTheme.typography.title.copy(fontSize = 20.sp),
                color = Color.White,
            )
        }

        Spacer(Modifier.height(24.dp))

        Text(
            "Mobile Number",
            style = CineVaultTheme.typography.label,
            color = Color(0xFF888888),
            modifier = Modifier.padding(horizontal = 24.dp),
        )
        Spacer(Modifier.height(8.dp))

        OutlinedTextField(
            value = phone,
            onValueChange = { value ->
                val digits = value.filter { it.isDigit() }.take(10)
                onPhoneChange(digits)
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            singleLine = true,
            prefix = {
                Text(
                    "+91  ",
                    style = CineVaultTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                    color = CineVaultTheme.colors.accentGold,
                )
            },
            placeholder = {
                Text("98765 43210", color = Color(0xFF666666))
            },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Number,
                imeAction = ImeAction.Done,
            ),
            keyboardActions = KeyboardActions(
                onDone = {
                    focusManager.clearFocus()
                    if (phone.length == 10) onSendOtp()
                },
            ),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = CineVaultTheme.colors.accentGold,
                unfocusedBorderColor = Color(0xFF333333),
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                cursorColor = CineVaultTheme.colors.accentGold,
                focusedContainerColor = Color(0xFF2A2A2A),
                unfocusedContainerColor = Color(0xFF2A2A2A),
            ),
            shape = RoundedCornerShape(12.dp),
        )

        if (phone.isNotEmpty() && phone.length < 10) {
            Spacer(Modifier.height(4.dp))
            Text(
                "${phone.length}/10 digits",
                style = CineVaultTheme.typography.label.copy(fontSize = 11.sp),
                color = Color(0xFF666666),
                modifier = Modifier.padding(horizontal = 24.dp),
            )
        }

        Spacer(Modifier.height(20.dp))

        if (error != null) {
            Text(
                error,
                style = CineVaultTheme.typography.label,
                color = CineVaultTheme.colors.error,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 4.dp),
            )
        }

        Button(
            onClick = {
                focusManager.clearFocus()
                onSendOtp()
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .height(50.dp),
            enabled = phone.length == 10 && phone[0].toString().matches(Regex("[6-9]")) && !isLoading,
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = CineVaultTheme.colors.accentGold,
                contentColor = Color.Black,
                disabledContainerColor = Color(0xFF2A2A2A),
                disabledContentColor = Color(0xFF666666),
            ),
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = Color.Black,
                    strokeWidth = 2.dp,
                )
            } else {
                Text("Send OTP", fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(Modifier.height(20.dp))
    }
}

// ═══════════════════════════════════════════════════════════════
// PHONE OTP PAGE
// ═══════════════════════════════════════════════════════════════

@Composable
private fun PhoneOtpPage(
    phone: String,
    otp: String,
    onOtpChange: (String) -> Unit,
    onVerify: () -> Unit,
    onBack: () -> Unit,
    onResend: () -> Unit,
    isLoading: Boolean,
    error: String?,
    countdown: Int,
) {
    val focusManager = LocalFocusManager.current

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .navigationBarsPadding(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White,
                )
            }
            Text(
                "Verify OTP",
                style = CineVaultTheme.typography.title.copy(fontSize = 20.sp),
                color = Color.White,
            )
        }

        Spacer(Modifier.height(16.dp))

        Text(
            buildAnnotatedString {
                append("OTP sent to +91 ")
                withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = CineVaultTheme.colors.accentGold)) {
                    append(phone)
                }
            },
            style = CineVaultTheme.typography.body.copy(fontSize = 14.sp),
            color = Color(0xFF888888),
            modifier = Modifier.padding(horizontal = 24.dp),
        )

        Spacer(Modifier.height(24.dp))

        OutlinedTextField(
            value = otp,
            onValueChange = { value ->
                val digits = value.filter { it.isDigit() }.take(6)
                onOtpChange(digits)
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            placeholder = {
                Text("• • • • • •", color = Color(0xFF666666), letterSpacing = 6.sp)
            },
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.NumberPassword,
                imeAction = ImeAction.Done,
            ),
            keyboardActions = KeyboardActions(
                onDone = {
                    focusManager.clearFocus()
                    if (otp.length == 6) onVerify()
                },
            ),
            textStyle = LocalTextStyle.current.copy(
                letterSpacing = 8.sp,
                textAlign = TextAlign.Center,
                fontSize = 22.sp,
                color = Color.White,
            ),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = CineVaultTheme.colors.accentGold,
                unfocusedBorderColor = Color(0xFF333333),
                cursorColor = CineVaultTheme.colors.accentGold,
                focusedContainerColor = Color(0xFF2A2A2A),
                unfocusedContainerColor = Color(0xFF2A2A2A),
            ),
            shape = RoundedCornerShape(12.dp),
        )

        Spacer(Modifier.height(12.dp))

        // Resend / Countdown
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (countdown > 0) {
                Text("Resend OTP in ", color = Color(0xFF888888), fontSize = 14.sp)
                Text("${countdown}s", color = CineVaultTheme.colors.accentGold, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            } else {
                TextButton(onClick = onResend, enabled = !isLoading) {
                    Text("Resend OTP", color = CineVaultTheme.colors.accentGold, fontSize = 14.sp)
                }
            }
        }

        Spacer(Modifier.height(8.dp))

        if (error != null) {
            Text(
                error,
                style = CineVaultTheme.typography.label,
                color = CineVaultTheme.colors.error,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 4.dp),
            )
        }

        Button(
            onClick = {
                focusManager.clearFocus()
                onVerify()
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .height(50.dp),
            enabled = otp.length == 6 && !isLoading,
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = CineVaultTheme.colors.accentGold,
                contentColor = Color.Black,
                disabledContainerColor = Color(0xFF2A2A2A),
                disabledContentColor = Color(0xFF666666),
            ),
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = Color.Black,
                    strokeWidth = 2.dp,
                )
            } else {
                Text("Verify & Continue", fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(Modifier.height(12.dp))

        TextButton(
            onClick = onBack,
            modifier = Modifier.align(Alignment.CenterHorizontally),
        ) {
            Text("Change mobile number", color = CineVaultTheme.colors.accentGold, fontSize = 14.sp)
        }

        Spacer(Modifier.height(20.dp))
    }
}

// ═══════════════════════════════════════════════════════════════
// PHONE CONFIRM DIALOG (Screenshot 5)
// ═══════════════════════════════════════════════════════════════

@Composable
private fun PhoneConfirmDialog(
    name: String,
    phone: String,
    onContinue: () -> Unit,
    onDifferentAccount: () -> Unit,
    onDismiss: () -> Unit,
) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color(0xFF333333),
            tonalElevation = 8.dp,
        ) {
            Column(
                modifier = Modifier
                    .padding(32.dp)
                    .fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                // Avatar circle with first letter
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF444444)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        name.firstOrNull()?.uppercase() ?: "U",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                    )
                }

                Spacer(Modifier.height(16.dp))

                // Masked phone number
                Text(
                    maskPhone(phone),
                    style = CineVaultTheme.typography.body.copy(fontSize = 16.sp),
                    color = Color.White,
                )

                Spacer(Modifier.height(24.dp))

                // Continue button (gold)
                Button(
                    onClick = onContinue,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = CineVaultTheme.colors.accentGold,
                        contentColor = Color.Black,
                    ),
                ) {
                    Text("Continue", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }

                Spacer(Modifier.height(12.dp))

                // Log into another account
                TextButton(onClick = onDifferentAccount) {
                    Text(
                        "Log into another account",
                        color = Color(0xFF5599FF),
                        fontSize = 14.sp,
                        textDecoration = TextDecoration.Underline,
                    )
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// TERMS TEXT
// ═══════════════════════════════════════════════════════════════

@Composable
private fun TermsText(modifier: Modifier = Modifier) {
    Text(
        buildAnnotatedString {
            withStyle(SpanStyle(color = Color(0xFF666666))) {
                append("By continuing, you agree to VELORA's ")
            }
            withStyle(SpanStyle(color = Color.White, textDecoration = TextDecoration.Underline)) {
                append("Terms of Use")
            }
            withStyle(SpanStyle(color = Color(0xFF666666))) {
                append(" and ")
            }
            withStyle(SpanStyle(color = Color.White, textDecoration = TextDecoration.Underline)) {
                append("Privacy Policy")
            }
        },
        modifier = modifier,
        style = CineVaultTheme.typography.label.copy(fontSize = 12.sp),
        textAlign = TextAlign.Center,
    )
}
