package com.cinevault.app.data.repository

import com.cinevault.app.data.local.SessionManager
import com.cinevault.app.data.model.*
import com.cinevault.app.data.remote.CineVaultApi
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: CineVaultApi,
    private val sessionManager: SessionManager,
) {
    suspend fun login(email: String, password: String): Result<UserDto> {
        return try {
            val response = api.login(LoginRequest(email, password))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                sessionManager.saveSession(
                    token = body.accessToken,
                    userId = body.user.id,
                    name = body.user.name,
                    email = body.user.email,
                    avatar = body.user.avatarUrl,
                    role = body.user.role,
                )
                body.refreshToken?.let { sessionManager.saveRefreshToken(it) }
                ensureActiveProfile()
                Result.Success(body.user)
            } else {
                Result.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "An error occurred")
        }
    }

    suspend fun register(name: String, email: String, password: String): Result<UserDto> {
        return try {
            val response = api.register(RegisterRequest(name, email, password))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                sessionManager.saveSession(
                    token = body.accessToken,
                    userId = body.user.id,
                    name = body.user.name,
                    email = body.user.email,
                    avatar = body.user.avatarUrl,
                    role = body.user.role,
                )
                body.refreshToken?.let { sessionManager.saveRefreshToken(it) }
                ensureActiveProfile()
                Result.Success(body.user)
            } else {
                Result.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "An error occurred")
        }
    }

    /**
     * After login/register, ensure there's an active profile set.
     * If no profiles exist, create a default one.
     */
    private suspend fun ensureActiveProfile() {
        try {
            val profilesResponse = api.getProfiles()
            if (profilesResponse.isSuccessful) {
                val profiles = profilesResponse.body() ?: emptyList()
                val profile = profiles.firstOrNull()
                if (profile != null) {
                    sessionManager.setActiveProfileId(profile.id)
                    android.util.Log.d("CineVaultAuth", "Active profile set: ${profile.id}")
                } else {
                    // No profiles exist — create a default one
                    val createResponse = api.createProfile(
                        CreateProfileRequest(
                            displayName = "Default",
                            avatarUrl = null,
                            maturityRating = "PG",
                        )
                    )
                    if (createResponse.isSuccessful && createResponse.body() != null) {
                        val newProfile = createResponse.body()!!
                        sessionManager.setActiveProfileId(newProfile.id)
                        android.util.Log.d("CineVaultAuth", "Default profile created & set: ${newProfile.id}")
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("CineVaultAuth", "Failed to ensure active profile", e)
        }
    }

    suspend fun forgotPassword(email: String): Result<String> {
        return try {
            val response = api.forgotPassword(ForgotPasswordRequest(email))
            if (response.isSuccessful) {
                Result.Success(response.body()?.message ?: "Reset link sent")
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "An error occurred")
        }
    }

    suspend fun logout(): Result<Unit> {
        return try {
            api.logout()
            sessionManager.clearSession()
            Result.Success(Unit)
        } catch (e: Exception) {
            sessionManager.clearSession()
            Result.Success(Unit)
        }
    }

    suspend fun verifyOtp(email: String, otp: String): Result<String> {
        return try {
            val response = api.verifyOtp(VerifyOtpRequest(email, otp))
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!.resetToken)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "An error occurred")
        }
    }

    suspend fun resetPassword(token: String, password: String): Result<String> {
        return try {
            val response = api.resetPassword(ResetPasswordRequest(token, password))
            if (response.isSuccessful) {
                Result.Success(response.body()?.message ?: "Password reset successfully")
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "An error occurred")
        }
    }

    suspend fun changePassword(currentPassword: String, newPassword: String): Result<String> {
        return try {
            val response = api.changePassword(ChangePasswordRequest(currentPassword, newPassword))
            if (response.isSuccessful) {
                Result.Success(response.body()?.message ?: "Password changed successfully")
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "An error occurred")
        }
    }

    suspend fun deleteAccount(): Result<String> {
        return try {
            val response = api.deleteAccount()
            if (response.isSuccessful) {
                sessionManager.clearSession()
                Result.Success(response.body()?.message ?: "Account deleted")
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "An error occurred")
        }
    }

    suspend fun getNotifications(page: Int = 1): Result<NotificationsResponse> {
        return try {
            val response = api.getUserNotifications(page)
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "An error occurred")
        }
    }

    suspend fun deleteHistoryItem(id: String): Result<String> {
        return try {
            val response = api.deleteHistoryItem(id)
            if (response.isSuccessful) {
                Result.Success("Deleted")
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "An error occurred")
        }
    }
}
