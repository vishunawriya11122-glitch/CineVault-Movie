package com.cinevault.app.ui.viewmodel

import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cinevault.app.data.local.SessionManager
import com.cinevault.app.data.model.*
import com.cinevault.app.data.repository.ContentRepository
import com.cinevault.app.data.repository.WatchProgressRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

data class PlayerUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val movie: MovieDto? = null,
    val streamingUrl: String? = null,
    val fallbackUrls: List<String> = emptyList(), // 3-layer Drive fallback queue
    val episodes: List<EpisodeDto> = emptyList(),
    val currentEpisodeIndex: Int = 0,
    val currentEpisodeTitle: String? = null,
    val showControls: Boolean = true,
    val isPlaying: Boolean = false,
    val currentPosition: Long = 0L,
    val totalDuration: Long = 0L,
    val selectedQuality: String = "auto",
    val availableQualities: List<String> = listOf("auto"),
    val isAdaptive: Boolean = false,
    val playbackSpeed: Float = 1.0f,
    val isFullscreen: Boolean = true,
    val availableAudioTracks: List<String> = emptyList(),
    val selectedAudioTrack: String = "default",
    val isSpeedOverride: Boolean = false,
)

@HiltViewModel
class PlayerViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val contentRepository: ContentRepository,
    private val watchProgressRepository: WatchProgressRepository,
    private val sessionManager: SessionManager,
) : ViewModel() {

    private val contentId: String = savedStateHandle.get<String>("contentId") ?: ""
    private val initialEpisodeId: String? = savedStateHandle.get<String>("episodeId")
    private var currentEpisodeId: String? = initialEpisodeId

    /** When playing an episode, progress is keyed by episodeId not contentId (series id). */
    private val progressId: String get() = currentEpisodeId ?: contentId
    private val isEpisode: Boolean get() = currentEpisodeId != null

    private val _uiState = MutableStateFlow(PlayerUiState())
    val uiState: StateFlow<PlayerUiState> = _uiState.asStateFlow()

    private var progressJob: Job? = null

    /** Scope that survives ViewModel destruction — ensures save HTTP calls complete. */
    private val saveScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    init {
        if (contentId.isNotEmpty()) {
            loadContent()
            startProgressTimer()
            loadEpisodes()
        }
    }

    private fun loadContent() {
        viewModelScope.launch {
            Log.d("CineVaultPlayer", "Loading content: $contentId, episodeId: $currentEpisodeId")
            _uiState.update { it.copy(isLoading = true, error = null) }

            when (val movieResult = contentRepository.getMovie(contentId)) {
                is Result.Success -> {
                    val movie = movieResult.data
                    Log.d("CineVaultPlayer", "Movie loaded: ${movie.title}, hlsUrl=${movie.hlsUrl}, sources=${movie.streamingSources?.size ?: 0}")
                    _uiState.update { it.copy(movie = movie) }

                    // Fetch saved progress BEFORE loading streaming URL
                    // Use episodeId as progress key when playing episode (per-episode tracking)
                    var savedPosition = 0L
                    val profileId = sessionManager.activeProfileId.firstOrNull()
                    if (profileId != null) {
                        when (val progressResult = watchProgressRepository.getProgress(profileId, progressId)) {
                            is Result.Success -> {
                                val progress = progressResult.data
                                if (progress != null && !progress.isCompleted) {
                                    savedPosition = progress.currentTime.toLong()
                                    Log.d("CineVaultPlayer", "Restored saved position: $savedPosition ms")
                                }
                            }
                            else -> Log.w("CineVaultPlayer", "Could not fetch saved progress")
                        }
                    }

                    // If episodeId is provided, load episode streaming sources instead
                    if (!currentEpisodeId.isNullOrBlank()) {
                        Log.d("CineVaultPlayer", "Loading episode: $currentEpisodeId")
                        // Track unique episode view (fire and forget)
                        launch { contentRepository.trackEpisodeView(currentEpisodeId!!) }
                        when (val epResult = contentRepository.getEpisode(currentEpisodeId!!)) {
                            is Result.Success -> {
                                val episode = epResult.data
                                Log.d("CineVaultPlayer", "Episode loaded: ${episode.title}, sources=${episode.streamingSources?.size ?: 0}")
                                episode.streamingSources?.forEachIndexed { i, src ->
                                    Log.d("CineVaultPlayer", "  EpSource[$i]: quality=${src.quality}, url=${src.url.take(100)}")
                                }
                                _uiState.update { it.copy(currentEpisodeTitle = episode.title) }
                                loadStreamingUrl(resumePosition = savedPosition, episodeSources = episode.streamingSources)
                            }
                            is Result.Error -> {
                                Log.e("CineVaultPlayer", "Failed to load episode: ${epResult.message}")
                                // Fallback to movie sources
                                loadStreamingUrl(resumePosition = savedPosition)
                            }
                            else -> {}
                        }
                    } else {
                        loadStreamingUrl(resumePosition = savedPosition)
                    }
                }
                is Result.Error -> {
                    Log.e("CineVaultPlayer", "Failed to load movie: ${movieResult.message}")
                    _uiState.update { it.copy(isLoading = false, error = movieResult.message) }
                }
                is Result.Loading -> {}
            }
        }
    }

    // ── Google Drive 3-Layer Streaming System ──────────────────────────────────

    private fun extractDriveFileId(url: String): String? {
        // /file/d/FILE_ID/
        Regex("drive\\.google\\.com/file/d/([a-zA-Z0-9_-]+)").find(url)?.let {
            return it.groupValues[1]
        }
        // /open?id=FILE_ID
        Regex("drive\\.google\\.com/open\\?id=([a-zA-Z0-9_-]+)").find(url)?.let {
            return it.groupValues[1]
        }
        // /uc?...id=FILE_ID
        Regex("drive\\.google\\.com/uc\\?.*id=([a-zA-Z0-9_-]+)").find(url)?.let {
            return it.groupValues[1]
        }
        // /uc?export=download&id=FILE_ID (another variant)
        Regex("[?&]id=([a-zA-Z0-9_-]+)").find(url)?.let {
            if (url.contains("drive.google.com") || url.contains("docs.google.com")) {
                return it.groupValues[1]
            }
        }
        return null
    }

    /**
     * 3-layer fallback URL set for a Google Drive file ID.
     *   Layer 1 — drive.usercontent.google.com download (primary, best redirect handling)
     *   Layer 2 — docs.google.com uc endpoint (classic fallback)
     *   Layer 3 — drive.google.com uc endpoint (last resort)
     */
    private fun driveStreamingLayers(fileId: String): List<String> = listOf(
        "https://drive.usercontent.google.com/download?id=$fileId&export=download&confirm=t",
        "https://docs.google.com/uc?export=download&id=$fileId&confirm=t",
        "https://drive.google.com/uc?export=download&id=$fileId&confirm=t",
    )

    /**
     * Convert any URL (Drive or direct) to a (primaryUrl, fallbackUrls) pair.
     * For Google Drive URLs, all 3 layers are returned.
     * For non-Drive URLs, returned as-is with an empty fallback list.
     */
    private fun buildStreamWithFallbacks(rawUrl: String): Pair<String, List<String>> {
        val fileId = extractDriveFileId(rawUrl)
        return if (fileId != null) {
            val layers = driveStreamingLayers(fileId)
            Pair(layers.first(), layers.drop(1))
        } else {
            Pair(rawUrl, emptyList())
        }
    }

    /**
     * Called by PlayerScreen when ExoPlayer reports a playback error.
     * If fallback URLs remain, switches to the next one automatically (silent retry).
     * If no more fallbacks, surfaces the error to the UI.
     */
    fun onPlaybackError(errorMessage: String) {
        val fallbacks = _uiState.value.fallbackUrls
        if (fallbacks.isNotEmpty()) {
            val next = fallbacks.first()
            val remaining = fallbacks.drop(1)
            Log.d("CineVaultPlayer", "Playback error — switching to fallback URL (${remaining.size} remaining): ${next.take(100)}")
            _uiState.update { it.copy(
                streamingUrl = next,
                fallbackUrls = remaining,
                error = null,
            ) }
        } else {
            Log.e("CineVaultPlayer", "All streaming layers exhausted: $errorMessage")
            _uiState.update { it.copy(error = errorMessage) }
        }
    }

    private fun loadStreamingUrl(resumePosition: Long = -1L, episodeSources: List<StreamingSourceDto>? = null) {
        viewModelScope.launch {
            val movie = _uiState.value.movie

            // If episode sources are provided, use them directly (with 3-layer Drive fallback)
            if (!episodeSources.isNullOrEmpty()) {
                val source = episodeSources.firstOrNull()
                val rawUrl = source?.url ?: ""
                val (streamUrl, fallbacks) = buildStreamWithFallbacks(rawUrl)
                Log.d("CineVaultPlayer", "Using episode source URL: ${streamUrl.take(150)}, fallbacks: ${fallbacks.size}")
                if (streamUrl.startsWith("http://") || streamUrl.startsWith("https://")) {
                    _uiState.update { it.copy(
                        isLoading = false,
                        streamingUrl = streamUrl,
                        fallbackUrls = fallbacks,
                        availableQualities = listOf(source?.quality ?: "Original"),
                        isAdaptive = false,
                        selectedQuality = source?.quality ?: "Original",
                        currentPosition = if (resumePosition >= 0) resumePosition else it.currentPosition,
                    ) }
                    return@launch
                }
            }

            // Prefer HLS URL for adaptive streaming (auto quality based on internet speed)
            val hlsUrl = movie?.hlsUrl
            if (!hlsUrl.isNullOrBlank()) {
                val qualities = listOf("auto", "1080p", "720p", "480p", "360p")
                _uiState.update { it.copy(
                    isLoading = false,
                    streamingUrl = hlsUrl,
                    availableQualities = qualities,
                    isAdaptive = true,
                    currentPosition = if (resumePosition >= 0) resumePosition else it.currentPosition,
                ) }
                return@launch
            }

            // Fallback: use direct streaming source URL (single file — no quality switching)
            val sources = movie?.streamingSources ?: emptyList()

            // For multiple sources with different qualities, allow switching between them
            val hasMultipleSources = sources.size > 1
            val qualities = if (hasMultipleSources) {
                listOf("auto") + sources.mapNotNull { it.quality }.distinct()
            } else {
                // Single file: just show the detected quality
                val sourceQuality = sources.firstOrNull()?.quality ?: "Original"
                listOf(sourceQuality)
            }

            // Pick source based on selected quality
            val selectedQuality = _uiState.value.selectedQuality
            val source = if (selectedQuality == "auto" || !hasMultipleSources) {
                sources.minByOrNull { it.priority ?: Int.MAX_VALUE }
            } else {
                // Try exact match first, then fall back to best available
                sources.find { it.quality?.lowercase() == selectedQuality.lowercase() }
                    ?: sources.minByOrNull { it.priority ?: Int.MAX_VALUE }
            }

            // Apply 3-layer Drive URL conversion for ALL content types (movies, series, anime, etc.)
            val rawUrl = source?.url ?: ""
            val (streamUrl, fallbacks) = buildStreamWithFallbacks(rawUrl)
            Log.d("CineVaultPlayer", "Movie/content stream: ${streamUrl.take(100)}, ${fallbacks.size} fallback(s)")

            if (streamUrl.startsWith("http://") || streamUrl.startsWith("https://")) {
                _uiState.update { it.copy(
                    isLoading = false,
                    streamingUrl = streamUrl,
                    fallbackUrls = fallbacks,
                    availableQualities = qualities,
                    isAdaptive = hasMultipleSources,
                    selectedQuality = if (!hasMultipleSources) (sources.firstOrNull()?.quality ?: "Original") else it.selectedQuality,
                    currentPosition = if (resumePosition >= 0) resumePosition else it.currentPosition,
                ) }
                return@launch
            }

            val streamPath = streamUrl.ifEmpty { contentId }
            when (val result = watchProgressRepository.getStreamingUrl(streamPath)) {
                is Result.Success -> _uiState.update {
                    it.copy(
                        isLoading = false,
                        streamingUrl = result.data.url,
                        availableQualities = qualities,
                        currentPosition = if (resumePosition >= 0) resumePosition else it.currentPosition,
                    )
                }
                is Result.Error -> _uiState.update {
                    it.copy(isLoading = false, error = result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    fun onPlaybackStateChange(isPlaying: Boolean) {
        _uiState.update { it.copy(isPlaying = isPlaying) }
    }

    // ── Episode Management ──

    private fun loadEpisodes() {
        if (initialEpisodeId == null) return
        viewModelScope.launch {
            val seriesId = contentId
            when (val seasonsResult = contentRepository.getSeasons(seriesId)) {
                is Result.Success -> {
                    val seasons = seasonsResult.data.sortedBy { it.seasonNumber }
                    val allEpisodes = mutableListOf<com.cinevault.app.data.model.EpisodeDto>()
                    for (season in seasons) {
                        when (val epsResult = contentRepository.getEpisodes(season.id)) {
                            is Result.Success -> allEpisodes.addAll(
                                epsResult.data.sortedBy { it.episodeNumber }
                            )
                            else -> {}
                        }
                    }
                    val currentIndex = allEpisodes.indexOfFirst {
                        it.id == currentEpisodeId
                    }.coerceAtLeast(0)
                    _uiState.update {
                        it.copy(
                            episodes = allEpisodes,
                            currentEpisodeIndex = currentIndex,
                        )
                    }
                    Log.d("CineVaultPlayer", "Loaded ${allEpisodes.size} episodes, current index: $currentIndex")
                }
                else -> Log.w("CineVaultPlayer", "Could not load episodes for series $seriesId")
            }
        }
    }

    fun playEpisode(episode: com.cinevault.app.data.model.EpisodeDto) {
        saveProgressNow()
        currentEpisodeId = episode.id
        viewModelScope.launch {
            // Track unique episode view (fire and forget)
            launch { contentRepository.trackEpisodeView(episode.id) }
            _uiState.update {
                it.copy(
                    currentEpisodeIndex = it.episodes.indexOf(episode).coerceAtLeast(0),
                    currentEpisodeTitle = episode.title,
                    currentPosition = 0,
                    totalDuration = 0,
                    isLoading = true,
                    error = null,
                )
            }
            // Fetch saved progress for this episode
            var savedPosition = 0L
            val profileId = sessionManager.activeProfileId.firstOrNull()
            if (profileId != null) {
                when (val progressResult = watchProgressRepository.getProgress(profileId, episode.id)) {
                    is Result.Success -> {
                        val progress = progressResult.data
                        if (progress != null && !progress.isCompleted) {
                            savedPosition = progress.currentTime.toLong()
                        }
                    }
                    else -> {}
                }
            }
            when (val result = contentRepository.getEpisode(episode.id)) {
                is Result.Success -> {
                    loadStreamingUrl(resumePosition = savedPosition, episodeSources = result.data.streamingSources)
                }
                is Result.Error -> {
                    _uiState.update { it.copy(isLoading = false, error = result.message) }
                }
                else -> {}
            }
        }
    }

    fun playNextEpisode() {
        val state = _uiState.value
        val nextIndex = state.currentEpisodeIndex + 1
        if (nextIndex < state.episodes.size) {
            playEpisode(state.episodes[nextIndex])
        }
    }

    fun onPositionChange(position: Long, duration: Long) {
        _uiState.update { it.copy(currentPosition = position, totalDuration = duration) }
    }

    private fun startProgressTimer() {
        progressJob?.cancel()
        progressJob = viewModelScope.launch {
            // Wait 20s before first save to let the player seek to saved position
            delay(20_000)
            while (true) {
                val state = _uiState.value
                // Save regardless of play/pause — just need a valid position and duration
                if (state.totalDuration <= 0 || state.currentPosition <= 0) {
                    delay(15_000)
                    continue
                }
                val profileId = sessionManager.activeProfileId.firstOrNull()
                if (profileId == null) {
                    Log.w("CineVaultPlayer", "Timer: profileId is NULL — cannot save progress!")
                    delay(15_000)
                    continue
                }
                Log.d("CineVaultPlayer", "Timer saving progress: ${state.currentPosition}/${state.totalDuration} profileId=$profileId")
                watchProgressRepository.updateProgress(
                    contentId = progressId,
                    profileId = profileId,
                    position = state.currentPosition,
                    duration = state.totalDuration,
                    contentTitle = state.movie?.title,
                    thumbnailUrl = state.movie?.posterUrl,
                    contentType = if (isEpisode) "episode" else "movie",
                    seriesId = if (isEpisode) contentId else null,
                    episodeTitle = state.currentEpisodeTitle,
                )
                delay(15_000)
            }
        }
    }

    /** Called when user presses Back — pass real ExoPlayer values directly.
     *  Uses NonCancellable so the HTTP save survives ViewModel destruction. */
    fun saveExplicitProgress(position: Long, duration: Long) {
        if (duration <= 0) return
        // Use a scope that survives ViewModel clearing
        saveScope.launch {
            withContext(NonCancellable) {
                val state = _uiState.value
                val profileId = sessionManager.activeProfileId.firstOrNull()
                if (profileId == null) {
                    Log.e("CineVaultPlayer", "Explicit save FAILED: profileId is NULL!")
                    return@withContext
                }
                Log.d("CineVaultPlayer", "Explicit save: $position/$duration title=${state.movie?.title} profileId=$profileId")
                watchProgressRepository.updateProgress(
                    contentId = progressId,
                    profileId = profileId,
                    position = position,
                    duration = duration,
                    contentTitle = state.movie?.title,
                    thumbnailUrl = state.movie?.posterUrl,
                    contentType = if (isEpisode) "episode" else "movie",
                    seriesId = if (isEpisode) contentId else null,
                    episodeTitle = state.currentEpisodeTitle,
                )
                Log.d("CineVaultPlayer", "Explicit save COMPLETED")
            }
        }
    }

    fun saveProgressNow() {
        saveScope.launch {
            withContext(NonCancellable) {
                val state = _uiState.value
                val profileId = sessionManager.activeProfileId.firstOrNull()
                if (profileId == null) {
                    Log.e("CineVaultPlayer", "saveProgressNow FAILED: profileId is NULL!")
                    return@withContext
                }
                if (state.totalDuration > 0 && state.currentPosition > 0) {
                    Log.d("CineVaultPlayer", "saveProgressNow: ${state.currentPosition}/${state.totalDuration} profileId=$profileId")
                    watchProgressRepository.updateProgress(
                        contentId = progressId,
                        profileId = profileId,
                        position = state.currentPosition,
                        duration = state.totalDuration,
                        contentTitle = state.movie?.title,
                        thumbnailUrl = state.movie?.posterUrl,
                        contentType = if (isEpisode) "episode" else "movie",
                        seriesId = if (isEpisode) contentId else null,
                        episodeTitle = state.currentEpisodeTitle,
                    )
                    Log.d("CineVaultPlayer", "saveProgressNow COMPLETED")
                }
            }
        }
    }

    fun toggleControls() {
        _uiState.update { it.copy(showControls = !it.showControls) }
    }

    fun setQuality(quality: String) {
        val oldQuality = _uiState.value.selectedQuality
        _uiState.update { it.copy(selectedQuality = quality) }
        // For multiple sources (non-HLS), reload URL with new quality source
        val movie = _uiState.value.movie
        if (movie?.hlsUrl.isNullOrBlank() && (movie?.streamingSources?.size ?: 0) > 1 && quality != oldQuality) {
            val currentPos = _uiState.value.currentPosition
            loadStreamingUrl(resumePosition = currentPos)
        }
    }

    fun setPlaybackSpeed(speed: Float) {
        _uiState.update { it.copy(playbackSpeed = speed) }
    }

    fun setSpeedOverride(active: Boolean) {
        _uiState.update { it.copy(isSpeedOverride = active) }
    }

    fun toggleFullscreen() {
        _uiState.update { it.copy(isFullscreen = !it.isFullscreen) }
    }

    fun seekTo(positionMs: Long) {
        _uiState.update { it.copy(currentPosition = positionMs) }
    }

    override fun onCleared() {
        super.onCleared()
        progressJob?.cancel()
        // Final save using the persistent scope
        val state = _uiState.value
        if (state.totalDuration > 0 && state.currentPosition > 0) {
            saveScope.launch {
                withContext(NonCancellable) {
                    val profileId = sessionManager.activeProfileId.firstOrNull()
                    if (profileId == null) {
                        Log.e("CineVaultPlayer", "onCleared final save FAILED: profileId is NULL!")
                        return@withContext
                    }
                    Log.d("CineVaultPlayer", "onCleared final save: ${state.currentPosition}/${state.totalDuration} profileId=$profileId")
                    watchProgressRepository.updateProgress(
                        contentId = progressId,
                        profileId = profileId,
                        position = state.currentPosition,
                        duration = state.totalDuration,
                        contentTitle = state.movie?.title,
                        thumbnailUrl = state.movie?.posterUrl,
                        contentType = if (isEpisode) "episode" else "movie",
                        seriesId = if (isEpisode) contentId else null,
                        episodeTitle = state.currentEpisodeTitle,
                    )
                    Log.d("CineVaultPlayer", "onCleared final save COMPLETED")
                }
            }
        }
    }
}
