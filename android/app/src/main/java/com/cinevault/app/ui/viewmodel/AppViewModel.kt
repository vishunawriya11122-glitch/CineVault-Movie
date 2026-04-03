package com.cinevault.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cinevault.app.BuildConfig
import com.cinevault.app.data.local.SessionManager
import com.cinevault.app.data.model.AppVersionResponse
import com.cinevault.app.data.remote.CineVaultApi
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AppViewModel @Inject constructor(
    private val api: CineVaultApi,
    private val sessionManager: SessionManager
) : ViewModel() {

    private val _updateInfo = MutableStateFlow<AppVersionResponse?>(null)
    val updateInfo: StateFlow<AppVersionResponse?> = _updateInfo

    init {
        checkForUpdate()
    }

    fun checkForUpdate() {
        viewModelScope.launch {
            runCatching {
                val response = api.getAppVersion()
                if (response.isSuccessful) {
                    val body = response.body() ?: return@runCatching
                    // Use the higher of the actual build version OR the version the user
                    // already confirmed installing (handles the case where the downloaded APK
                    // has the same versionCode as the old build but was installed by the user).
                    val installedCode = sessionManager.installedVersionCode.first()
                    val effectiveCode = maxOf(BuildConfig.VERSION_CODE, installedCode)
                    if (body.versionCode > effectiveCode) {
                        _updateInfo.value = body
                    }
                }
            }
        }
    }

    /**
     * Called when the user taps "Install Now" in the update dialog.
     * Persists the version code so the popup won't appear again for this version
     * even if the downloaded APK happens to have the same build version code.
     */
    fun markUpdateInstalled(versionCode: Int) {
        viewModelScope.launch {
            sessionManager.saveInstalledVersionCode(versionCode)
            _updateInfo.value = null
        }
    }

    /** Session-only dismiss — popup reappears on next launch (for "Skip for now"). */
    fun dismissUpdate() {
        _updateInfo.value = null
    }
}
