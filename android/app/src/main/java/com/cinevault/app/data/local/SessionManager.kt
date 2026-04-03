package com.cinevault.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "cinevault_prefs")

@Singleton
class SessionManager @Inject constructor(@ApplicationContext private val context: Context) {

    companion object {
        private val ACCESS_TOKEN = stringPreferencesKey("access_token")
        private val USER_ID = stringPreferencesKey("user_id")
        private val USER_NAME = stringPreferencesKey("user_name")
        private val USER_EMAIL = stringPreferencesKey("user_email")
        private val USER_AVATAR = stringPreferencesKey("user_avatar")
        private val USER_ROLE = stringPreferencesKey("user_role")
        private val ACTIVE_PROFILE_ID = stringPreferencesKey("active_profile_id")
        private val ACTIVE_PROFILE_NAME = stringPreferencesKey("active_profile_name")
        private val ONBOARDING_COMPLETED = booleanPreferencesKey("onboarding_completed")
        private val DEFAULT_QUALITY = stringPreferencesKey("default_quality")
        private val AUTOPLAY_ENABLED = booleanPreferencesKey("autoplay_enabled")
        private val LIKED_MOVIE_IDS = stringSetPreferencesKey("liked_movie_ids")
        private val REFRESH_TOKEN = stringPreferencesKey("refresh_token")

        // Saved accounts (persist across logout)
        private val LAST_GOOGLE_NAME = stringPreferencesKey("last_google_name")
        private val LAST_GOOGLE_EMAIL = stringPreferencesKey("last_google_email")
        private val LAST_GOOGLE_AVATAR = stringPreferencesKey("last_google_avatar")
        private val LAST_PHONE_NAME = stringPreferencesKey("last_phone_name")
        private val LAST_PHONE_NUMBER = stringPreferencesKey("last_phone_number")
        private val LAST_AUTH_PROVIDER = stringPreferencesKey("last_auth_provider")
    }

    val accessToken: Flow<String?> = context.dataStore.data.map { it[ACCESS_TOKEN] }

    val refreshToken: Flow<String?> = context.dataStore.data.map { it[REFRESH_TOKEN] }

    val isLoggedIn: Flow<Boolean> = context.dataStore.data.map { it[ACCESS_TOKEN] != null }

    val userId: Flow<String?> = context.dataStore.data.map { it[USER_ID] }

    val activeProfileId: Flow<String?> = context.dataStore.data.map { it[ACTIVE_PROFILE_ID] }

    val userName: Flow<String?> = context.dataStore.data.map { it[USER_NAME] }

    val userEmail: Flow<String?> = context.dataStore.data.map { it[USER_EMAIL] }

    val onboardingCompleted: Flow<Boolean> = context.dataStore.data.map { it[ONBOARDING_COMPLETED] ?: false }

    val autoplayEnabled: Flow<Boolean> = context.dataStore.data.map { it[AUTOPLAY_ENABLED] ?: true }

    val playbackQuality: Flow<String?> = context.dataStore.data.map { it[DEFAULT_QUALITY] ?: "Auto" }

    val likedMovieIds: Flow<Set<String>> = context.dataStore.data.map { it[LIKED_MOVIE_IDS] ?: emptySet() }

    // Saved account flows
    val lastGoogleName: Flow<String?> = context.dataStore.data.map { it[LAST_GOOGLE_NAME] }
    val lastGoogleEmail: Flow<String?> = context.dataStore.data.map { it[LAST_GOOGLE_EMAIL] }
    val lastGoogleAvatar: Flow<String?> = context.dataStore.data.map { it[LAST_GOOGLE_AVATAR] }
    val lastPhoneName: Flow<String?> = context.dataStore.data.map { it[LAST_PHONE_NAME] }
    val lastPhoneNumber: Flow<String?> = context.dataStore.data.map { it[LAST_PHONE_NUMBER] }
    val lastAuthProvider: Flow<String?> = context.dataStore.data.map { it[LAST_AUTH_PROVIDER] }

    suspend fun toggleLikedMovie(movieId: String) {
        context.dataStore.edit { prefs ->
            val current = prefs[LIKED_MOVIE_IDS] ?: emptySet()
            prefs[LIKED_MOVIE_IDS] = if (movieId in current) current - movieId else current + movieId
        }
    }

    suspend fun saveSession(token: String, userId: String, name: String, email: String, avatar: String?, role: String) {
        context.dataStore.edit { prefs ->
            prefs[ACCESS_TOKEN] = token
            prefs[USER_ID] = userId
            prefs[USER_NAME] = name
            prefs[USER_EMAIL] = email
            avatar?.let { prefs[USER_AVATAR] = it }
            prefs[USER_ROLE] = role
        }
    }

    suspend fun updateToken(token: String) {
        context.dataStore.edit { prefs ->
            prefs[ACCESS_TOKEN] = token
        }
    }

    suspend fun saveRefreshToken(token: String) {
        context.dataStore.edit { prefs ->
            prefs[REFRESH_TOKEN] = token
        }
    }

    suspend fun setActiveProfile(profileId: String, profileName: String) {
        context.dataStore.edit { prefs ->
            prefs[ACTIVE_PROFILE_ID] = profileId
            prefs[ACTIVE_PROFILE_NAME] = profileName
        }
    }

    suspend fun setActiveProfileId(profileId: String) {
        context.dataStore.edit { prefs ->
            prefs[ACTIVE_PROFILE_ID] = profileId
        }
    }

    suspend fun completeOnboarding() {
        context.dataStore.edit { prefs ->
            prefs[ONBOARDING_COMPLETED] = true
        }
    }

    suspend fun clearSession() {
        context.dataStore.edit { prefs ->
            // Preserve saved accounts and onboarding across logout
            val onboarding = prefs[ONBOARDING_COMPLETED]
            val gName = prefs[LAST_GOOGLE_NAME]
            val gEmail = prefs[LAST_GOOGLE_EMAIL]
            val gAvatar = prefs[LAST_GOOGLE_AVATAR]
            val pName = prefs[LAST_PHONE_NAME]
            val pNumber = prefs[LAST_PHONE_NUMBER]
            val provider = prefs[LAST_AUTH_PROVIDER]

            prefs.clear()

            onboarding?.let { prefs[ONBOARDING_COMPLETED] = it }
            gName?.let { prefs[LAST_GOOGLE_NAME] = it }
            gEmail?.let { prefs[LAST_GOOGLE_EMAIL] = it }
            gAvatar?.let { prefs[LAST_GOOGLE_AVATAR] = it }
            pName?.let { prefs[LAST_PHONE_NAME] = it }
            pNumber?.let { prefs[LAST_PHONE_NUMBER] = it }
            provider?.let { prefs[LAST_AUTH_PROVIDER] = it }
        }
    }

    suspend fun saveGoogleAccount(name: String, email: String, avatar: String?) {
        context.dataStore.edit { prefs ->
            prefs[LAST_GOOGLE_NAME] = name
            prefs[LAST_GOOGLE_EMAIL] = email
            avatar?.let { prefs[LAST_GOOGLE_AVATAR] = it }
            prefs[LAST_AUTH_PROVIDER] = "google"
        }
    }

    suspend fun savePhoneAccount(name: String, phone: String) {
        context.dataStore.edit { prefs ->
            prefs[LAST_PHONE_NAME] = name
            prefs[LAST_PHONE_NUMBER] = phone
            prefs[LAST_AUTH_PROVIDER] = "phone"
        }
    }

    suspend fun saveName(name: String) {
        context.dataStore.edit { prefs ->
            prefs[USER_NAME] = name
        }
    }

    suspend fun savePlaybackQuality(quality: String) {
        context.dataStore.edit { prefs ->
            prefs[DEFAULT_QUALITY] = quality
        }
    }

    suspend fun getAccessTokenSync(): String? {
        var token: String? = null
        context.dataStore.data.collect { token = it[ACCESS_TOKEN] }
        return token
    }
}
