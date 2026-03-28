package com.cinevault.app.ui.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cinevault.app.data.local.SessionManager
import com.cinevault.app.data.model.*
import com.cinevault.app.data.repository.ContentRepository
import com.cinevault.app.data.repository.ReviewRepository
import com.cinevault.app.data.repository.WatchProgressRepository
import com.cinevault.app.data.repository.WatchlistRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MovieDetailUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val movie: MovieDto? = null,
    val related: List<MovieDto> = emptyList(),
    val seasons: List<SeasonDto> = emptyList(),
    val episodes: List<EpisodeDto> = emptyList(),
    val selectedSeasonId: String? = null,
    val reviews: List<ReviewDto> = emptyList(),
    val isInWatchlist: Boolean = false,
    val isLiked: Boolean = false,
    val selectedTab: Int = 0,
    val watchProgress: WatchProgressDto? = null,
)

@HiltViewModel
class MovieDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val contentRepository: ContentRepository,
    private val watchlistRepository: WatchlistRepository,
    private val reviewRepository: ReviewRepository,
    private val watchProgressRepository: WatchProgressRepository,
    private val sessionManager: SessionManager,
) : ViewModel() {

    private val movieId: String = savedStateHandle.get<String>("movieId") ?: ""

    private val _uiState = MutableStateFlow(MovieDetailUiState())
    val uiState: StateFlow<MovieDetailUiState> = _uiState.asStateFlow()

    init {
        if (movieId.isNotEmpty()) {
            loadMovieDetail()
            observeLikedState()
        }
    }

    private fun observeLikedState() {
        viewModelScope.launch {
            sessionManager.likedMovieIds.collect { ids ->
                _uiState.update { it.copy(isLiked = movieId in ids) }
            }
        }
    }

    fun toggleLike() {
        viewModelScope.launch {
            sessionManager.toggleLikedMovie(movieId)
        }
    }

    private fun loadMovieDetail() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val movieDeferred = async { contentRepository.getMovie(movieId) }
            val relatedDeferred = async { contentRepository.getRelated(movieId) }
            val reviewsDeferred = async { reviewRepository.getReviews(movieId) }

            val profileId = sessionManager.activeProfileId.firstOrNull()
            val watchlistDeferred = if (profileId != null) {
                async { watchlistRepository.isInWatchlist(profileId, movieId) }
            } else null
            val watchProgressDeferred = if (profileId != null) {
                async { watchProgressRepository.getProgress(profileId, movieId) }
            } else null

            when (val movieResult = movieDeferred.await()) {
                is Result.Success -> {
                    val movie = movieResult.data
                    val related = when (val r = relatedDeferred.await()) {
                        is Result.Success -> r.data
                        else -> emptyList()
                    }
                    val reviews = when (val r = reviewsDeferred.await()) {
                        is Result.Success -> r.data
                        else -> emptyList()
                    }
                    val inWatchlist = watchlistDeferred?.let {
                        when (val r = it.await()) {
                            is Result.Success -> r.data
                            else -> false
                        }
                    } ?: false

                    // For series, load the latest episode progress instead of series-level progress
                    val seriesTypes = listOf("web_series", "tv_show", "anime")
                    val watchProgress = if (profileId != null && movie.contentType in seriesTypes) {
                        when (val r = watchProgressRepository.getLatestEpisodeProgress(profileId, movieId)) {
                            is Result.Success -> r.data
                            else -> null
                        }
                    } else {
                        watchProgressDeferred?.let {
                            when (val r = it.await()) {
                                is Result.Success -> r.data
                                else -> null
                            }
                        }
                    }

                    // Load seasons if it's a series
                    android.util.Log.d("MovieDetail", "contentType: ${movie.contentType}, isSeries: ${movie.contentType in seriesTypes}")
                    val seasons = if (movie.contentType in seriesTypes) {
                        when (val r = contentRepository.getSeasons(movieId)) {
                            is Result.Success -> {
                                android.util.Log.d("MovieDetail", "Seasons loaded: ${r.data.size}")
                                r.data
                            }
                            is Result.Error -> {
                                android.util.Log.e("MovieDetail", "Seasons error: ${r.message}")
                                emptyList()
                            }
                            else -> emptyList()
                        }
                    } else emptyList()

                    // Auto-load episodes for first season
                    val firstSeason = seasons.firstOrNull()
                    android.util.Log.d("MovieDetail", "First season: ${firstSeason?.id}, total seasons: ${seasons.size}")
                    val episodes = if (firstSeason != null) {
                        when (val r = contentRepository.getEpisodes(firstSeason.id)) {
                            is Result.Success -> {
                                android.util.Log.d("MovieDetail", "Episodes loaded: ${r.data.size}")
                                r.data
                            }
                            is Result.Error -> {
                                android.util.Log.e("MovieDetail", "Episodes error: ${r.message}")
                                emptyList()
                            }
                            else -> emptyList()
                        }
                    } else emptyList()

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            movie = movie,
                            related = related,
                            seasons = seasons,
                            episodes = episodes,
                            selectedSeasonId = firstSeason?.id,
                            reviews = reviews,
                            isInWatchlist = inWatchlist,
                            watchProgress = watchProgress,
                        )
                    }
                }
                is Result.Error -> {
                    _uiState.update { it.copy(isLoading = false, error = movieResult.message) }
                }
                is Result.Loading -> {}
            }
        }
    }

    fun toggleWatchlist() {
        viewModelScope.launch {
            val profileId = sessionManager.activeProfileId.firstOrNull() ?: return@launch
            val inWatchlist = _uiState.value.isInWatchlist
            val result = if (inWatchlist) {
                watchlistRepository.removeFromWatchlist(profileId, movieId)
            } else {
                watchlistRepository.addToWatchlist(profileId, movieId)
            }
            if (result is Result.Success) {
                _uiState.update { it.copy(isInWatchlist = !inWatchlist) }
            }
        }
    }

    fun submitReview(rating: Double, text: String) {
        viewModelScope.launch {
            when (val result = reviewRepository.createReview(movieId, rating, text)) {
                is Result.Success -> {
                    val updatedReviews = listOf(result.data) + _uiState.value.reviews
                    _uiState.update { it.copy(reviews = updatedReviews) }
                }
                is Result.Error -> _uiState.update { it.copy(error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun selectTab(index: Int) {
        _uiState.update { it.copy(selectedTab = index) }
    }

    fun selectSeason(seasonId: String) {
        if (seasonId == _uiState.value.selectedSeasonId) return
        _uiState.update { it.copy(selectedSeasonId = seasonId, episodes = emptyList()) }
        viewModelScope.launch {
            when (val r = contentRepository.getEpisodes(seasonId)) {
                is Result.Success -> _uiState.update { it.copy(episodes = r.data) }
                else -> {}
            }
        }
    }

    fun refreshProgress() {
        viewModelScope.launch {
            // Small delay to let the player's final save API call complete before we fetch
            delay(2_000)
            val profileId = sessionManager.activeProfileId.firstOrNull() ?: return@launch
            val seriesTypes = listOf("web_series", "tv_show", "anime")
            val isSeries = _uiState.value.movie?.contentType in seriesTypes
            if (isSeries) {
                when (val r = watchProgressRepository.getLatestEpisodeProgress(profileId, movieId)) {
                    is Result.Success -> _uiState.update { it.copy(watchProgress = r.data) }
                    else -> {}
                }
            } else {
                when (val r = watchProgressRepository.getProgress(profileId, movieId)) {
                    is Result.Success -> _uiState.update { it.copy(watchProgress = r.data) }
                    else -> {}
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
