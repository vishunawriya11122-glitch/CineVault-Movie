package com.cinevault.app.ui.screen

import android.content.Intent
import android.widget.Toast
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

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
    var showMoreSeasonsSheet by remember { mutableStateOf(false) }
    var isExiting by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()

    // Instant-hide trailer then navigate back
    val handleBack: () -> Unit = {
        if (!isExiting) {
            isExiting = true
            onBack()
        }
    }

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
    val isSeries = movie.contentType in listOf("web_series", "tv_show", "anime")
    val isUpcoming = movie.status == "upcoming"

    // Resume watching logic
    val watchProgress = uiState.watchProgress
    // For series: any saved progress (even completed episode) means the user has started watching
    val hasProgress = watchProgress != null && watchProgress.currentTime > 0
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
                        isExiting = isExiting,
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
                    onClick = handleBack,
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
                if (isSeries && uiState.seasons.isNotEmpty()) {
                    val selectedSeason = uiState.seasons.find { it.id == uiState.selectedSeasonId }
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            movie.title,
                            fontSize = 26.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f, fill = false)
                        )
                        SeasonDropdownBadge(
                            seasonName = "Season ${selectedSeason?.seasonNumber ?: 1}",
                            onClick = { showMoreSeasonsSheet = true }
                        )
                    }
                } else {
                    Text(
                        movie.title,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
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
                    onClick = handleBack,
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
                    if (isSeries && uiState.seasons.isNotEmpty()) {
                        val selectedSeason = uiState.seasons.find { it.id == uiState.selectedSeasonId }
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                movie.title,
                                fontSize = 26.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f, fill = false)
                            )
                            SeasonDropdownBadge(
                                seasonName = "Season ${selectedSeason?.seasonNumber ?: 1}",
                                onClick = { showMoreSeasonsSheet = true }
                            )
                        }
                    } else {
                        Text(
                            movie.title,
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
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

            // ── Premium WATCH NOW / RESUME WATCHING button (hidden for upcoming) ──
            if (!isUpcoming) {
            Button(
                onClick = {
                    if (movie.id.isNotBlank()) {
                        val episodeIdToPlay = when {
                            // Series: resume last watched episode
                            isSeries && hasProgress -> watchProgress?.contentId
                            // Series: no prior progress → start from first episode
                            isSeries && !hasProgress -> uiState.episodes.firstOrNull()?.id
                            // Movie / Anime Movie: no episode ID needed
                            else -> null
                        }
                        onPlay(movie.id, episodeIdToPlay)
                    }
                },
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
            } // end if (!isUpcoming)

            Spacer(modifier = Modifier.height(14.dp))

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
                        val shareText = "Check out \"${movie.title}\" on VELORA!\nhttps://cinevault.app/movie/${movie.id}"
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

            Spacer(modifier = Modifier.height(4.dp))
        }

        // ── Episodes Section (for series content, hidden for upcoming) ──
        val isSeries = movie.contentType in listOf("web_series", "tv_show", "anime")
        if (isSeries && uiState.seasons.isNotEmpty() && !isUpcoming) {
            EpisodesSection(
                seasons = uiState.seasons,
                episodes = uiState.episodes,
                selectedSeasonId = uiState.selectedSeasonId,
                seriesPosterUrl = movie.posterUrl,
                onSeasonSelected = { viewModel.selectSeason(it) },
                onEpisodeClick = { episode -> onPlay(movie.id, episode.id) },
                onMoreSeasonsClick = { showMoreSeasonsSheet = true }
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

    // ── More Seasons Bottom Sheet ──
    if (showMoreSeasonsSheet && uiState.seasons.isNotEmpty()) {
        MoreSeasonsBottomSheet(
            seasons = uiState.seasons,
            episodes = uiState.episodes,
            selectedSeasonId = uiState.selectedSeasonId,
            onSeasonSelected = { viewModel.selectSeason(it) },
            onEpisodeClick = { episode -> onPlay(movie.id, episode.id) },
            onDismiss = { showMoreSeasonsSheet = false }
        )
    }
}

// ── Premium Meta Chips (highlight boxes) ──

@Composable
private fun MovieMetaChips(movie: MovieDto) {
    val seriesTypes = listOf("web_series", "tv_show", "anime")
    val metaParts = buildList {
        movie.releaseYear?.let { add(it.toString()) }
        if (movie.contentType !in seriesTypes) movie.duration?.let { add("$it min") }
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
    seriesPosterUrl: String?,
    onSeasonSelected: (String) -> Unit,
    onEpisodeClick: (EpisodeDto) -> Unit,
    onMoreSeasonsClick: () -> Unit,
) {
    val selectedSeason = seasons.find { it.id == selectedSeasonId }
    val episodeCount = selectedSeason?.episodeCount?.takeIf { it > 0 } ?: episodes.size

    Column(modifier = Modifier.fillMaxWidth()) {
        @Suppress("DEPRECATION")
        Divider(color = CineVaultTheme.colors.borderSubtle.copy(alpha = 0.5f), thickness = 0.5.dp)

        // Header: "Season X • N Episodes" + "More Season >"
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f, fill = false)) {
                Text(
                    "EPISODES",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = CineVaultTheme.colors.textSecondary,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(3.dp))
                Text(
                    "Season ${selectedSeason?.seasonNumber ?: 1} \u2022 $episodeCount Episodes",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = CineVaultTheme.colors.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (seasons.size > 1) {
                TextButton(onClick = onMoreSeasonsClick) {
                    Text(
                        "More Season",
                        color = CineVaultTheme.colors.accentGold,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Icon(
                        Icons.Default.KeyboardArrowRight,
                        contentDescription = null,
                        tint = CineVaultTheme.colors.accentGold,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }

        // Horizontal episodes carousel
        if (episodes.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(
                    color = CineVaultTheme.colors.accentGold,
                    modifier = Modifier.size(24.dp),
                    strokeWidth = 2.dp
                )
            }
        } else {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(episodes) { episode ->
                    HorizontalEpisodeCard(
                        episode = episode,
                        seriesPosterUrl = seriesPosterUrl,
                        onClick = { onEpisodeClick(episode) }
                    )
                }
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

// ── Season Dropdown Badge ──

@Composable
private fun SeasonDropdownBadge(
    seasonName: String,
    onClick: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(6.dp),
        color = Color.White.copy(alpha = 0.14f),
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(
                seasonName,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = CineVaultTheme.colors.accentGold
            )
            Icon(
                Icons.Default.ArrowDropDown,
                contentDescription = "Select Season",
                tint = CineVaultTheme.colors.accentGold,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

// ── Horizontal Episode Card ──

@Composable
private fun HorizontalEpisodeCard(
    episode: EpisodeDto,
    seriesPosterUrl: String?,
    onClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .width(160.dp)
            .clickable(onClick = onClick)
    ) {
        Box(
            modifier = Modifier
                .width(160.dp)
                .height(90.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(CineVaultTheme.colors.surface),
            contentAlignment = Alignment.Center
        ) {
            val thumbUrl = episode.thumbnailUrl?.takeIf { it.isNotBlank() } ?: seriesPosterUrl
            if (!thumbUrl.isNullOrBlank()) {
                AsyncImage(
                    model = thumbUrl,
                    contentDescription = episode.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Color.Black.copy(
                                alpha = if (episode.thumbnailUrl.isNullOrBlank()) 0.45f else 0.15f
                            )
                        )
                )
            } else {
                Icon(
                    Icons.Default.PlayCircle,
                    contentDescription = null,
                    tint = CineVaultTheme.colors.textMuted,
                    modifier = Modifier.size(36.dp)
                )
            }

            // Centre play icon
            Icon(
                Icons.Default.PlayArrow,
                contentDescription = "Play",
                tint = Color.White.copy(alpha = 0.9f),
                modifier = Modifier
                    .size(36.dp)
                    .align(Alignment.Center)
            )

            // Episode badge – top-left
            Box(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(5.dp)
                    .background(CineVaultTheme.colors.accentGold, RoundedCornerShape(4.dp))
                    .padding(horizontal = 5.dp, vertical = 2.dp)
            ) {
                Text(
                    "E${episode.episodeNumber}",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
            }

            // Duration badge – bottom-right
            episode.duration?.let { dur ->
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(5.dp)
                        .background(Color.Black.copy(alpha = 0.78f), RoundedCornerShape(4.dp))
                        .padding(horizontal = 5.dp, vertical = 2.dp)
                ) {
                    Text(
                        formatEpisodeDuration(dur),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(7.dp))
        Text(
            "Episode ${episode.episodeNumber}",
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = CineVaultTheme.colors.textPrimary,
            maxLines = 1
        )
        if (episode.title.isNotBlank()) {
            Text(
                episode.title,
                fontSize = 11.sp,
                color = CineVaultTheme.colors.textSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

private fun formatEpisodeDuration(minutes: Int): String =
    if (minutes >= 60) {
        val h = minutes / 60
        val m = minutes % 60
        if (m == 0) "${h}h" else "${h}h ${m}m"
    } else "${minutes}m"

// ── More Seasons Bottom Sheet ──

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MoreSeasonsBottomSheet(
    seasons: List<SeasonDto>,
    episodes: List<EpisodeDto>,
    selectedSeasonId: String?,
    onSeasonSelected: (String) -> Unit,
    onEpisodeClick: (EpisodeDto) -> Unit,
    onDismiss: () -> Unit,
) {
    var sheetSelectedId by remember { mutableStateOf(selectedSeasonId) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Color(0xFF1E1E1E),
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(vertical = 12.dp)
                    .width(40.dp)
                    .height(4.dp)
                    .background(Color.White.copy(alpha = 0.3f), RoundedCornerShape(2.dp))
            )
        }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(bottom = 20.dp)
        ) {
            Text(
                "SELECT SEASON",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = CineVaultTheme.colors.textSecondary,
                letterSpacing = 1.sp,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp)
            )

            // Season tabs
            LazyRow(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(seasons) { season ->
                    val isSelected = season.id == sheetSelectedId
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = if (isSelected) CineVaultTheme.colors.accentGold
                                else Color.White.copy(alpha = 0.08f),
                        modifier = Modifier.clickable {
                            sheetSelectedId = season.id
                            onSeasonSelected(season.id)
                        }
                    ) {
                        Text(
                            season.title ?: "Season ${season.seasonNumber}",
                            fontSize = 13.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) Color.Black
                                    else CineVaultTheme.colors.textSecondary,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                        )
                    }
                }
            }

            @Suppress("DEPRECATION")
            Divider(color = Color.White.copy(alpha = 0.08f), thickness = 0.5.dp)
            Spacer(modifier = Modifier.height(14.dp))

            // Episode squares for the visible season
            val currentSeason = seasons.find { it.id == sheetSelectedId }
            val currentEpisodes = if (sheetSelectedId == selectedSeasonId) episodes else emptyList()
            val displayCount = currentEpisodes.size.takeIf { it > 0 }
                ?: (currentSeason?.episodeCount ?: 0)

            if (displayCount > 0) {
                Text(
                    "${currentSeason?.title ?: "Season ${currentSeason?.seasonNumber ?: 1}"} \u00b7 $displayCount Episodes",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = CineVaultTheme.colors.textPrimary,
                    modifier = Modifier.padding(start = 20.dp, end = 20.dp, bottom = 10.dp)
                )
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    if (currentEpisodes.isNotEmpty()) {
                        items(currentEpisodes) { ep ->
                            EpisodeNumberSquare(
                                number = ep.episodeNumber,
                                isLoaded = true,
                                onClick = { onEpisodeClick(ep); onDismiss() }
                            )
                        }
                    } else {
                        items(displayCount) { index ->
                            EpisodeNumberSquare(
                                number = index + 1,
                                isLoaded = false,
                                onClick = {}
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EpisodeNumberSquare(
    number: Int,
    isLoaded: Boolean,
    onClick: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = if (isLoaded) Color.White.copy(alpha = 0.1f) else Color.White.copy(alpha = 0.05f),
        modifier = Modifier
            .size(52.dp)
            .clickable(enabled = isLoaded, onClick = onClick)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                number.toString(),
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = if (isLoaded) CineVaultTheme.colors.textPrimary
                        else CineVaultTheme.colors.textMuted
            )
        }
    }
}

// ── Smart Trailer Player (YouTube + ExoPlayer) ──

/** Extract YouTube video ID from various URL formats */
private fun extractYoutubeVideoId(url: String): String? {
    val patterns = listOf(
        Regex("youtube\\.com/watch\\?v=([a-zA-Z0-9_-]{11})"),
        Regex("youtu\\.be/([a-zA-Z0-9_-]{11})"),
        Regex("youtube\\.com/embed/([a-zA-Z0-9_-]{11})"),
        Regex("youtube\\.com/v/([a-zA-Z0-9_-]{11})"),
        Regex("youtube\\.com/shorts/([a-zA-Z0-9_-]{11})")
    )
    for (p in patterns) {
        val match = p.find(url)
        if (match != null) return match.groupValues[1]
    }
    return null
}

@Composable
private fun TrailerPlayer(
    trailerUrl: String,
    isExiting: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val youtubeId = remember(trailerUrl) { extractYoutubeVideoId(trailerUrl) }
    if (youtubeId != null) {
        YouTubeTrailerPlayer(videoId = youtubeId, isExiting = isExiting, modifier = modifier)
    } else {
        ExoTrailerPlayer(trailerUrl = trailerUrl, isExiting = isExiting, modifier = modifier)
    }
}

// ── YouTube Trailer Player (WebView + IFrame API) ──

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun YouTubeTrailerPlayer(
    videoId: String,
    isExiting: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var isMuted by remember { mutableStateOf(true) }
    var is2x by remember { mutableStateOf(false) }

    val webView = remember(videoId) {
        android.webkit.WebView(context).apply {
            setBackgroundColor(android.graphics.Color.BLACK)
            settings.javaScriptEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.domStorageEnabled = true
            settings.loadWithOverviewMode = true
            settings.useWideViewPort = true
            webChromeClient = android.webkit.WebChromeClient()

            // JS → Kotlin bridge for mute state sync
            addJavascriptInterface(object {
                @android.webkit.JavascriptInterface
                fun onMuteChange(muted: Boolean) { isMuted = muted }
            }, "Android")

            val html = """
<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>*{margin:0;padding:0;overflow:hidden;background:#000}
html,body,#player{width:100%;height:100%}</style>
</head><body>
<div id="player"></div>
<script src="https://www.youtube.com/iframe_api"></script>
<script>
var player;
function onYouTubeIframeAPIReady(){
  player=new YT.Player('player',{
    width:'100%',height:'100%',
    videoId:'${videoId}',
    playerVars:{
      autoplay:1,mute:1,controls:1,loop:1,
      playlist:'${videoId}',playsinline:1,
      rel:0,modestbranding:1,showinfo:0,fs:0,iv_load_policy:3,
      cc_load_policy:0
    },
    events:{
      onReady:function(e){e.target.mute();e.target.playVideo();},
      onStateChange:function(e){
        if(e.data===0){e.target.seekTo(0);e.target.playVideo();}
      }
    }
  });
}
function doMute(){if(player){player.mute();Android.onMuteChange(true);}}
function doUnmute(){if(player){player.unMute();Android.onMuteChange(false);}}
function doSpeed(r){if(player)player.setPlaybackRate(r);}
</script>
</body></html>
            """.trimIndent()

            loadDataWithBaseURL("https://www.youtube.com", html, "text/html", "utf-8", null)
        }
    }

    DisposableEffect(videoId) {
        onDispose { webView.destroy() }
    }

    // Instantly hide WebView when exiting
    LaunchedEffect(isExiting) {
        if (isExiting) {
            webView.evaluateJavascript("if(player)player.pauseVideo();", null)
            webView.visibility = android.view.View.INVISIBLE
        }
    }

    Box(modifier = modifier) {
        // YouTube WebView — native controls=1 handles play/pause/seek
        AndroidView(
            factory = { webView },
            modifier = Modifier.fillMaxSize()
        )

        // Long press overlay for 2x speed (transparent, doesn't block YouTube controls)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.5f) // top half only — bottom half has YouTube controls
                .align(Alignment.TopCenter)
                .pointerInput(Unit) {
                    detectTapGestures(
                        onLongPress = {
                            is2x = true
                            webView.evaluateJavascript("doSpeed(2)", null)
                        }
                    )
                }
                .pointerInput(Unit) {
                    awaitPointerEventScope {
                        while (true) {
                            val event = awaitPointerEvent()
                            if (event.type == PointerEventType.Release && is2x) {
                                is2x = false
                                webView.evaluateJavascript("doSpeed(1)", null)
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
                    .padding(top = 8.dp)
            ) {
                Text(
                    "⚡ 2x",
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 5.dp)
                )
            }
        }

        // Mute/Unmute button — Netflix style (bottom-right)
        IconButton(
            onClick = {
                if (isMuted) {
                    webView.evaluateJavascript("doUnmute()", null)
                } else {
                    webView.evaluateJavascript("doMute()", null)
                }
            },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 8.dp, bottom = 8.dp)
                .size(32.dp)
                .background(Color.Black.copy(alpha = 0.6f), CircleShape)
        ) {
            Icon(
                if (isMuted) Icons.Default.VolumeOff else Icons.Default.VolumeUp,
                contentDescription = if (isMuted) "Unmute" else "Mute",
                tint = Color.White,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

// ── ExoPlayer Trailer Player (for Google Drive / direct URLs) ──

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
@Composable
private fun ExoTrailerPlayer(
    trailerUrl: String,
    isExiting: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var isPlaying by remember { mutableStateOf(true) }
    var is2x by remember { mutableStateOf(false) }
    var showControls by remember { mutableStateOf(true) }

    // Convert Google Drive share links to Cloudflare Worker stream URL
    val playableUrl = remember(trailerUrl) {
        val drivePatterns = listOf(
            Regex("drive\\.google\\.com/file/d/([a-zA-Z0-9_-]+)"),
            Regex("drive\\.google\\.com/open\\?id=([a-zA-Z0-9_-]+)"),
            Regex("drive\\.google\\.com/uc\\?.*id=([a-zA-Z0-9_-]+)"),
            Regex("drive\\.usercontent\\.google\\.com/.*[?&]id=([a-zA-Z0-9_-]+)"),
        )
        var fileId: String? = null
        for (p in drivePatterns) {
            val match = p.find(trailerUrl)
            if (match != null) { fileId = match.groupValues[1]; break }
        }
        if (fileId != null) {
            "${com.cinevault.app.BuildConfig.DRIVE_WORKER_URL}/stream/$fileId"
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
            delay(3000)
            showControls = false
        }
    }

    DisposableEffect(exoPlayer) {
        onDispose {
            exoPlayer.release()
        }
    }

    // Instantly stop and detach video surface when exiting
    LaunchedEffect(isExiting) {
        if (isExiting) {
            exoPlayer.stop()
            exoPlayer.clearVideoSurface()
        }
    }

    Box(modifier = modifier) {
        // Player view
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player = exoPlayer
                    useController = false
                    setBackgroundColor(android.graphics.Color.BLACK)
                    setShowBuffering(PlayerView.SHOW_BUFFERING_NEVER)
                }
            },
            update = { view ->
                if (isExiting) view.visibility = android.view.View.INVISIBLE
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
