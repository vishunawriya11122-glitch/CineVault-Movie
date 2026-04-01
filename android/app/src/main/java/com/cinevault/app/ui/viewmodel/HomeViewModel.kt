package com.cinevault.app.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cinevault.app.data.local.SessionManager
import com.cinevault.app.data.model.*
import com.cinevault.app.data.remote.CineVaultApi
import com.cinevault.app.data.repository.ContentRepository
import com.cinevault.app.data.repository.WatchProgressRepository
import com.cinevault.app.data.repository.WatchlistRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val banners: List<BannerDto> = emptyList(),
    val tabBanners: List<BannerDto> = emptyList(),
    val homeSections: List<HomeSectionDto> = emptyList(),
    val selectedTab: Int = 0, // 0=Home, 1=Shows, 2=Movies, 3=Anime
    val tabSections: List<HomeSectionDto> = emptyList(),
    val isTabLoading: Boolean = false,
    val continueWatching: List<WatchProgressDto> = emptyList(),
    val showContinuePopup: Boolean = false,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    private val sessionManager: SessionManager,
    private val api: CineVaultApi,
    private val watchProgressRepository: WatchProgressRepository,
    private val watchlistRepository: WatchlistRepository,
) : ViewModel() {

    companion object {
        /** True once the popup has been shown in this app session. Survives config changes. */
        @Volatile
        private var popupShownThisSession = false
    }

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        ensureActiveProfile()
        loadHome()
    }

    private fun ensureActiveProfile() {
        viewModelScope.launch {
            val existing = sessionManager.activeProfileId.firstOrNull()
            if (existing != null) {
                Log.d("CineVaultHome", "Active profile already set: $existing")
                return@launch
            }
            try {
                val profilesResponse = api.getProfiles()
                if (profilesResponse.isSuccessful) {
                    val profiles = profilesResponse.body() ?: emptyList()
                    val profile = profiles.firstOrNull()
                    if (profile != null) {
                        sessionManager.setActiveProfileId(profile.id)
                        Log.d("CineVaultHome", "Auto-selected profile: ${profile.id}")
                    } else {
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
                            Log.d("CineVaultHome", "Created & set default profile: ${newProfile.id}")
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e("CineVaultHome", "Failed to ensure profile", e)
            }
        }
    }

    fun selectTab(index: Int) {
        _uiState.update { it.copy(selectedTab = index) }
        val section = when (index) {
            0 -> "home"
            1 -> "shows"
            2 -> "movies"
            3 -> "anime"
            else -> "home"
        }
        loadTabData(section)
    }

    private fun tabSection(index: Int): String = when (index) {
        0 -> "home"
        1 -> "shows"
        2 -> "movies"
        3 -> "anime"
        else -> "home"
    }

    private fun loadTabData(section: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isTabLoading = true) }

            val bannersDeferred = async { contentRepository.getBanners(section) }
            val feedDeferred = async { contentRepository.getHomeFeed(section) }

            val bannersResult = bannersDeferred.await()
            val feedResult = feedDeferred.await()

            val banners = when (bannersResult) {
                is Result.Success -> bannersResult.data
                else -> emptyList()
            }
            val sections = when (feedResult) {
                is Result.Success -> feedResult.data
                else -> emptyList()
            }

            val bothFailed = bannersResult is Result.Error && feedResult is Result.Error

            _uiState.update {
                it.copy(
                    isTabLoading = false,
                    isRefreshing = false,
                    tabBanners = banners,
                    tabSections = sections,
                    error = if (bothFailed) "Connection failed" else null,
                )
            }
        }
    }

    fun loadContinueWatching() {
        viewModelScope.launch {
            val profileId = sessionManager.activeProfileId.firstOrNull() ?: return@launch
            val result = watchProgressRepository.getContinueWatching(profileId)
            if (result is Result.Success) {
                val items = result.data
                _uiState.update {
                    it.copy(
                        continueWatching = items,
                        showContinuePopup = items.isNotEmpty() && !popupShownThisSession,
                    )
                }
            }
        }
    }

    fun dismissContinuePopup() {
        popupShownThisSession = true
        _uiState.update { it.copy(showContinuePopup = false) }
    }

    fun removeContinueWatching(item: WatchProgressDto) {
        viewModelScope.launch {
            // Delete the watch progress record entirely — does NOT mark as completed
            val id = item.id
            if (id != null) {
                try {
                    api.deleteHistoryItem(id)
                } catch (e: Exception) {
                    Log.w("HomeViewModel", "Failed to delete watch progress: ${e.message}")
                }
            }
            // Remove from local list immediately
            _uiState.update {
                val updated = it.continueWatching.filter { cw -> cw.contentId != item.contentId }
                it.copy(
                    continueWatching = updated,
                    showContinuePopup = if (it.showContinuePopup && updated.isEmpty()) false else it.showContinuePopup,
                )
            }
        }
    }

    fun loadHome() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val section = tabSection(_uiState.value.selectedTab)
            val bannersDeferred = async { contentRepository.getBanners(section) }
            val feedDeferred = async { contentRepository.getHomeFeed(section) }

            val bannersResult = bannersDeferred.await()
            val feedResult = feedDeferred.await()

            val banners = when (bannersResult) {
                is Result.Success -> bannersResult.data
                else -> emptyList()
            }
            val sections = when (feedResult) {
                is Result.Success -> feedResult.data
                else -> emptyList()
            }

            val bothFailed = bannersResult is Result.Error && feedResult is Result.Error
            val errorMsg = if (bothFailed) "Connection failed" else null

            _uiState.update {
                it.copy(
                    isLoading = false,
                    isRefreshing = false,
                    banners = banners,
                    tabBanners = banners,
                    homeSections = sections,
                    tabSections = sections,
                    error = errorMsg,
                )
            }

            // Load continue watching after main content
            loadContinueWatching()
        }
    }

    fun addToWatchlist(contentId: String) {
        viewModelScope.launch {
            val profileId = sessionManager.activeProfileId.firstOrNull() ?: return@launch
            try {
                watchlistRepository.addToWatchlist(profileId, contentId)
            } catch (e: Exception) {
                Log.w("HomeViewModel", "Failed to add to watchlist: ${e.message}")
            }
        }
    }

    fun removeFromWatchlist(contentId: String) {
        viewModelScope.launch {
            val profileId = sessionManager.activeProfileId.firstOrNull() ?: return@launch
            try {
                watchlistRepository.removeFromWatchlist(profileId, contentId)
            } catch (e: Exception) {
                Log.w("HomeViewModel", "Failed to remove from watchlist: ${e.message}")
            }
        }
    }

    fun refresh() {
        _uiState.update { it.copy(isRefreshing = true) }
        val section = tabSection(_uiState.value.selectedTab)
        loadTabData(section)
        loadContinueWatching()
    }
}
