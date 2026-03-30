package com.cinevault.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cinevault.app.data.local.SessionManager
import com.cinevault.app.data.model.*
import com.cinevault.app.data.repository.AuthRepository
import com.cinevault.app.data.repository.ContentRepository
import com.cinevault.app.data.repository.ProfileRepository
import com.cinevault.app.data.repository.WatchProgressRepository
import com.cinevault.app.data.repository.WatchlistRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val profiles: List<ProfileDto> = emptyList(),
    val activeProfile: ProfileDto? = null,
    val watchHistory: List<WatchProgressDto> = emptyList(),
    val watchlist: List<MovieDto> = emptyList(),
    val likedMovies: List<MovieDto> = emptyList(),
    val userName: String = "",
    val userEmail: String = "",
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
    private val watchProgressRepository: WatchProgressRepository,
    private val watchlistRepository: WatchlistRepository,
    private val contentRepository: ContentRepository,
    private val authRepository: AuthRepository,
    private val sessionManager: SessionManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfiles()
        loadUserInfo()
        loadLikedMovies()
    }

    private fun loadUserInfo() {
        viewModelScope.launch {
            sessionManager.userName.collect { name ->
                _uiState.update { it.copy(userName = name ?: "") }
            }
        }
        viewModelScope.launch {
            sessionManager.userEmail.collect { email ->
                _uiState.update { it.copy(userEmail = email ?: "") }
            }
        }
    }

    private fun loadLikedMovies() {
        viewModelScope.launch {
            sessionManager.likedMovieIds.collect { ids ->
                val movies = ids.mapNotNull { id ->
                    when (val r = contentRepository.getMovie(id)) {
                        is Result.Success -> r.data
                        else -> null
                    }
                }
                _uiState.update { it.copy(likedMovies = movies) }
            }
        }
    }

    fun loadProfiles() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            when (val result = profileRepository.getProfiles()) {
                is Result.Success -> {
                    val activeId = sessionManager.activeProfileId.firstOrNull()
                    val active = result.data.find { it.id == activeId } ?: result.data.firstOrNull()
                    _uiState.update {
                        it.copy(isLoading = false, profiles = result.data, activeProfile = active)
                    }
                    // Persist the active profile selection so other ViewModels can use it
                    active?.let {
                        sessionManager.setActiveProfileId(it.id)
                        loadProfileContent(it.id)
                    }
                }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    private fun loadProfileContent(profileId: String) {
        viewModelScope.launch {
            val history = when (val r = watchProgressRepository.getWatchHistory(profileId)) {
                is Result.Success -> r.data
                else -> emptyList()
            }
            val watchlist = when (val r = watchlistRepository.getWatchlist(profileId)) {
                is Result.Success -> r.data
                else -> emptyList()
            }
            _uiState.update { it.copy(watchHistory = history, watchlist = watchlist) }
        }
    }

    fun selectProfile(profile: ProfileDto) {
        viewModelScope.launch {
            sessionManager.setActiveProfileId(profile.id)
            _uiState.update { it.copy(activeProfile = profile) }
            loadProfileContent(profile.id)
        }
    }

    fun createProfile(name: String, avatarUrl: String?, maturityRating: String) {
        viewModelScope.launch {
            when (val result = profileRepository.createProfile(name, avatarUrl, maturityRating)) {
                is Result.Success -> loadProfiles()
                is Result.Error -> _uiState.update { it.copy(error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun deleteProfile(profileId: String) {
        viewModelScope.launch {
            when (val result = profileRepository.deleteProfile(profileId)) {
                is Result.Success -> loadProfiles()
                is Result.Error -> _uiState.update { it.copy(error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun deleteHistoryItem(itemId: String) {
        viewModelScope.launch {
            when (authRepository.deleteHistoryItem(itemId)) {
                is Result.Success -> {
                    _uiState.update { state ->
                        state.copy(watchHistory = state.watchHistory.filter { it.id != itemId })
                    }
                }
                is Result.Error -> {}
                is Result.Loading -> {}
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
