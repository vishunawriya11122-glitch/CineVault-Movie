package com.cinevault.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cinevault.app.data.local.SessionManager
import com.cinevault.app.data.model.NotificationDto
import com.cinevault.app.data.model.Result
import com.cinevault.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val success: String? = null,
    // Change Password
    val changePasswordSuccess: Boolean = false,
    // Forgot Password OTP flow
    val otpSent: Boolean = false,
    val otpVerified: Boolean = false,
    val resetToken: String? = null,
    val passwordResetSuccess: Boolean = false,
    // Notifications
    val notifications: List<NotificationDto> = emptyList(),
    val notificationsTotal: Int = 0,
    // Account
    val userName: String = "",
    val userEmail: String = "",
    val deleteAccountSuccess: Boolean = false,
    // Preferences
    val playbackQuality: String = "Auto",
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val sessionManager: SessionManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val name = sessionManager.userName.first() ?: ""
            val email = sessionManager.userEmail.first() ?: ""
            val quality = sessionManager.playbackQuality.first() ?: "Auto"
            _uiState.update { it.copy(userName = name, userEmail = email, playbackQuality = quality) }
        }
    }

    // ── Change Password ──
    fun changePassword(currentPassword: String, newPassword: String, confirmPassword: String) {
        if (currentPassword.isBlank() || newPassword.isBlank() || confirmPassword.isBlank()) {
            _uiState.update { it.copy(error = "Please fill in all fields") }
            return
        }
        if (newPassword.length < 8) {
            _uiState.update { it.copy(error = "New password must be at least 8 characters") }
            return
        }
        if (!newPassword.any { it.isUpperCase() }) {
            _uiState.update { it.copy(error = "Password must contain an uppercase letter") }
            return
        }
        if (!newPassword.any { it.isDigit() }) {
            _uiState.update { it.copy(error = "Password must contain a number") }
            return
        }
        if (newPassword != confirmPassword) {
            _uiState.update { it.copy(error = "Passwords do not match") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = authRepository.changePassword(currentPassword, newPassword)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, changePasswordSuccess = true, success = result.data) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    // ── Forgot Password OTP flow ──
    fun sendOtp(email: String) {
        if (email.isBlank()) {
            _uiState.update { it.copy(error = "Please enter your email") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = authRepository.forgotPassword(email)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, otpSent = true) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun verifyOtp(email: String, otp: String) {
        if (otp.length != 6) {
            _uiState.update { it.copy(error = "Please enter the 6-digit OTP") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = authRepository.verifyOtp(email, otp)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, otpVerified = true, resetToken = result.data) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun resetPasswordWithToken(token: String, newPassword: String, confirmPassword: String) {
        if (newPassword.length < 8) {
            _uiState.update { it.copy(error = "Password must be at least 8 characters") }
            return
        }
        if (newPassword != confirmPassword) {
            _uiState.update { it.copy(error = "Passwords do not match") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = authRepository.resetPassword(token, newPassword)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, passwordResetSuccess = true, success = result.data) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    // ── Notifications ──
    fun loadNotifications(page: Int = 1) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = authRepository.getNotifications(page)) {
                is Result.Success -> _uiState.update {
                    it.copy(
                        isLoading = false,
                        notifications = result.data.notifications,
                        notificationsTotal = result.data.total,
                    )
                }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    // ── Delete Account ──
    fun deleteAccount() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = authRepository.deleteAccount()) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, deleteAccountSuccess = true) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    // ── Update Account Name ──
    fun updateName(name: String) {
        if (name.isBlank()) return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                sessionManager.saveName(name)
                _uiState.update { it.copy(isLoading = false, userName = name, success = "Name updated") }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    // ── Playback Quality ──
    fun setPlaybackQuality(quality: String) {
        viewModelScope.launch {
            sessionManager.savePlaybackQuality(quality)
            _uiState.update { it.copy(playbackQuality = quality) }
        }
    }

    fun clearError() = _uiState.update { it.copy(error = null) }
    fun clearSuccess() = _uiState.update { it.copy(success = null) }
    fun resetState() = _uiState.update { SettingsUiState() }
}
