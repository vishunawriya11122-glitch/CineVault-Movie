package com.cinevault.app.ui.screen

import android.app.Activity
import android.content.Context
import android.content.pm.ActivityInfo
import android.media.AudioManager
import android.view.WindowManager
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.zIndex
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.hilt.navigation.compose.hiltViewModel
import android.util.Log
import androidx.activity.compose.BackHandler
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import androidx.media3.ui.PlayerView
import com.cinevault.app.ui.viewmodel.PlayerViewModel
import kotlinx.coroutines.delay
import java.util.Locale

// ===========================================================================
// OBSIDIAN ULTRA - CineVault Premium Player (Blended Theme)
// ===========================================================================

// -- App-Themed Colors (CineVault Purple + Gold + Obsidian accents) --
private val CyanAccent = Color(0xFF00D9FF)
private val PurpleAccent = Color(0xFF9B59B6)
private val GoldAccent = Color(0xFFD4AF37)
private val BackgroundDark = Color(0xFF121212)
private val SurfaceElevated = Color(0xFF2A2A2A)
private val BorderSubtle = Color(0xFF3A3A3A)
private val TextDim = Color(0xB3B0A3C4)

private val AccentGrad = Brush.horizontalGradient(listOf(CyanAccent, PurpleAccent))

// -- Helpers --
private fun formatDuration(ms: Long): String {
    val totalSeconds = ms / 1000
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) String.format("%d:%02d:%02d", hours, minutes, seconds)
    else String.format("%d:%02d", minutes, seconds)
}

private data class AudioTrackInfo(
    val label: String,
    val language: String?,
    val groupIndex: Int,
    val trackIndex: Int,
)

// ===========================================================================
// MAIN PLAYER SCREEN
// ===========================================================================

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
@Composable
fun PlayerScreen(
    onBack: () -> Unit,
    viewModel: PlayerViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val activity = context as? Activity

    // Force landscape
    DisposableEffect(Unit) {
        activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        onDispose {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    }

    // Immersive mode
    DisposableEffect(Unit) {
        val window = activity?.window ?: return@DisposableEffect onDispose {}
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val insetsController = WindowInsetsControllerCompat(window, window.decorView)
        insetsController.hide(WindowInsetsCompat.Type.systemBars())
        insetsController.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose {
            insetsController.show(WindowInsetsCompat.Type.systemBars())
            WindowCompat.setDecorFitsSystemWindows(window, true)
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    // -- ExoPlayer Setup --
    val trackSelector = remember { DefaultTrackSelector(context) }
    val exoPlayer = remember {
        val httpFactory = DefaultHttpDataSource.Factory()
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(15_000)
            .setReadTimeoutMs(30_000)
            .setUserAgent("Mozilla/5.0 (Linux; Android) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")
        ExoPlayer.Builder(context)
            .setMediaSourceFactory(DefaultMediaSourceFactory(httpFactory))
            .setTrackSelector(trackSelector)
            .build()
            .apply { playWhenReady = true }
    }

    var autoQualityLabel by remember { mutableStateOf("Auto") }
    var playerError by remember { mutableStateOf<String?>(null) }

    // Error & state listener
    DisposableEffect(exoPlayer) {
        val listener = object : Player.Listener {
            override fun onPlayerError(error: PlaybackException) {
                Log.e("CineVaultPlayer", "Playback error: ${error.errorCodeName} - ${error.message}", error)
                viewModel.onPlaybackError("Playback error: ${error.errorCodeName}\n${error.message ?: "Unknown error"}")
            }
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED) {
                    val dur = exoPlayer.duration.coerceAtLeast(1)
                    viewModel.saveExplicitProgress(dur, dur)
                }
            }
        }
        exoPlayer.addListener(listener)
        onDispose { exoPlayer.removeListener(listener) }
    }

    // System back
    BackHandler {
        viewModel.saveExplicitProgress(exoPlayer.currentPosition, exoPlayer.duration.coerceAtLeast(0))
        onBack()
    }

    // Quality track selector
    LaunchedEffect(uiState.selectedQuality) {
        val quality = uiState.selectedQuality
        if (quality == "auto") {
            exoPlayer.trackSelectionParameters = exoPlayer.trackSelectionParameters
                .buildUpon()
                .setMaxVideoSize(Int.MAX_VALUE, Int.MAX_VALUE)
                .setForceHighestSupportedBitrate(false)
                .setForceLowestBitrate(false)
                .build()
        } else {
            val maxHeight = quality.replace("p", "").toIntOrNull() ?: Int.MAX_VALUE
            exoPlayer.trackSelectionParameters = exoPlayer.trackSelectionParameters
                .buildUpon()
                .setMaxVideoSize(Int.MAX_VALUE, maxHeight)
                .setForceHighestSupportedBitrate(false)
                .setForceLowestBitrate(maxHeight <= 360)
                .build()
        }
    }

    // Auto quality label
    LaunchedEffect(exoPlayer) {
        while (true) {
            delay(2000)
            val videoHeight = exoPlayer.videoFormat?.height ?: 0
            autoQualityLabel = when {
                videoHeight >= 2160 -> "Auto (2160p)"
                videoHeight >= 1440 -> "Auto (1440p)"
                videoHeight >= 1080 -> "Auto (1080p)"
                videoHeight >= 720 -> "Auto (720p)"
                videoHeight >= 480 -> "Auto (480p)"
                videoHeight > 0 -> "Auto (${videoHeight}p)"
                else -> "Auto"
            }
        }
    }

    // Media URL loading
    LaunchedEffect(uiState.streamingUrl) {
        uiState.streamingUrl?.let { url ->
            Log.d("CineVaultPlayer", "Loading URL: $url")
            playerError = null
            exoPlayer.stop()
            val resumePos = uiState.currentPosition
            exoPlayer.setMediaItem(MediaItem.fromUri(url))
            exoPlayer.prepare()
            if (resumePos > 0) {
                var waitCount = 0
                while (exoPlayer.playbackState != Player.STATE_READY && exoPlayer.playerError == null && waitCount < 300) {
                    delay(100); waitCount++
                }
                if (exoPlayer.playbackState == Player.STATE_READY) exoPlayer.seekTo(resumePos)
            }
        }
    }

    // Playback speed sync
    LaunchedEffect(uiState.playbackSpeed, uiState.isSpeedOverride) {
        exoPlayer.setPlaybackSpeed(if (uiState.isSpeedOverride) 2.0f else uiState.playbackSpeed)
    }

    // Position tracking & audio track discovery
    var audioTracks by remember { mutableStateOf<List<AudioTrackInfo>>(emptyList()) }
    var selectedAudioIndex by remember { mutableIntStateOf(0) }
    var bufferedPosition by remember { mutableLongStateOf(0L) }
    var isBuffering by remember { mutableStateOf(false) }

    // Buffering state listener
    DisposableEffect(exoPlayer) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                isBuffering = playbackState == Player.STATE_BUFFERING
            }
        }
        exoPlayer.addListener(listener)
        onDispose { exoPlayer.removeListener(listener) }
    }

    LaunchedEffect(exoPlayer) {
        while (true) {
            delay(1000)
            val dur = exoPlayer.duration.coerceAtLeast(0)
            val pos = exoPlayer.currentPosition
            if (dur > 0) viewModel.onPositionChange(pos, dur)
            viewModel.onPlaybackStateChange(exoPlayer.isPlaying)
            bufferedPosition = exoPlayer.bufferedPosition

            // Discover audio tracks
            val discovered = mutableListOf<AudioTrackInfo>()
            var globalGroupIdx = 0
            for (group in exoPlayer.currentTracks.groups) {
                if (group.type == C.TRACK_TYPE_AUDIO) {
                    for (i in 0 until group.length) {
                        val format = group.getTrackFormat(i)
                        val lang = format.language
                        val label = format.label ?: if (lang != null) {
                            val locale = Locale.forLanguageTag(lang)
                            val displayName = locale.getDisplayLanguage(Locale.ENGLISH)
                            if (displayName.isNotBlank() && displayName != lang) displayName else lang.uppercase()
                        } else "Track ${discovered.size + 1}"
                        discovered.add(AudioTrackInfo(label, lang, globalGroupIdx, i))
                    }
                }
                globalGroupIdx++
            }
            if (discovered.isNotEmpty() && discovered.map { it.label } != audioTracks.map { it.label }) {
                audioTracks = discovered
            }

            // Discover video qualities from HLS renditions
            val videoQualities = mutableListOf<String>()
            for (group in exoPlayer.currentTracks.groups) {
                if (group.type == C.TRACK_TYPE_VIDEO) {
                    for (i in 0 until group.length) {
                        val height = group.getTrackFormat(i).height
                        if (height > 0) {
                            val label = "${height}p"
                            if (label !in videoQualities) videoQualities.add(label)
                        }
                    }
                }
            }
            if (videoQualities.isNotEmpty()) {
                viewModel.updateAvailableQualities(videoQualities)
            }
        }
    }

    // Save progress on leave
    DisposableEffect(Unit) {
        onDispose {
            viewModel.saveExplicitProgress(exoPlayer.currentPosition, exoPlayer.duration.coerceAtLeast(0))
            exoPlayer.release()
        }
    }

    // Auto-hide controls
    LaunchedEffect(uiState.showControls) {
        if (uiState.showControls && uiState.isPlaying) {
            delay(4000)
            viewModel.toggleControls()
        }
    }

    // -- UI State --
    var doubleTapLabel by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(doubleTapLabel) {
        if (doubleTapLabel != null) { delay(800); doubleTapLabel = null }
    }

    var isLocked by remember { mutableStateOf(false) }
    var showQualityPopup by remember { mutableStateOf(false) }
    var showSpeedPopup by remember { mutableStateOf(false) }
    var showAudioPopup by remember { mutableStateOf(false) }
    var showEpisodePopup by remember { mutableStateOf(false) }

    // -- Toast --
    var toastMessage by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(toastMessage) {
        if (toastMessage != null) { delay(1600); toastMessage = null }
    }

    // -- Brightness & Volume (Gesture-based) --
    val audioManager = remember { context.getSystemService(Context.AUDIO_SERVICE) as AudioManager }
    val maxVolume = remember { audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC) }
    var currentVolume by remember {
        mutableFloatStateOf(audioManager.getStreamVolume(AudioManager.STREAM_MUSIC).toFloat() / maxVolume)
    }
    var currentBrightness by remember {
        mutableFloatStateOf(
            activity?.window?.attributes?.screenBrightness?.let { if (it < 0) 0.5f else it } ?: 0.5f
        )
    }
    var showVolumeIndicator by remember { mutableStateOf(false) }
    var showBrightnessIndicator by remember { mutableStateOf(false) }
    var isDraggingLeft by remember { mutableStateOf(false) }

    LaunchedEffect(showVolumeIndicator) {
        if (showVolumeIndicator) { delay(1800); showVolumeIndicator = false }
    }
    LaunchedEffect(showBrightnessIndicator) {
        if (showBrightnessIndicator) { delay(1800); showBrightnessIndicator = false }
    }

    // -- Center play/pause flash --
    var centerFlashIcon by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(centerFlashIcon) {
        if (centerFlashIcon != null) { delay(700); centerFlashIcon = null }
    }

    // ===========================================================================
    // MAIN LAYOUT
    // ===========================================================================
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            // -- Gestures: tap, double-tap, long-press --
            .pointerInput(isLocked) {
                if (isLocked) return@pointerInput
                val screenWidth = size.width
                detectTapGestures(
                    onTap = { viewModel.toggleControls() },
                    onDoubleTap = { offset ->
                        if (offset.x < screenWidth / 2) {
                            exoPlayer.seekTo((exoPlayer.currentPosition - 10_000).coerceAtLeast(0))
                            doubleTapLabel = "bk"
                        } else {
                            exoPlayer.seekTo(exoPlayer.currentPosition + 10_000)
                            doubleTapLabel = "fw"
                        }
                    },
                    onLongPress = { viewModel.setSpeedOverride(true) },
                )
            }
            // -- Long-press release --
            .pointerInput(isLocked) {
                if (isLocked) return@pointerInput
                awaitPointerEventScope {
                    while (true) {
                        val event = awaitPointerEvent()
                        if (event.changes.all { !it.pressed }) viewModel.setSpeedOverride(false)
                    }
                }
            }
            // -- Vertical swipe: LEFT = Volume, RIGHT = Brightness --
            .pointerInput(isLocked) {
                if (isLocked) return@pointerInput
                val screenWidth = size.width
                val screenHeight = size.height.toFloat()
                detectVerticalDragGestures(
                    onDragStart = { offset ->
                        isDraggingLeft = offset.x < screenWidth / 2
                        if (isDraggingLeft) showVolumeIndicator = true
                        else showBrightnessIndicator = true
                    },
                    onDragEnd = { },
                    onVerticalDrag = { change, dragAmount ->
                        change.consume()
                        val delta = -dragAmount / screenHeight * 1.5f
                        if (isDraggingLeft) {
                            currentVolume = (currentVolume + delta).coerceIn(0f, 1f)
                            audioManager.setStreamVolume(
                                AudioManager.STREAM_MUSIC,
                                (currentVolume * maxVolume).toInt(),
                                0,
                            )
                            showVolumeIndicator = true
                        } else {
                            currentBrightness = (currentBrightness + delta).coerceIn(0.01f, 1f)
                            activity?.window?.let { w ->
                                val params = w.attributes
                                params.screenBrightness = currentBrightness
                                w.attributes = params
                            }
                            showBrightnessIndicator = true
                        }
                    },
                )
            },
    ) {
        // ================================================================
        // LOADING STATE
        // ================================================================
        if (uiState.isLoading) {
            ObsidianLoadingOverlay()
        }
        // ================================================================
        // ERROR STATE
        // ================================================================
        else if (uiState.error != null || playerError != null) {
            ObsidianErrorOverlay(
                errorMessage = playerError ?: uiState.error ?: "Unknown error",
                streamUrl = uiState.streamingUrl,
                onBack = onBack,
            )
        }
        // ================================================================
        // PLAYER
        // ================================================================
        else {
            // -- Video surface --
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        player = exoPlayer
                        useController = false
                    }
                },
                modifier = Modifier.fillMaxSize(),
            )

            // -- Buffering Overlay --
            AnimatedVisibility(
                visible = isBuffering && !uiState.isLoading,
                enter = fadeIn(animationSpec = tween(350)),
                exit = fadeOut(animationSpec = tween(350)),
            ) {
                ObsidianBufferingOverlay()
            }

            // -- Volume Indicator (LEFT side) --
            AnimatedVisibility(
                visible = showVolumeIndicator,
                enter = fadeIn() + slideInHorizontally { -it },
                exit = fadeOut() + slideOutHorizontally { -it },
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .padding(start = 22.dp),
            ) {
                ObsidianGesturePanel(
                    icon = when {
                        currentVolume == 0f -> Icons.Filled.VolumeOff
                        currentVolume < 0.5f -> Icons.Filled.VolumeDown
                        else -> Icons.Filled.VolumeUp
                    },
                    value = currentVolume,
                    accentColor = CyanAccent,
                )
            }

            // -- Brightness Indicator (RIGHT side) --
            AnimatedVisibility(
                visible = showBrightnessIndicator,
                enter = fadeIn() + slideInHorizontally { it },
                exit = fadeOut() + slideOutHorizontally { it },
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .padding(end = 22.dp),
            ) {
                ObsidianGesturePanel(
                    icon = if (currentBrightness < 0.3f) Icons.Filled.BrightnessLow
                    else Icons.Filled.BrightnessHigh,
                    value = currentBrightness,
                    accentColor = GoldAccent,
                )
            }

            // -- Double-tap seek flash (LEFT) --
            AnimatedVisibility(
                visible = doubleTapLabel == "bk",
                enter = fadeIn() + scaleIn(initialScale = 0.5f),
                exit = fadeOut() + scaleOut(targetScale = 0.5f),
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .padding(start = 60.dp),
            ) {
                ObsidianSeekBubble(symbol = "\u27EA", label = "\u221210s")
            }

            // -- Double-tap seek flash (RIGHT) --
            AnimatedVisibility(
                visible = doubleTapLabel == "fw",
                enter = fadeIn() + scaleIn(initialScale = 0.5f),
                exit = fadeOut() + scaleOut(targetScale = 0.5f),
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .padding(end = 60.dp),
            ) {
                ObsidianSeekBubble(symbol = "\u27EB", label = "+10s")
            }

            // -- Center play/pause flash --
            AnimatedVisibility(
                visible = centerFlashIcon != null,
                enter = fadeIn() + scaleIn(initialScale = 0.6f, animationSpec = spring(Spring.DampingRatioMediumBouncy)),
                exit = fadeOut(),
                modifier = Modifier.align(Alignment.Center),
            ) {
                Surface(
                    shape = CircleShape,
                    color = Color.Black.copy(alpha = 0.55f),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.15f)),
                    modifier = Modifier.size(90.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            if (centerFlashIcon == "pause") Icons.Filled.Pause else Icons.Filled.PlayArrow,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(36.dp),
                        )
                    }
                }
            }

            // -- 2x Speed Indicator --
            AnimatedVisibility(
                visible = uiState.isSpeedOverride,
                enter = fadeIn() + slideInVertically { -it },
                exit = fadeOut() + slideOutVertically { -it },
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 14.dp),
            ) {
                Box(
                    modifier = Modifier
                        .background(AccentGrad, RoundedCornerShape(20.dp))
                        .padding(horizontal = 18.dp, vertical = 6.dp),
                ) {
                    Text(
                        "\u26A1 2\u00D7 Speed",
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                    )
                }
            }

            // -- Toast --
            AnimatedVisibility(
                visible = toastMessage != null,
                enter = fadeIn() + scaleIn(initialScale = 0.9f),
                exit = fadeOut(),
                modifier = Modifier.align(Alignment.Center).zIndex(70f),
            ) {
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = BackgroundDark.copy(alpha = 0.92f),
                    border = BorderStroke(1.dp, BorderSubtle),
                ) {
                    Text(
                        toastMessage ?: "",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(horizontal = 22.dp, vertical = 12.dp),
                    )
                }
            }

            // ============================================================
            // CONTROLS OVERLAY
            // ============================================================
            if (!isLocked) {
                AnimatedVisibility(
                    visible = uiState.showControls,
                    enter = fadeIn(animationSpec = tween(400)),
                    exit = fadeOut(animationSpec = tween(400)),
                ) {
                    Box(modifier = Modifier.fillMaxSize()) {
                        // Bottom gradient
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .fillMaxHeight(0.48f)
                                .align(Alignment.BottomCenter)
                                .background(
                                    Brush.verticalGradient(
                                        listOf(
                                            Color.Transparent,
                                            Color.Black.copy(alpha = 0.35f),
                                            Color.Black.copy(alpha = 0.92f),
                                        )
                                    )
                                ),
                        )

                        // Top gradient
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(100.dp)
                                .align(Alignment.TopCenter)
                                .background(
                                    Brush.verticalGradient(
                                        listOf(
                                            Color.Black.copy(alpha = 0.85f),
                                            Color.Transparent,
                                        )
                                    )
                                ),
                        )

                        // -- Title Bar --
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .align(Alignment.TopStart)
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            IconButton(onClick = {
                                viewModel.saveExplicitProgress(
                                    exoPlayer.currentPosition,
                                    exoPlayer.duration.coerceAtLeast(0),
                                )
                                onBack()
                            }) {
                                Icon(
                                    Icons.AutoMirrored.Filled.ArrowBack,
                                    contentDescription = "Back",
                                    tint = Color.White,
                                )
                            }

                            // Quality badge
                            val qBadge = when (uiState.selectedQuality) {
                                "auto" -> {
                                    val h = exoPlayer.videoFormat?.height ?: 0
                                    when {
                                        h >= 2160 -> "4K HDR"
                                        h >= 1440 -> "2K QHD"
                                        h >= 1080 -> "FHD"
                                        h >= 720 -> "HD"
                                        h >= 480 -> "SD"
                                        else -> "HD"
                                    }
                                }
                                "2160p" -> "4K"
                                "1440p" -> "2K"
                                "1080p" -> "FHD"
                                "720p" -> "HD"
                                else -> "SD"
                            }
                            Box(
                                modifier = Modifier
                                    .padding(end = 12.dp)
                                    .background(AccentGrad, RoundedCornerShape(5.dp))
                                    .padding(horizontal = 11.dp, vertical = 4.dp),
                            ) {
                                Text(
                                    qBadge,
                                    color = Color.White,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.5.sp,
                                )
                            }

                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(end = 8.dp),
                            ) {
                                Text(
                                    uiState.movie?.title ?: "",
                                    color = Color.White,
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                if (!uiState.currentEpisodeTitle.isNullOrBlank()) {
                                    Text(
                                        uiState.currentEpisodeTitle ?: "",
                                        color = TextDim,
                                        fontSize = 12.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        letterSpacing = 0.5.sp,
                                    )
                                }
                            }
                        }

                        // -- Center Controls --
                        Row(
                            modifier = Modifier.align(Alignment.Center),
                            horizontalArrangement = Arrangement.spacedBy(44.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            IconButton(onClick = {
                                exoPlayer.seekTo((exoPlayer.currentPosition - 10_000).coerceAtLeast(0))
                                doubleTapLabel = "bk"
                            }) {
                                Icon(Icons.Filled.Replay10, contentDescription = "Rewind 10s", tint = Color.White, modifier = Modifier.size(42.dp))
                            }

                            Surface(
                                shape = CircleShape,
                                color = Color.White.copy(alpha = 0.1f),
                                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.14f)),
                                modifier = Modifier.size(60.dp),
                            ) {
                                IconButton(
                                    onClick = {
                                        if (exoPlayer.isPlaying) {
                                            exoPlayer.pause()
                                            centerFlashIcon = "pause"
                                        } else {
                                            exoPlayer.play()
                                            centerFlashIcon = "play"
                                        }
                                    },
                                    modifier = Modifier.fillMaxSize(),
                                ) {
                                    Icon(
                                        if (uiState.isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                                        contentDescription = if (uiState.isPlaying) "Pause" else "Play",
                                        tint = Color.White,
                                        modifier = Modifier.size(32.dp),
                                    )
                                }
                            }

                            IconButton(onClick = {
                                exoPlayer.seekTo(exoPlayer.currentPosition + 10_000)
                                doubleTapLabel = "fw"
                            }) {
                                Icon(Icons.Filled.Forward10, contentDescription = "Forward 10s", tint = Color.White, modifier = Modifier.size(42.dp))
                            }
                        }

                        // -- Bottom Section --
                        Column(
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .fillMaxWidth()
                                .padding(horizontal = 22.dp)
                                .padding(bottom = 14.dp),
                        ) {
                            // -- Progress Bar --
                            ObsidianProgressBar(
                                currentPosition = uiState.currentPosition,
                                totalDuration = uiState.totalDuration,
                                bufferedPosition = bufferedPosition,
                                onSeek = { fraction ->
                                    val seekPos = (fraction * uiState.totalDuration).toLong()
                                    exoPlayer.seekTo(seekPos)
                                    viewModel.seekTo(seekPos)
                                },
                            )

                            Spacer(Modifier.height(6.dp))

                            // -- Time display --
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(
                                    formatDuration(uiState.currentPosition),
                                    fontSize = 12.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = Color.White,
                                )
                                Text(
                                    formatDuration(uiState.totalDuration),
                                    fontSize = 12.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = TextDim,
                                )
                            }

                            Spacer(Modifier.height(10.dp))

                            // -- Toolbar --
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceEvenly,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                ObsidianToolbarButton(
                                    icon = Icons.Filled.Speed,
                                    label = if (uiState.playbackSpeed == 1.0f) "Speed" else "${uiState.playbackSpeed}\u00D7",
                                    onClick = { showSpeedPopup = true },
                                )

                                val qualityLabel = when (uiState.selectedQuality) {
                                    "auto" -> {
                                        val resolved = autoQualityLabel
                                            .replace("Auto", "").trim()
                                            .removePrefix("(").removeSuffix(")")
                                        if (resolved.isNotEmpty()) resolved else "Auto"
                                    }
                                    else -> uiState.selectedQuality.uppercase()
                                }
                                ObsidianToolbarButton(icon = Icons.Filled.HighQuality, label = qualityLabel, onClick = { showQualityPopup = true })

                                ObsidianToolbarButton(icon = Icons.Filled.Lock, label = "Lock", onClick = { isLocked = true; viewModel.toggleControls() })

                                if (audioTracks.size > 1) {
                                    ObsidianToolbarButton(
                                        icon = Icons.Filled.Audiotrack,
                                        label = if (selectedAudioIndex < audioTracks.size) audioTracks[selectedAudioIndex].label else "Audio",
                                        onClick = { showAudioPopup = true },
                                    )
                                }

                                if (uiState.episodes.isNotEmpty()) {
                                    ObsidianToolbarButton(icon = Icons.Filled.GridView, label = "Episodes", onClick = { showEpisodePopup = true })
                                    ObsidianToolbarButton(
                                        icon = Icons.Filled.SkipNext,
                                        label = "Next",
                                        onClick = { viewModel.playNextEpisode() },
                                        enabled = uiState.currentEpisodeIndex < uiState.episodes.size - 1,
                                    )
                                }
                            }
                        }
                    }
                }
            } else {
                // -- Locked Overlay --
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                        ) { isLocked = false },
                    contentAlignment = Alignment.Center,
                ) {
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = BackgroundDark.copy(alpha = 0.85f),
                        border = BorderStroke(1.dp, BorderSubtle),
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Icon(Icons.Filled.LockOpen, contentDescription = "Tap to unlock", tint = CyanAccent, modifier = Modifier.size(36.dp))
                            Spacer(Modifier.height(8.dp))
                            Text("TAP TO UNLOCK", color = TextDim, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 2.sp)
                        }
                    }
                }
            }
        }

        // ============================================================
        // POPUP MENUS
        // ============================================================

        // -- Quality Popup --
        if (showQualityPopup) {
            ObsidianSidePanel(title = "VIDEO QUALITY", onDismiss = { showQualityPopup = false }) {
                val qualities = if (uiState.isAdaptive) uiState.availableQualities else listOf(uiState.selectedQuality)
                qualities.forEach { quality ->
                    val displayLabel = when (quality) {
                        "auto" -> autoQualityLabel
                        "2160p" -> "2160p 4K Ultra HD"
                        "1440p" -> "1440p 2K QHD"
                        "1080p" -> "1080p Full HD"
                        "720p" -> "720p HD"
                        "480p" -> "480p"
                        "360p" -> "360p"
                        "240p" -> "240p"
                        else -> quality
                    }
                    val subtitle = when (quality) {
                        "auto" -> "Adaptive"
                        "2160p" -> "20 Mbps"
                        "1440p" -> "12 Mbps"
                        "1080p" -> "8 Mbps"
                        "720p" -> "4 Mbps"
                        "480p" -> "2 Mbps"
                        "360p" -> "1 Mbps"
                        "240p" -> "0.5 Mbps"
                        else -> ""
                    }
                    ObsidianMenuItem(
                        label = displayLabel,
                        subtitle = subtitle,
                        isSelected = uiState.selectedQuality == quality,
                        onClick = { viewModel.setQuality(quality); showQualityPopup = false; toastMessage = "Quality: $displayLabel" },
                    )
                    Spacer(Modifier.height(6.dp))
                }
            }
        }

        // -- Speed Popup --
        if (showSpeedPopup) {
            ObsidianSidePanel(title = "PLAYBACK SPEED", onDismiss = { showSpeedPopup = false }) {
                listOf(2.0f to "Fastest", 1.5f to "Fast", 1.25f to "", 1.0f to "Normal", 0.75f to "", 0.5f to "Slow").forEach { (speed, sub) ->
                    ObsidianMenuItem(
                        label = if (speed == 1.0f) "1.0\u00D7 (Normal)" else "${speed}\u00D7",
                        subtitle = sub,
                        isSelected = uiState.playbackSpeed == speed,
                        onClick = { viewModel.setPlaybackSpeed(speed); showSpeedPopup = false; toastMessage = "Speed: ${speed}\u00D7" },
                    )
                    Spacer(Modifier.height(6.dp))
                }
            }
        }

        // -- Audio Popup --
        if (showAudioPopup && audioTracks.size > 1) {
            ObsidianSidePanel(title = "AUDIO LANGUAGE", onDismiss = { showAudioPopup = false }) {
                audioTracks.forEachIndexed { index, trackInfo ->
                    ObsidianMenuItem(
                        label = trackInfo.label,
                        subtitle = trackInfo.language?.uppercase(),
                        isSelected = selectedAudioIndex == index,
                        onClick = {
                            selectedAudioIndex = index
                            val groups = exoPlayer.currentTracks.groups
                            if (trackInfo.groupIndex < groups.size) {
                                val grp = groups[trackInfo.groupIndex]
                                exoPlayer.trackSelectionParameters = exoPlayer.trackSelectionParameters
                                    .buildUpon()
                                    .setOverrideForType(
                                        TrackSelectionOverride(grp.mediaTrackGroup, listOf(trackInfo.trackIndex))
                                    )
                                    .build()
                            }
                            showAudioPopup = false
                            toastMessage = "Audio: ${trackInfo.label}"
                        },
                    )
                    Spacer(Modifier.height(6.dp))
                }
            }
        }

        // -- Episode Selector Popup --
        if (showEpisodePopup && uiState.episodes.isNotEmpty()) {
            ObsidianSidePanel(title = "SELECT EPISODE", onDismiss = { showEpisodePopup = false }) {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(6),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.heightIn(max = 300.dp),
                ) {
                    itemsIndexed(uiState.episodes) { index, episode ->
                        val isCurrent = index == uiState.currentEpisodeIndex
                        Surface(
                            modifier = Modifier
                                .aspectRatio(1f)
                                .clickable { viewModel.playEpisode(episode); showEpisodePopup = false },
                            shape = RoundedCornerShape(10.dp),
                            color = if (isCurrent) CyanAccent.copy(alpha = 0.12f) else Color.White.copy(alpha = 0.04f),
                            border = BorderStroke(
                                width = if (isCurrent) 2.dp else 0.5.dp,
                                color = if (isCurrent) CyanAccent else Color.White.copy(alpha = 0.1f),
                            ),
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("${episode.episodeNumber}", color = if (isCurrent) CyanAccent else Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                                    if (isCurrent) Icon(Icons.Filled.PlayArrow, contentDescription = null, tint = CyanAccent, modifier = Modifier.size(14.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ===========================================================================
// OBSIDIAN ULTRA - COMPOSABLE COMPONENTS
// ===========================================================================

// -- Loading Overlay (Triple-ring spinner) --
@Composable
private fun ObsidianLoadingOverlay() {
    val infiniteTransition = rememberInfiniteTransition(label = "loading")
    val rotation1 by infiniteTransition.animateFloat(0f, 360f, animationSpec = infiniteRepeatable(tween(1100, easing = LinearEasing), RepeatMode.Restart), label = "ring1")
    val rotation2 by infiniteTransition.animateFloat(360f, 0f, animationSpec = infiniteRepeatable(tween(1700, easing = LinearEasing), RepeatMode.Restart), label = "ring2")
    val rotation3 by infiniteTransition.animateFloat(0f, 360f, animationSpec = infiniteRepeatable(tween(2300, easing = LinearEasing), RepeatMode.Restart), label = "ring3")
    val corePulse by infiniteTransition.animateFloat(0.7f, 1.1f, animationSpec = infiniteRepeatable(tween(1800, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "core")
    val labelAlpha by infiniteTransition.animateFloat(0.3f, 1f, animationSpec = infiniteRepeatable(tween(2000), RepeatMode.Reverse), label = "label")
    val shimmerOffset by infiniteTransition.animateFloat(-1f, 2f, animationSpec = infiniteRepeatable(tween(2000, easing = LinearEasing), RepeatMode.Restart), label = "shimmer")

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .drawBehind {
                val brush = Brush.horizontalGradient(
                    listOf(Color.Transparent, Color.White.copy(alpha = 0.04f), Color.Transparent),
                    startX = size.width * shimmerOffset,
                    endX = size.width * (shimmerOffset + 1f),
                )
                drawRect(brush)
            },
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(modifier = Modifier.size(88.dp), contentAlignment = Alignment.Center) {
                // Ring 1 - Cyan
                androidx.compose.foundation.Canvas(modifier = Modifier.size(88.dp).graphicsLayer { rotationZ = rotation1 }) {
                    drawArc(color = CyanAccent, startAngle = 0f, sweepAngle = 90f, useCenter = false, style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round))
                }
                // Ring 2 - Purple
                androidx.compose.foundation.Canvas(modifier = Modifier.size(64.dp).graphicsLayer { rotationZ = rotation2 }) {
                    drawArc(color = PurpleAccent, startAngle = 0f, sweepAngle = 90f, useCenter = false, style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round))
                }
                // Ring 3 - Gold
                androidx.compose.foundation.Canvas(modifier = Modifier.size(40.dp).graphicsLayer { rotationZ = rotation3 }) {
                    drawArc(color = GoldAccent, startAngle = 0f, sweepAngle = 90f, useCenter = false, style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round))
                }
                // Core pulse
                Box(modifier = Modifier.size(20.dp).graphicsLayer { scaleX = corePulse; scaleY = corePulse }.clip(CircleShape).background(AccentGrad))
            }
            Spacer(Modifier.height(28.dp))
            Text("LOADING", color = TextDim.copy(alpha = labelAlpha), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 4.sp)
            Spacer(Modifier.height(18.dp))
            Box(modifier = Modifier.width(180.dp).height(2.dp).clip(RoundedCornerShape(1.dp)).background(Color.White.copy(alpha = 0.08f))) {
                val barOffset by infiniteTransition.animateFloat(-0.3f, 1.3f, animationSpec = infiniteRepeatable(tween(2000, easing = FastOutSlowInEasing), RepeatMode.Restart), label = "bar")
                Box(modifier = Modifier.fillMaxHeight().fillMaxWidth(0.35f).offset(x = (180.dp * barOffset)).clip(RoundedCornerShape(1.dp)).background(AccentGrad))
            }
        }
    }
}

// -- Buffering Overlay --
@Composable
private fun ObsidianBufferingOverlay() {
    val infiniteTransition = rememberInfiniteTransition(label = "buffer")
    val rot1 by infiniteTransition.animateFloat(0f, 360f, animationSpec = infiniteRepeatable(tween(750, easing = LinearEasing), RepeatMode.Restart), label = "bArc1")
    val rot2 by infiniteTransition.animateFloat(360f, 0f, animationSpec = infiniteRepeatable(tween(1100, easing = LinearEasing), RepeatMode.Restart), label = "bArc2")

    Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.25f)), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(modifier = Modifier.size(64.dp), contentAlignment = Alignment.Center) {
                androidx.compose.foundation.Canvas(modifier = Modifier.size(64.dp).graphicsLayer { rotationZ = rot1 }) {
                    drawArc(color = CyanAccent, startAngle = 0f, sweepAngle = 110f, useCenter = false, style = Stroke(width = 2.5f.dp.toPx(), cap = StrokeCap.Round))
                }
                androidx.compose.foundation.Canvas(modifier = Modifier.size(44.dp).graphicsLayer { rotationZ = rot2 }) {
                    drawArc(color = PurpleAccent, startAngle = 0f, sweepAngle = 110f, useCenter = false, style = Stroke(width = 2.5f.dp.toPx(), cap = StrokeCap.Round))
                }
            }
            Spacer(Modifier.height(16.dp))
            Text("BUFFERING", color = TextDim, fontSize = 12.sp, fontWeight = FontWeight.Medium, letterSpacing = 3.sp)
        }
    }
}

// -- Error Overlay --
@Composable
private fun ObsidianErrorOverlay(errorMessage: String, streamUrl: String?, onBack: () -> Unit) {
    val infiniteTransition = rememberInfiniteTransition(label = "error")
    val errorPulse by infiniteTransition.animateFloat(0.95f, 1.05f, animationSpec = infiniteRepeatable(tween(2500), RepeatMode.Reverse), label = "errPulse")

    Box(modifier = Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) {
        Column(modifier = Modifier.padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Filled.Error, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(56.dp).graphicsLayer { scaleX = errorPulse; scaleY = errorPulse })
            Spacer(Modifier.height(16.dp))
            Text(errorMessage, color = Color.White, fontSize = 14.sp, textAlign = TextAlign.Center, lineHeight = 20.sp)
            Spacer(Modifier.height(10.dp))
            Text("URL: ${streamUrl?.take(80) ?: "none"}", color = TextDim.copy(alpha = 0.5f), fontSize = 10.sp, textAlign = TextAlign.Center, fontFamily = FontFamily.Monospace)
            Spacer(Modifier.height(24.dp))
            Button(
                onClick = onBack,
                shape = RoundedCornerShape(50),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                contentPadding = PaddingValues(horizontal = 36.dp, vertical = 13.dp),
                modifier = Modifier.background(AccentGrad, RoundedCornerShape(50)),
            ) {
                Text("GO BACK", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp, letterSpacing = 2.sp)
            }
        }
    }
}

// -- Gesture Panel (Volume / Brightness side indicator) --
@Composable
private fun ObsidianGesturePanel(icon: ImageVector, value: Float, accentColor: Color) {
    Surface(
        shape = RoundedCornerShape(40.dp),
        color = BackgroundDark.copy(alpha = 0.85f),
        border = BorderStroke(1.dp, BorderSubtle),
    ) {
        Column(modifier = Modifier.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, contentDescription = null, tint = accentColor, modifier = Modifier.size(22.dp))
            Spacer(Modifier.height(12.dp))
            Box(modifier = Modifier.width(4.dp).height(100.dp).clip(RoundedCornerShape(2.dp)).background(Color.White.copy(alpha = 0.14f))) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(value)
                        .align(Alignment.BottomCenter)
                        .clip(RoundedCornerShape(2.dp))
                        .background(Brush.verticalGradient(listOf(accentColor, accentColor.copy(alpha = 0.5f)))),
                )
            }
            Spacer(Modifier.height(10.dp))
            Text("${(value * 100).toInt()}%", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Medium, fontFamily = FontFamily.Monospace)
        }
    }
}

// -- Seek Bubble --
@Composable
private fun ObsidianSeekBubble(symbol: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Surface(
            shape = CircleShape,
            color = CyanAccent.copy(alpha = 0.12f),
            border = BorderStroke(1.dp, CyanAccent.copy(alpha = 0.3f)),
            modifier = Modifier.size(82.dp),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(symbol, fontSize = 28.sp, color = CyanAccent, fontWeight = FontWeight.Bold)
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(label, color = CyanAccent, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 2.sp)
    }
}

// -- Progress Bar --
@Composable
private fun ObsidianProgressBar(currentPosition: Long, totalDuration: Long, bufferedPosition: Long, onSeek: (Float) -> Unit) {
    val playedFraction = if (totalDuration > 0) (currentPosition.toFloat() / totalDuration).coerceIn(0f, 1f) else 0f
    val bufferedFraction = if (totalDuration > 0) (bufferedPosition.toFloat() / totalDuration).coerceIn(0f, 1f) else 0f
    var isDragging by remember { mutableStateOf(false) }
    var dragFraction by remember { mutableFloatStateOf(0f) }
    val displayFraction = if (isDragging) dragFraction else playedFraction

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(28.dp)
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragStart = { offset ->
                        isDragging = true
                        dragFraction = (offset.x / size.width).coerceIn(0f, 1f)
                    },
                    onDragEnd = { onSeek(dragFraction); isDragging = false },
                    onDragCancel = { isDragging = false },
                    onDrag = { change, _ ->
                        change.consume()
                        dragFraction = (change.position.x / size.width).coerceIn(0f, 1f)
                    },
                )
            }
            .pointerInput(Unit) {
                detectTapGestures { offset ->
                    val fraction = (offset.x / size.width).coerceIn(0f, 1f)
                    onSeek(fraction)
                }
            },
        contentAlignment = Alignment.CenterStart,
    ) {
        val trackH = if (isDragging) 8.dp else 4.dp
        // Track bg
        Box(modifier = Modifier.fillMaxWidth().height(trackH).clip(RoundedCornerShape(4.dp)).background(Color.White.copy(alpha = 0.14f)))
        // Buffer
        Box(modifier = Modifier.fillMaxWidth(bufferedFraction).height(trackH).clip(RoundedCornerShape(4.dp)).background(Color.White.copy(alpha = 0.22f)))
        // Played (gradient)
        Box(modifier = Modifier.fillMaxWidth(displayFraction).height(trackH).clip(RoundedCornerShape(4.dp)).background(AccentGrad))
        // Glow
        Box(modifier = Modifier.fillMaxWidth(displayFraction).height(12.dp).clip(RoundedCornerShape(4.dp)).background(Brush.horizontalGradient(listOf(CyanAccent.copy(alpha = 0.3f), PurpleAccent.copy(alpha = 0.3f)))).graphicsLayer { alpha = 0.6f })
        // Thumb
        Box(modifier = Modifier.fillMaxWidth(displayFraction).wrapContentWidth(Alignment.End)) {
            Box(modifier = Modifier.size(if (isDragging) 18.dp else 14.dp).clip(CircleShape).background(Color.White))
        }
    }
}

// -- Toolbar Button --
@Composable
private fun ObsidianToolbarButton(icon: ImageVector, label: String, onClick: () -> Unit, enabled: Boolean = true) {
    Column(
        modifier = Modifier.clip(RoundedCornerShape(10.dp)).clickable(enabled = enabled, onClick = onClick).padding(horizontal = 10.dp, vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(icon, contentDescription = label, tint = if (enabled) Color.White else Color.White.copy(alpha = 0.3f), modifier = Modifier.size(20.dp))
        Spacer(Modifier.height(3.dp))
        Text(label, color = if (enabled) Color.White.copy(alpha = 0.85f) else Color.White.copy(alpha = 0.3f), fontSize = 10.sp, fontWeight = FontWeight.Medium, maxLines = 1, letterSpacing = 0.5.sp)
    }
}

// -- Side Panel (floating menu for Quality, Speed, Audio, Episodes) --
@Composable
private fun ObsidianSidePanel(title: String, onDismiss: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.6f))
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onDismiss),
    ) {
        Surface(
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .fillMaxHeight()
                .widthIn(min = 240.dp, max = 290.dp)
                .clickable(enabled = false, onClick = {}),
            shape = RoundedCornerShape(topStart = 24.dp, bottomStart = 24.dp),
            color = BackgroundDark.copy(alpha = 0.97f),
            border = BorderStroke(1.dp, BorderSubtle),
            shadowElevation = 24.dp,
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text(title, color = TextDim, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 2.5.sp)
                    IconButton(onClick = onDismiss, modifier = Modifier.size(30.dp)) {
                        Icon(Icons.Filled.Close, contentDescription = "Close", tint = Color.White.copy(alpha = 0.5f), modifier = Modifier.size(18.dp))
                    }
                }
                Box(modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp).height(1.dp).background(BorderSubtle))
                content()
            }
        }
    }
}

// -- Menu Item --
@Composable
private fun ObsidianMenuItem(label: String, subtitle: String? = null, isSelected: Boolean, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(11.dp),
        color = if (isSelected) CyanAccent.copy(alpha = 0.08f) else Color.Transparent,
    ) {
        Row(modifier = Modifier.padding(horizontal = 12.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Column(modifier = Modifier.weight(1f)) {
                Text(label, fontSize = 14.sp, fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal, color = if (isSelected) CyanAccent else Color.White.copy(alpha = 0.85f))
                if (!subtitle.isNullOrBlank()) {
                    Text(subtitle, fontSize = 11.sp, fontFamily = FontFamily.Monospace, color = TextDim)
                }
            }
            if (isSelected) {
                Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(CyanAccent))
            }
        }
    }
}
