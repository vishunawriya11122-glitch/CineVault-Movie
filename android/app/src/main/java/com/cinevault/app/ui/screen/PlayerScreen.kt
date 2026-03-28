package com.cinevault.app.ui.screen

import android.app.Activity
import android.content.pm.ActivityInfo
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import android.util.Log
import androidx.activity.compose.BackHandler
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.TrackSelectionParameters
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import androidx.media3.ui.PlayerView
import com.cinevault.app.ui.theme.CineVaultTheme
import com.cinevault.app.ui.viewmodel.PlayerViewModel
import kotlinx.coroutines.delay
import java.util.Locale

@Composable
fun PlayerScreen(
    onBack: () -> Unit,
    viewModel: PlayerViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // Force landscape always
    val activity = context as? Activity
    DisposableEffect(Unit) {
        activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        onDispose {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    }

    // Track selector for adaptive quality
    val trackSelector = remember { DefaultTrackSelector(context) }

    // ExoPlayer with custom HTTP factory (cross-protocol redirects for Google Drive etc.)
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

    // Current auto-detected quality label
    var autoQualityLabel by remember { mutableStateOf("Auto") }

    // Player error state
    var playerError by remember { mutableStateOf<String?>(null) }

    // Add error listener to ExoPlayer
    DisposableEffect(exoPlayer) {
        val listener = object : Player.Listener {
            override fun onPlayerError(error: PlaybackException) {
                Log.e("CineVaultPlayer", "Playback error: ${error.errorCodeName} - ${error.message}", error)
                // Delegate to ViewModel — it will try the next fallback URL or surface the error
                viewModel.onPlaybackError("Playback error: ${error.errorCodeName}\n${error.message ?: "Unknown error"}")
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                val stateName = when (playbackState) {
                    Player.STATE_IDLE -> "IDLE"
                    Player.STATE_BUFFERING -> "BUFFERING"
                    Player.STATE_READY -> "READY"
                    Player.STATE_ENDED -> "ENDED"
                    else -> "UNKNOWN"
                }
                Log.d("CineVaultPlayer", "Playback state: $stateName")
                // Mark as complete when video finishes
                if (playbackState == Player.STATE_ENDED) {
                    val dur = exoPlayer.duration.coerceAtLeast(1)
                    viewModel.saveExplicitProgress(dur, dur)
                }
            }
        }
        exoPlayer.addListener(listener)
        onDispose { exoPlayer.removeListener(listener) }
    }

    // System back button — save progress then navigate
    BackHandler {
        viewModel.saveExplicitProgress(
            exoPlayer.currentPosition,
            exoPlayer.duration.coerceAtLeast(0)
        )
        onBack()
    }

    // Apply quality constraints via track selector
    LaunchedEffect(uiState.selectedQuality) {
        val quality = uiState.selectedQuality
        if (quality == "auto") {
            // Remove constraints — let ExoPlayer decide based on bandwidth
            trackSelector.parameters = trackSelector.buildUponParameters()
                .setMaxVideoSize(Int.MAX_VALUE, Int.MAX_VALUE)
                .setForceHighestSupportedBitrate(false)
                .build()
        } else {
            val maxHeight = when (quality) {
                "1080p" -> 1080
                "720p" -> 720
                "480p" -> 480
                "360p" -> 360
                else -> Int.MAX_VALUE
            }
            trackSelector.parameters = trackSelector.buildUponParameters()
                .setMaxVideoSize(Int.MAX_VALUE, maxHeight)
                .setForceHighestSupportedBitrate(false)
                .setForceLowestBitrate(quality == "360p")
                .build()
        }
    }

    // Monitor bandwidth and update auto quality label
    LaunchedEffect(exoPlayer) {
        while (true) {
            delay(2000)
            // Estimate quality based on current video rendering resolution
            val videoFormat = exoPlayer.videoFormat
            val videoHeight = videoFormat?.height ?: 0
            autoQualityLabel = when {
                videoHeight >= 1080 -> "Auto (1080p)"
                videoHeight >= 720 -> "Auto (720p)"
                videoHeight >= 480 -> "Auto (480p)"
                videoHeight > 0 -> "Auto (${videoHeight}p)"
                else -> "Auto"
            }
        }
    }

    // Update media when URL changes (also re-fires when onPlaybackError sets next fallback URL)
    LaunchedEffect(uiState.streamingUrl) {
        uiState.streamingUrl?.let { url ->
            Log.d("CineVaultPlayer", "Loading URL: $url")
            playerError = null
            // Stop + reset first — ensures clean state when retrying after an error
            exoPlayer.stop()
            val resumePos = uiState.currentPosition
            exoPlayer.setMediaItem(MediaItem.fromUri(url))
            exoPlayer.prepare()
            if (resumePos > 0) {
                // Wait for ready or error — avoid infinite loop
                var waitCount = 0
                while (exoPlayer.playbackState != Player.STATE_READY && exoPlayer.playerError == null && waitCount < 300) {
                    delay(100)
                    waitCount++
                }
                if (exoPlayer.playbackState == Player.STATE_READY) {
                    exoPlayer.seekTo(resumePos)
                }
            }
        }
    }

    // Sync playback speed
    LaunchedEffect(uiState.playbackSpeed, uiState.isSpeedOverride) {
        val speed = if (uiState.isSpeedOverride) 2.0f else uiState.playbackSpeed
        exoPlayer.setPlaybackSpeed(speed)
    }

    // Track position ALWAYS (not just when playing) — captures paused position too
    var audioTracks by remember { mutableStateOf<List<Pair<String, Int>>>(emptyList()) }
    var selectedAudioIndex by remember { mutableIntStateOf(0) }

    LaunchedEffect(exoPlayer) {
        while (true) {
            delay(1000)
            val dur = exoPlayer.duration.coerceAtLeast(0)
            val pos = exoPlayer.currentPosition
            // Always update position regardless of play/pause state
            if (dur > 0) viewModel.onPositionChange(pos, dur)
            viewModel.onPlaybackStateChange(exoPlayer.isPlaying)

            // Discover audio tracks with proper language names
            val tracks = exoPlayer.currentTracks
            val discovered = mutableListOf<Pair<String, Int>>()
            for (group in tracks.groups) {
                if (group.type == C.TRACK_TYPE_AUDIO) {
                    for (i in 0 until group.length) {
                        val format = group.getTrackFormat(i)
                        val lang = format.language
                        val label = format.label
                            ?: if (lang != null) {
                                val locale = Locale.forLanguageTag(lang)
                                val displayName = locale.getDisplayLanguage(Locale.ENGLISH)
                                if (displayName.isNotBlank() && displayName != lang) displayName
                                else lang.uppercase()
                            } else {
                                "Track ${discovered.size + 1}"
                            }
                        discovered.add(Pair(label, i))
                    }
                }
            }
            if (discovered.isNotEmpty() && discovered.map { it.first } != audioTracks.map { it.first }) {
                audioTracks = discovered
            }
        }
    }

    // Save progress on leave — use real ExoPlayer values, not stale ViewModel state
    DisposableEffect(Unit) {
        onDispose {
            viewModel.saveExplicitProgress(
                exoPlayer.currentPosition,
                exoPlayer.duration.coerceAtLeast(0)
            )
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

    // Double-tap and hold gesture state
    var doubleTapLabel by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(doubleTapLabel) {
        if (doubleTapLabel != null) {
            delay(800)
            doubleTapLabel = null
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .pointerInput(Unit) {
                val screenWidth = size.width
                detectTapGestures(
                    onTap = { viewModel.toggleControls() },
                    onDoubleTap = { offset ->
                        if (offset.x < screenWidth / 2) {
                            exoPlayer.seekTo((exoPlayer.currentPosition - 10_000).coerceAtLeast(0))
                            doubleTapLabel = "-10s"
                        } else {
                            exoPlayer.seekTo(exoPlayer.currentPosition + 10_000)
                            doubleTapLabel = "+10s"
                        }
                    },
                    onLongPress = { viewModel.setSpeedOverride(true) },
                )
            }
            .pointerInput(Unit) {
                awaitPointerEventScope {
                    while (true) {
                        val event = awaitPointerEvent()
                        if (event.changes.all { !it.pressed }) {
                            viewModel.setSpeedOverride(false)
                        }
                    }
                }
            },
    ) {
        if (uiState.isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.align(Alignment.Center),
                color = CineVaultTheme.colors.accentGold,
            )
        } else if (uiState.error != null || playerError != null) {
            Column(
                modifier = Modifier.align(Alignment.Center).padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(Icons.Filled.Error, contentDescription = null, tint = Color.Red, modifier = Modifier.size(48.dp))
                Spacer(Modifier.height(12.dp))
                Text(
                    playerError ?: uiState.error ?: "Unknown error",
                    color = Color.White,
                    style = CineVaultTheme.typography.body,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    "URL: ${uiState.streamingUrl?.take(80) ?: "none"}",
                    color = Color.White.copy(alpha = 0.5f),
                    fontSize = 10.sp,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(16.dp))
                TextButton(onClick = onBack) {
                    Text("Go Back", color = CineVaultTheme.colors.accentGold)
                }
            }
        } else {
            // Player view
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        player = exoPlayer
                        useController = false
                    }
                },
                modifier = Modifier.fillMaxSize(),
            )

            // Double-tap feedback overlay
            AnimatedVisibility(
                visible = doubleTapLabel != null,
                enter = fadeIn(),
                exit = fadeOut(),
                modifier = Modifier.align(Alignment.Center),
            ) {
                Text(
                    doubleTapLabel ?: "",
                    color = Color.White,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.Black.copy(alpha = 0.5f))
                        .padding(horizontal = 24.dp, vertical = 12.dp),
                )
            }

            // 2x speed indicator
            if (uiState.isSpeedOverride) {
                Text(
                    "2x Speed",
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .statusBarsPadding()
                        .padding(top = 60.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.Black.copy(alpha = 0.6f))
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                )
            }

            // Custom controls overlay
            AnimatedVisibility(
                visible = uiState.showControls,
                enter = fadeIn(),
                exit = fadeOut(),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.4f)),
                ) {
                    // Top bar — positioned higher with proper alignment
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .statusBarsPadding()
                            .padding(horizontal = 4.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        IconButton(onClick = {
                            viewModel.saveExplicitProgress(
                                exoPlayer.currentPosition,
                                exoPlayer.duration.coerceAtLeast(0)
                            )
                            onBack()
                        }) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                tint = Color.White,
                            )
                        }
                        Text(
                            uiState.movie?.title ?: "",
                            style = CineVaultTheme.typography.body,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f).padding(horizontal = 8.dp),
                        )
                        // Settings button
                        var showSettings by remember { mutableStateOf(false) }
                        IconButton(onClick = { showSettings = true }) {
                            Icon(Icons.Filled.Settings, contentDescription = "Settings", tint = Color.White)
                        }

                        // Premium Settings Dialog
                        if (showSettings) {
                            PremiumSettingsSheet(
                                isAdaptive = uiState.isAdaptive,
                                availableQualities = uiState.availableQualities,
                                selectedQuality = uiState.selectedQuality,
                                autoQualityLabel = autoQualityLabel,
                                audioTracks = audioTracks,
                                selectedAudioIndex = selectedAudioIndex,
                                playbackSpeed = uiState.playbackSpeed,
                                onQualitySelected = { quality ->
                                    viewModel.setQuality(quality)
                                    showSettings = false
                                },
                                onAudioSelected = { index, trackIndex ->
                                    selectedAudioIndex = index
                                    val tracks = exoPlayer.currentTracks
                                    for (group in tracks.groups) {
                                        if (group.type == C.TRACK_TYPE_AUDIO) {
                                            exoPlayer.trackSelectionParameters = exoPlayer.trackSelectionParameters
                                                .buildUpon()
                                                .setOverrideForType(
                                                    TrackSelectionOverride(group.mediaTrackGroup, listOf(trackIndex))
                                                )
                                                .build()
                                            break
                                        }
                                    }
                                    showSettings = false
                                },
                                onSpeedSelected = { speed ->
                                    viewModel.setPlaybackSpeed(speed)
                                    showSettings = false
                                },
                                onDismiss = { showSettings = false },
                            )
                        }
                    }

                    // Center controls (play/pause, skip)
                    Row(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalArrangement = Arrangement.spacedBy(32.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        IconButton(onClick = { exoPlayer.seekTo((exoPlayer.currentPosition - 10_000).coerceAtLeast(0)) }) {
                            Icon(Icons.Filled.Replay10, contentDescription = "Rewind 10s", tint = Color.White, modifier = Modifier.size(36.dp))
                        }
                        IconButton(
                            onClick = {
                                if (exoPlayer.isPlaying) exoPlayer.pause() else exoPlayer.play()
                            },
                            modifier = Modifier
                                .size(64.dp)
                                .clip(CircleShape)
                                .background(CineVaultTheme.colors.accentGold.copy(alpha = 0.9f)),
                        ) {
                            Icon(
                                if (uiState.isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                                contentDescription = if (uiState.isPlaying) "Pause" else "Play",
                                tint = Color.Black,
                                modifier = Modifier.size(36.dp),
                            )
                        }
                        IconButton(onClick = { exoPlayer.seekTo(exoPlayer.currentPosition + 10_000) }) {
                            Icon(Icons.Filled.Forward10, contentDescription = "Forward 10s", tint = Color.White, modifier = Modifier.size(36.dp))
                        }
                    }

                    // Bottom controls (progress bar, time)
                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .fillMaxWidth()
                            .navigationBarsPadding()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                    ) {
                        Slider(
                            value = if (uiState.totalDuration > 0) uiState.currentPosition.toFloat() / uiState.totalDuration else 0f,
                            onValueChange = { fraction ->
                                val seekPos = (fraction * uiState.totalDuration).toLong()
                                exoPlayer.seekTo(seekPos)
                                viewModel.seekTo(seekPos)
                            },
                            colors = SliderDefaults.colors(
                                thumbColor = CineVaultTheme.colors.accentGold,
                                activeTrackColor = CineVaultTheme.colors.accentGold,
                                inactiveTrackColor = Color.White.copy(alpha = 0.3f),
                            ),
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                formatDuration(uiState.currentPosition),
                                style = CineVaultTheme.typography.mono,
                                color = Color.White.copy(alpha = 0.8f),
                            )
                            Text(
                                formatDuration(uiState.totalDuration),
                                style = CineVaultTheme.typography.mono,
                                color = Color.White.copy(alpha = 0.8f),
                            )
                        }
                    }
                }
            }
        }
    }
}

/** Helper to get bandwidth estimate from ExoPlayer (returns bps or -1 if unknown) */
private fun ExoPlayer.networkDetails(): Long {
    return try {
        val field = this.javaClass.getDeclaredField("bandwidthMeter")
        field.isAccessible = true
        val meter = field.get(this)
        if (meter != null) {
            val method = meter.javaClass.getMethod("getBitrateEstimate")
            method.invoke(meter) as? Long ?: -1L
        } else -1L
    } catch (_: Exception) {
        -1L
    }
}

private fun formatDuration(ms: Long): String {
    val totalSeconds = ms / 1000
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) String.format("%d:%02d:%02d", hours, minutes, seconds)
    else String.format("%d:%02d", minutes, seconds)
}

// ── Premium Settings Sheet ──

@Composable
private fun PremiumSettingsSheet(
    isAdaptive: Boolean,
    availableQualities: List<String>,
    selectedQuality: String,
    autoQualityLabel: String,
    audioTracks: List<Pair<String, Int>>,
    selectedAudioIndex: Int,
    playbackSpeed: Float,
    onQualitySelected: (String) -> Unit,
    onAudioSelected: (index: Int, trackIndex: Int) -> Unit,
    onSpeedSelected: (Float) -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF1A1A1A),
        shape = RoundedCornerShape(20.dp),
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Settings",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                )
                IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Filled.Close, "Close", tint = Color.White.copy(alpha = 0.7f), modifier = Modifier.size(20.dp))
                }
            }
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                // Quality Section
                SettingsSectionCard(title = "Quality", icon = Icons.Filled.HighQuality) {
                    if (isAdaptive) {
                        availableQualities.forEach { quality ->
                            val displayText = if (quality == "auto") autoQualityLabel else quality
                            SettingsOptionRow(
                                text = displayText,
                                isSelected = selectedQuality == quality,
                                onClick = { onQualitySelected(quality) }
                            )
                        }
                    } else {
                        val detectedQuality = autoQualityLabel.replace("Auto", "").trim().let {
                            if (it.startsWith("(") && it.endsWith(")")) it.substring(1, it.length - 1) else it
                        }.ifEmpty { selectedQuality }
                        SettingsOptionRow(
                            text = "$detectedQuality (Original)",
                            isSelected = true,
                            onClick = onDismiss
                        )
                    }
                }

                if (audioTracks.size > 1) {
                    Spacer(modifier = Modifier.height(12.dp))
                    SettingsSectionCard(title = "Audio", icon = Icons.Filled.Audiotrack) {
                        audioTracks.forEachIndexed { index, (trackName, trackIndex) ->
                            SettingsOptionRow(
                                text = trackName,
                                isSelected = selectedAudioIndex == index,
                                onClick = { onAudioSelected(index, trackIndex) }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Speed Section
                SettingsSectionCard(title = "Speed", icon = Icons.Filled.Speed) {
                    listOf(0.5f, 0.75f, 1.0f, 1.25f, 1.5f, 2.0f).forEach { speed ->
                        SettingsOptionRow(
                            text = if (speed == 1.0f) "Normal" else "${speed}x",
                            isSelected = playbackSpeed == speed,
                            onClick = { onSpeedSelected(speed) }
                        )
                    }
                }
            }
        },
        confirmButton = {},
    )
}

@Composable
private fun SettingsSectionCard(
    title: String,
    icon: ImageVector,
    content: @Composable () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color.White.copy(alpha = 0.06f),
        border = BorderStroke(0.5.dp, Color.White.copy(alpha = 0.08f)),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(bottom = 8.dp)
            ) {
                Icon(icon, title, tint = Color(0xFFF5A623), modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    title,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFFF5A623),
                    letterSpacing = 0.5.sp
                )
            }
            content()
        }
    }
}

@Composable
private fun SettingsOptionRow(
    text: String,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(if (isSelected) Color(0xFFF5A623).copy(alpha = 0.1f) else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text,
            fontSize = 13.sp,
            color = if (isSelected) Color(0xFFF5A623) else Color.White.copy(alpha = 0.8f),
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
        )
        if (isSelected) {
            Icon(
                Icons.Filled.CheckCircle,
                contentDescription = null,
                tint = Color(0xFFF5A623),
                modifier = Modifier.size(18.dp)
            )
        }
    }
}
