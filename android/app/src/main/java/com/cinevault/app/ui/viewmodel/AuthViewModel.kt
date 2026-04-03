package com.cinevault.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cinevault.app.data.local.SessionManager
import com.cinevault.app.data.model.Result
import com.cinevault.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val isLoggedIn: Boolean = false,
    val loginSuccess: Boolean = false,
    val registerSuccess: Boolean = false,
    val forgotPasswordSuccess: Boolean = false,
    val googleSignupSuccess: Boolean = false,
    // Phone OTP
    val phoneOtpSent: Boolean = false,
    val phoneLoginSuccess: Boolean = false,
    val devOtp: String? = null,  // non-null when SMS not configured (dev/testing mode)
    // Email OTP
    val emailOtpSent: Boolean = false,
    val emailLoginSuccess: Boolean = false,
    val emailDevOtp: String? = null,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val sessionManager: SessionManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    val isLoggedIn: Flow<Boolean> = sessionManager.accessToken.map { it != null }
    val hasCompletedOnboarding: Flow<Boolean> = sessionManager.onboardingCompleted

    // Saved account flows for login suggestions
    val lastGoogleName: Flow<String?> = sessionManager.lastGoogleName
    val lastGoogleEmail: Flow<String?> = sessionManager.lastGoogleEmail
    val lastGoogleAvatar: Flow<String?> = sessionManager.lastGoogleAvatar
    val lastPhoneName: Flow<String?> = sessionManager.lastPhoneName
    val lastPhoneNumber: Flow<String?> = sessionManager.lastPhoneNumber

    fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _uiState.update { it.copy(error = "Please fill in all fields") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = authRepository.login(email, password)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, loginSuccess = true) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun register(name: String, email: String, password: String, confirmPassword: String) {
        if (name.isBlank() || email.isBlank() || password.isBlank()) {
            _uiState.update { it.copy(error = "Please fill in all fields") }
            return
        }
        if (password != confirmPassword) {
            _uiState.update { it.copy(error = "Passwords do not match") }
            return
        }
        if (password.length < 8) {
            _uiState.update { it.copy(error = "Password must be at least 8 characters") }
            return
        }
        if (!password.any { it.isUpperCase() } || !password.any { it.isLowerCase() } || !password.any { it.isDigit() }) {
            _uiState.update { it.copy(error = "Password must contain uppercase, lowercase, and a number") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = authRepository.register(name, email, password)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, registerSuccess = true) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun forgotPassword(email: String) {
        if (email.isBlank()) {
            _uiState.update { it.copy(error = "Please enter your email") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = authRepository.forgotPassword(email)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, forgotPasswordSuccess = true) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _uiState.update { AuthUiState() }
        }
    }

    fun googleLogin(idToken: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = authRepository.googleLogin(idToken)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, loginSuccess = true) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun googleSignup(idToken: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = authRepository.googleSignup(idToken)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, googleSignupSuccess = true) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun sendPhoneOtp(phone: String) {
        val fullPhone = if (phone.startsWith("+91")) phone else "+91$phone"
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = authRepository.sendPhoneOtp(fullPhone)) {
                is Result.Success -> _uiState.update {
                    it.copy(isLoading = false, phoneOtpSent = true, devOtp = result.data?.devOtp)
                }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun verifyPhoneOtp(phone: String, otp: String) {
        val fullPhone = if (phone.startsWith("+91")) phone else "+91$phone"
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = authRepository.verifyPhoneOtp(fullPhone, otp)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, phoneLoginSuccess = true) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun firebasePhoneVerify(idToken: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = authRepository.firebasePhoneVerify(idToken)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, phoneLoginSuccess = true) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun resetPhoneOtpSent() {
        _uiState.update { it.copy(phoneOtpSent = false) }
    }

    // ── Email OTP Authentication ──────────────────────────────────────────────

    fun sendEmailOtp(email: String) {
        if (email.isBlank()) {
            _uiState.update { it.copy(error = "Please enter your email") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = authRepository.sendEmailOtp(email)) {
                is Result.Success -> _uiState.update {
                    it.copy(isLoading = false, emailOtpSent = true, emailDevOtp = result.data?.devOtp)
                }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun verifyEmailOtp(email: String, otp: String) {
        if (otp.isBlank()) {
            _uiState.update { it.copy(error = "Please enter the OTP") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = authRepository.verifyEmailOtp(email, otp)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, emailLoginSuccess = true) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun resetEmailOtpSent() {
        _uiState.update { it.copy(emailOtpSent = false, emailDevOtp = null) }
    }

    fun onGoogleSignInError(message: String) {
        _uiState.update { it.copy(error = message) }
    }

    fun completeOnboarding() {
        viewModelScope.launch {
            sessionManager.completeOnboarding()
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun resetState() {
        _uiState.update { AuthUiState() }
    }
}
