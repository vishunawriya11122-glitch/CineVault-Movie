package com.cinevault.app.ui.screen

import android.content.Intent
import android.widget.Toast
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.ThumbUp
import androidx.compose.material.icons.outlined.FileDownload
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.cinevault.app.data.model.*
import com.cinevault.app.ui.theme.CineVaultTheme
import com.cinevault.app.ui.viewmodel.MovieDetailViewModel
import android.annotation.SuppressLint
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.PointerEventType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MovieDetailScreen(
    onBack: () -> Unit,
    onPlay: (contentId: String, episodeId: String?) -> Unit,
    onRelatedClick: (String) -> Unit,
    viewModel: MovieDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var selectedTab by remember { mutableIntStateOf(0) }
    val isLiked = uiState.isLiked

    // Refresh watch progress when returning from the player screen
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) viewModel.refreshProgress()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    if (uiState.isLoading) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(CineVaultTheme.colors.background),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = CineVaultTheme.colors.accentGold)
        }
        return
    }

    if (uiState.error != null && uiState.movie == null) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(CineVaultTheme.colors.background),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(16.dp)
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier
                        .align(Alignment.Start)
                        .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                        .size(40.dp)
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = CineVaultTheme.colors.textPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Spacer(modifier = Modifier.height(20.dp))
                Text(
                    "Failed to Load Movie",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = CineVaultTheme.colors.textPrimary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    uiState.error ?: "Unknown error occurred",
                    fontSize = 14.sp,
                    color = CineVaultTheme.colors.textSecondary,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(20.dp))
                Button(
                    onClick = onBack,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = CineVaultTheme.colors.accentGold
                    )
                ) {
                    Text("Go Back")
                }
            }
        }
        return
    }

    val movie = uiState.movie
    if (movie == null) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(CineVaultTheme.colors.background),
            contentAlignment = Alignment.Center
        ) {
            Text(
                "Loading movie details...",
                color = CineVaultTheme.colors.textPrimary
            )
        }
        return
    }

    val hasTrailer = !movie.trailerUrl.isNullOrBlank()

    // Resume watching logic
    val watchProgress = uiState.watchProgress
    val hasProgress = watchProgress != null && !watchProgress.isCompleted && watchProgress.currentTime > 0
    val progressPercent = if (hasProgress && watchProgress!!.totalDuration > 0)
        (watchProgress.currentTime.toFloat() / watchProgress.totalDuration).coerceIn(0f, 1f) else 0f

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CineVaultTheme.colors.background)
            .verticalScroll(rememberScrollState())
    ) {
        if (hasTrailer) {
            // ── Premium Trailer Hero with blurred banner background ──
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(280.dp)
                    .background(Color.Black)
            ) {
                // Blurred banner background
                if (!movie.bannerUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = movie.bannerUrl,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxSize()
                            .blur(25.dp)
                    )
                    // Dark overlay on blurred background
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.5f))
                    )
                }

                // Rounded TV-style trailer container
                Box(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(horizontal = 24.dp, vertical = 16.dp)
                        .fillMaxWidth()
                        .height(200.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.Black)
                        .border(1.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(16.dp))
                ) {
                    TrailerPlayer(
                        trailerUrl = movie.trailerUrl!!,
                        modifier = Modifier.fillMaxSize()
                    )
                }

                // Top gradient
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(80.dp)
                        .align(Alignment.TopCenter)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Black.copy(alpha = 0.6f),
                                    Color.Transparent
                                )
                            )
                        )
                )

                // Bottom gradient
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(40.dp)
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    CineVaultTheme.colors.background
                                )
                            )
                        )
                )

                // Back button
                IconButton(
                    onClick = onBack,
                    modifier = Modifier
                        .statusBarsPadding()
                        .padding(start = 12.dp, top = 8.dp)
                        .align(Alignment.TopStart)
                        .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                        .size(40.dp)
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            // Title & metadata below trailer
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp)
            ) {
                if (!movie.rankingLabel.isNullOrBlank()) {
                    Text(
                        movie.rankingLabel!!,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = CineVaultTheme.colors.accentGold.copy(alpha = 0.7f),
                        letterSpacing = 0.5.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                }
                Text(
                    movie.title,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(10.dp))
                MovieMetaChips(movie)
            }
        } else {
            // ── Banner image as hero ──
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(0.85f)
            ) {
                AsyncImage(
                    model = movie.backdropUrl ?: movie.posterUrl,
                    contentDescription = movie.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )

                // Top gradient
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp)
                        .align(Alignment.TopCenter)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Black.copy(alpha = 0.6f),
                                    Color.Transparent
                                )
                            )
                        )
                )

                // Bottom gradient
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.55f)
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    CineVaultTheme.colors.background.copy(alpha = 0.7f),
                                    CineVaultTheme.colors.background.copy(alpha = 0.95f),
                                    CineVaultTheme.colors.background
                                )
                            )
                        )
                )

                // Back button
                IconButton(
                    onClick = onBack,
                    modifier = Modifier
                        .statusBarsPadding()
                        .padding(start = 12.dp, top = 8.dp)
                        .align(Alignment.TopStart)
                        .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                        .size(40.dp)
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }

                // Overlaid title at bottom
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 16.dp)
                ) {
                    if (!movie.rankingLabel.isNullOrBlank()) {
                        Text(
                            movie.rankingLabel!!,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = CineVaultTheme.colors.accentGold.copy(alpha = 0.7f),
                            letterSpacing = 0.5.sp
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    Text(
                        movie.title,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    MovieMetaChips(movie)
                }
            }
        }

        // ── Content area (shared for both hero types) ──
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
        ) {
            Spacer(modifier = Modifier.height(4.dp))

            // IMDb Rating
            val starRating = movie.starRating ?: movie.rating ?: 0.0
            if (starRating > 0) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = Color(0xFFE6B91E)
                    ) {
                        Text(
                            "IMDb",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.Black,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                    Text(
                        String.format("%.1f", starRating),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    val starsOut5 = (starRating / 2.0).coerceIn(0.0, 5.0)
                    val fullStars = starsOut5.toInt()
                    val hasHalf = (starsOut5 - fullStars) >= 0.25
                    val emptyStars = 5 - fullStars - if (hasHalf) 1 else 0
                    Row(horizontalArrangement = Arrangement.spacedBy(1.dp)) {
                        repeat(fullStars) {
                            Icon(Icons.Default.Star, null, tint = Color(0xFFFFD700), modifier = Modifier.size(16.dp))
                        }
                        if (hasHalf) {
                            Icon(Icons.Default.StarHalf, null, tint = Color(0xFFFFD700), modifier = Modifier.size(16.dp))
                        }
                        repeat(emptyStars) {
                            Icon(Icons.Default.StarBorder, null, tint = Color(0xFFFFD700).copy(alpha = 0.4f), modifier = Modifier.size(16.dp))
                        }
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // ── Premium WATCH NOW / RESUME WATCHING button ──
            Button(
                onClick = { if (movie.id.isNotBlank()) onPlay(movie.id, null) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                shape = RoundedCornerShape(12.dp),
                contentPadding = PaddingValues(),
                enabled = movie.id.isNotBlank()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.horizontalGradient(
                                colors = listOf(
                                    CineVaultTheme.colors.accentGold,
                                    CineVaultTheme.colors.accentGold.copy(alpha = 0.85f),
                                    Color(0xFFFFBE45)
                                )
                            ),
                            RoundedCornerShape(12.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.PlayArrow,
                            "Play",
                            tint = Color.Black,
                            modifier = Modifier.size(26.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            if (hasProgress) "RESUME WATCHING" else "WATCH NOW",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.Black,
                            letterSpacing = 1.sp
                        )
                    }
                }
            }

            // Resume progress indicator
            if (hasProgress) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    LinearProgressIndicator(
                        progress = { progressPercent },
                        modifier = Modifier
                            .weight(1f)
                            .height(3.dp)
                            .clip(RoundedCornerShape(2.dp)),
                        color = CineVaultTheme.colors.accentGold,
                        trackColor = Color.White.copy(alpha = 0.15f),
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    val remainingMin = ((watchProgress!!.totalDuration - watchProgress.currentTime) / 60000).coerceAtLeast(1)
                    Text(
                        "${remainingMin} min left",
                        fontSize = 11.sp,
                        color = CineVaultTheme.colors.textSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // ── Premium Action buttons ──
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                // My List
                PremiumActionButton(
                    label = "My List",
                    icon = if (uiState.isInWatchlist) Icons.Default.Bookmark else Icons.Outlined.BookmarkBorder,
                    isActive = uiState.isInWatchlist,
                    onClick = { viewModel.toggleWatchlist() }
                )
                // Like with animation
                PremiumLikeButton(
                    isLiked = isLiked,
                    onClick = { viewModel.toggleLike() }
                )
                // Share
                PremiumActionButton(
                    label = "Share",
                    icon = Icons.Outlined.Share,
                    isActive = false,
                    onClick = {
                        val shareText = "Check out \"${movie.title}\" on CineVault!\nhttps://cinevault.app/movie/${movie.id}"
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, shareText)
                            putExtra(Intent.EXTRA_SUBJECT, movie.title)
                        }
                        context.startActivity(Intent.createChooser(shareIntent, "Share via"))
                    }
                )
                // Download
                PremiumActionButton(
                    label = "Download",
                    icon = Icons.Outlined.FileDownload,
                    isActive = false,
                    onClick = {
                        Toast.makeText(context, "Download coming soon", Toast.LENGTH_SHORT).show()
                    }
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }

        // ── Episodes Section (for series content) ──
        val isSeries = movie.contentType in listOf("web_series", "tv_show", "anime")
        if (isSeries && uiState.seasons.isNotEmpty()) {
            EpisodesSection(
                seasons = uiState.seasons,
                episodes = uiState.episodes,
                selectedSeasonId = uiState.selectedSeasonId,
                onSeasonSelected = { viewModel.selectSeason(it) },
                onEpisodeClick = { episode -> onPlay(movie.id, episode.id) }
            )
        }

        // ── Tabs ──
        @Suppress("DEPRECATION")
        Divider(color = CineVaultTheme.colors.borderSubtle.copy(alpha = 0.5f), thickness = 0.5.dp)

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(CineVaultTheme.colors.background)
                .padding(horizontal = 16.dp)
        ) {
            listOf("DETAILS", "COMMENTS").forEachIndexed { index, title ->
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { selectedTab = index }
                        .padding(vertical = 14.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        title,
                        fontSize = 12.sp,
                        fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Normal,
                        color = if (selectedTab == index) CineVaultTheme.colors.accentGold else CineVaultTheme.colors.textSecondary,
                        letterSpacing = 0.5.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    if (selectedTab == index) {
                        Box(
                            modifier = Modifier
                                .height(2.dp)
                                .fillMaxWidth(0.6f)
                                .background(CineVaultTheme.colors.accentGold, RoundedCornerShape(1.dp))
                        )
                    }
                }
            }
        }

        @Suppress("DEPRECATION")
        Divider(color = CineVaultTheme.colors.borderSubtle.copy(alpha = 0.5f), thickness = 0.5.dp)

        when (selectedTab) {
            0 -> DetailsTabContent(movie)
            1 -> CommentsTabContent()
        }

        Spacer(modifier = Modifier.height(40.dp))
    }
}

// ── Premium Meta Chips (highlight boxes) ──

@Composable
private fun MovieMetaChips(movie: MovieDto) {
    val metaParts = buildList {
        movie.releaseYear?.let { add(it.toString()) }
        movie.duration?.let { add("$it min") }
        movie.country?.let { if (it.isNotBlank()) add(it) }
        movie.contentRating?.let { add(it) }
        movie.genres.take(2).forEach { add(it) }
    }
    if (metaParts.isNotEmpty()) {
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(metaParts.size) { index ->
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Color.White.copy(alpha = 0.1f),
                    border = BorderStroke(0.5.dp, Color.White.copy(alpha = 0.2f)),
                ) {
                    Text(
                        metaParts[index],
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.White.copy(alpha = 0.85f),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                        maxLines = 1
                    )
                }
            }
        }
    }
}

// ── Premium Action Button ──

@Composable
private fun PremiumActionButton(
    label: String,
    icon: ImageVector,
    isActive: Boolean = false,
    onClick: () -> Unit = {},
) {
    val iconColor by animateColorAsState(
        targetValue = if (isActive) CineVaultTheme.colors.accentGold else Color.White,
        label = "iconColor"
    )
    val textColor by animateColorAsState(
        targetValue = if (isActive) CineVaultTheme.colors.accentGold else CineVaultTheme.colors.textSecondary,
        label = "textColor"
    )
    val bounceScale = remember { Animatable(1f) }

    LaunchedEffect(isActive) {
        if (isActive) {
            bounceScale.animateTo(1.2f, spring(dampingRatio = 0.4f, stiffness = Spring.StiffnessMedium))
            bounceScale.animateTo(1f, spring(dampingRatio = 0.5f, stiffness = Spring.StiffnessMedium))
        }
    }

    Column(
        modifier = Modifier
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(vertical = 8.dp, horizontal = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .scale(bounceScale.value)
                .clip(CircleShape)
                .background(
                    if (isActive) CineVaultTheme.colors.accentGold.copy(alpha = 0.12f)
                    else Color.White.copy(alpha = 0.06f),
                    CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                icon, label,
                tint = iconColor,
                modifier = Modifier.size(22.dp)
            )
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            label, fontSize = 10.sp, fontWeight = FontWeight.Medium,
            color = textColor,
            maxLines = 1, overflow = TextOverflow.Ellipsis
        )
    }
}

// ── Premium Like Button with animation ──

@Composable
private fun PremiumLikeButton(
    isLiked: Boolean,
    onClick: () -> Unit,
) {
    val bounceScale = remember { Animatable(1f) }
    val glowAlpha = remember { Animatable(0f) }

    LaunchedEffect(isLiked) {
        if (isLiked) {
            // YouTube-style: quick shrink → pop up → settle with glow
            bounceScale.snapTo(0.7f)
            glowAlpha.snapTo(0.4f)
            bounceScale.animateTo(
                targetValue = 1.35f,
                animationSpec = spring(dampingRatio = 0.35f, stiffness = Spring.StiffnessMediumLow)
            )
            glowAlpha.animateTo(0f, tween(400))
            bounceScale.animateTo(
                targetValue = 1f,
                animationSpec = spring(dampingRatio = 0.5f, stiffness = Spring.StiffnessMedium)
            )
        } else {
            bounceScale.snapTo(1f)
        }
    }

    val iconColor by animateColorAsState(
        targetValue = if (isLiked) CineVaultTheme.colors.accentGold else Color.White,
        animationSpec = tween(300),
        label = "likeColor"
    )

    Column(
        modifier = Modifier
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(vertical = 8.dp, horizontal = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .scale(bounceScale.value),
            contentAlignment = Alignment.Center
        ) {
            // Glow ring on like
            if (glowAlpha.value > 0f) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .border(
                            width = 2.dp,
                            color = CineVaultTheme.colors.accentGold.copy(alpha = glowAlpha.value),
                            shape = CircleShape
                        )
                )
            }
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(
                        if (isLiked) CineVaultTheme.colors.accentGold.copy(alpha = 0.12f)
                        else Color.White.copy(alpha = 0.06f),
                        CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (isLiked) Icons.Default.ThumbUp else Icons.Outlined.ThumbUp,
                    "Like",
                    tint = iconColor,
                    modifier = Modifier.size(22.dp)
                )
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            "Like", fontSize = 10.sp, fontWeight = FontWeight.Medium,
            color = if (isLiked) CineVaultTheme.colors.accentGold else CineVaultTheme.colors.textSecondary,
            maxLines = 1, overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun DetailsTabContent(movie: MovieDto) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(16.dp)
    ) {
        if (movie.description != null) {
            Text(
                movie.description!!,
                fontSize = 13.sp, lineHeight = 20.sp,
                color = CineVaultTheme.colors.textSecondary,
                modifier = Modifier.padding(bottom = 16.dp)
            )
        }
        if (!movie.cast.isNullOrEmpty()) {
            Text(
                "CAST & CREW",
                fontSize = 13.sp, fontWeight = FontWeight.Bold,
                color = CineVaultTheme.colors.textPrimary,
                letterSpacing = 0.5.sp,
                modifier = Modifier.padding(bottom = 12.dp)
            )
            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                items(movie.cast!!.size) { index ->
                    CastCardWidget(name = movie.cast!![index].name, photoUrl = movie.cast!![index].photoUrl)
                }
            }
        }
    }
}

@Composable
private fun CastCardWidget(name: String, photoUrl: String? = null) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.width(85.dp)
    ) {
        Box(
            modifier = Modifier
                .size(70.dp)
                .background(CineVaultTheme.colors.surface, RoundedCornerShape(6.dp))
                .clip(RoundedCornerShape(6.dp)),
            contentAlignment = Alignment.Center
        ) {
            if (!photoUrl.isNullOrBlank()) {
                AsyncImage(model = photoUrl, contentDescription = name, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            } else {
                Icon(Icons.Default.Person, "Cast", tint = CineVaultTheme.colors.textSecondary, modifier = Modifier.size(35.dp))
            }
        }
        Text(
            name, fontSize = 11.sp, fontWeight = FontWeight.Medium,
            color = CineVaultTheme.colors.textPrimary,
            modifier = Modifier.padding(top = 8.dp),
            maxLines = 2, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun CommentsTabContent() {
    Box(
        modifier = Modifier.fillMaxWidth().height(150.dp).padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Text("No comments yet", color = CineVaultTheme.colors.textSecondary, fontSize = 14.sp)
    }
}

// ── Episodes Section ──

@Composable
private fun EpisodesSection(
    seasons: List<SeasonDto>,
    episodes: List<EpisodeDto>,
    selectedSeasonId: String?,
    onSeasonSelected: (String) -> Unit,
    onEpisodeClick: (EpisodeDto) -> Unit,
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        @Suppress("DEPRECATION")
        Divider(color = CineVaultTheme.colors.borderSubtle.copy(alpha = 0.5f), thickness = 0.5.dp)

        // Section Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                "EPISODES",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = CineVaultTheme.colors.textPrimary,
                letterSpacing = 0.5.sp
            )
        }

        // Season selector (chips)
        if (seasons.size > 1) {
            LazyRow(
                modifier = Modifier.padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(seasons.size) { index ->
                    val season = seasons[index]
                    val isSelected = season.id == selectedSeasonId
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = if (isSelected) CineVaultTheme.colors.accentGold else Color.White.copy(alpha = 0.08f),
                        modifier = Modifier.clickable { onSeasonSelected(season.id) }
                    ) {
                        Text(
                            season.title ?: "Season ${season.seasonNumber}",
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) Color.Black else CineVaultTheme.colors.textSecondary,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
        }

        // Episodes list
        if (episodes.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Text("No episodes available", color = CineVaultTheme.colors.textMuted, fontSize = 13.sp)
            }
        } else {
            episodes.forEach { episode ->
                EpisodeCard(
                    episode = episode,
                    onClick = { onEpisodeClick(episode) }
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))
    }
}

@Composable
private fun EpisodeCard(
    episode: EpisodeDto,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Thumbnail
        Box(
            modifier = Modifier
                .width(120.dp)
                .height(68.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(CineVaultTheme.colors.surface),
            contentAlignment = Alignment.Center
        ) {
            if (!episode.thumbnailUrl.isNullOrBlank()) {
                AsyncImage(
                    model = episode.thumbnailUrl,
                    contentDescription = episode.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                Icon(
                    Icons.Default.PlayCircle,
                    contentDescription = null,
                    tint = CineVaultTheme.colors.textMuted,
                    modifier = Modifier.size(28.dp)
                )
            }
            // Episode number badge
            Box(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(4.dp)
                    .background(Color.Black.copy(alpha = 0.7f), RoundedCornerShape(4.dp))
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    "E${episode.episodeNumber}",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
            // Play overlay
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.PlayArrow,
                    contentDescription = "Play",
                    tint = Color.White.copy(alpha = 0.9f),
                    modifier = Modifier.size(32.dp)
                )
            }
        }

        // Episode info
        Column(modifier = Modifier.weight(1f)) {
            Text(
                episode.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = CineVaultTheme.colors.textPrimary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(4.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                episode.duration?.let {
                    Text(
                        "${it} min",
                        fontSize = 11.sp,
                        color = CineVaultTheme.colors.textMuted
                    )
                }
            }
            if (!episode.synopsis.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    episode.synopsis!!,
                    fontSize = 11.sp,
                    color = CineVaultTheme.colors.textSecondary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 15.sp
                )
            }
        }
    }
}

// ── ExoPlayer Trailer Player ──

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
@Composable
private fun TrailerPlayer(
    trailerUrl: String,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var isPlaying by remember { mutableStateOf(true) }
    var is2x by remember { mutableStateOf(false) }
    var showControls by remember { mutableStateOf(true) }

    // Convert Google Drive share links to direct download URL
    val playableUrl = remember(trailerUrl) {
        val driveFileIdRegex = Regex("drive\\.google\\.com/file/d/([a-zA-Z0-9_-]+)")
        val match = driveFileIdRegex.find(trailerUrl)
        if (match != null) {
            val fileId = match.groupValues[1]
            "https://drive.usercontent.google.com/download?id=$fileId&export=download&authuser=0&confirm=t"
        } else {
            trailerUrl
        }
    }

    val exoPlayer = remember(playableUrl) {
        android.util.Log.d("TrailerDebug", "Playing trailer from: $playableUrl")

        val httpFactory = DefaultHttpDataSource.Factory()
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(15_000)
            .setReadTimeoutMs(15_000)

        ExoPlayer.Builder(context)
            .setMediaSourceFactory(DefaultMediaSourceFactory(httpFactory))
            .build()
            .apply {
            addListener(object : Player.Listener {
                override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                    android.util.Log.e("TrailerDebug", "Player error: ${error.message}", error)
                }
                override fun onPlaybackStateChanged(state: Int) {
                    val stateName = when(state) {
                        Player.STATE_IDLE -> "IDLE"
                        Player.STATE_BUFFERING -> "BUFFERING"
                        Player.STATE_READY -> "READY"
                        Player.STATE_ENDED -> "ENDED"
                        else -> "UNKNOWN"
                    }
                    android.util.Log.d("TrailerDebug", "State: $stateName")
                }
            })
            setMediaItem(MediaItem.fromUri(playableUrl))
            repeatMode = Player.REPEAT_MODE_ALL
            playWhenReady = true
            volume = 1f
            prepare()
        }
    }

    // Auto-hide controls after 3 seconds
    LaunchedEffect(showControls) {
        if (showControls) {
            kotlinx.coroutines.delay(3000)
            showControls = false
        }
    }

    DisposableEffect(exoPlayer) {
        onDispose {
            exoPlayer.release()
        }
    }

    Box(modifier = modifier) {
        // Player view
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player = exoPlayer
                    useController = false // we build our own controls
                    setBackgroundColor(android.graphics.Color.BLACK)
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // Touch gesture layer: tap = toggle controls, long press & hold = 2x speed
        Box(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    detectTapGestures(
                        onTap = {
                            showControls = !showControls
                        },
                        onLongPress = {
                            // 2x speed starts here, release handled below
                            is2x = true
                            exoPlayer.setPlaybackSpeed(2f)
                        }
                    )
                }
                .pointerInput(Unit) {
                    awaitPointerEventScope {
                        while (true) {
                            val event = awaitPointerEvent()
                            if (event.type == PointerEventType.Release && is2x) {
                                is2x = false
                                exoPlayer.setPlaybackSpeed(1f)
                            }
                        }
                    }
                }
        )

        // 2x speed indicator
        if (is2x) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Color.Black.copy(alpha = 0.7f),
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 12.dp)
            ) {
                Text(
                    "2x",
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                )
            }
        }

        // Play/Pause button (center)
        if (showControls) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.3f)),
                contentAlignment = Alignment.Center
            ) {
                IconButton(
                    onClick = {
                        if (exoPlayer.isPlaying) {
                            exoPlayer.pause()
                            isPlaying = false
                        } else {
                            exoPlayer.play()
                            isPlaying = true
                        }
                    },
                    modifier = Modifier
                        .size(56.dp)
                        .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                ) {
                    Icon(
                        if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                        contentDescription = if (isPlaying) "Pause" else "Play",
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
        }
    }
}
