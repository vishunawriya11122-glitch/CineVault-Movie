package com.cinevault.app.ui.screen

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
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
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.ui.viewinterop.AndroidView

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MovieDetailScreen(
    onBack: () -> Unit,
    onPlay: (contentId: String, episodeId: String?) -> Unit,
    onRelatedClick: (String) -> Unit,
    viewModel: MovieDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }

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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CineVaultTheme.colors.background)
            .verticalScroll(rememberScrollState())
    ) {
        // ── Full-bleed hero image with seamless fade into background ──
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(0.85f) // Compact hero — less gap before details
        ) {
            AsyncImage(
                model = movie.backdropUrl ?: movie.posterUrl,
                contentDescription = movie.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            // Top gradient for status bar / back button
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

            // Bottom gradient — heavy fade into background
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
                    .padding(start = 8.dp, top = 8.dp)
                    .align(Alignment.TopStart)
                    .background(Color.Black.copy(alpha = 0.4f), CircleShape)
                    .size(40.dp)
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }

            // ── Overlaid content at bottom of hero ──
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 16.dp)
            ) {
                // Ranking label — subtle & faded
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

                // Movie Title
                Text(
                    movie.title,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(10.dp))

                // ── Single-line metadata: UA • 2024 • 180 min • India • Drama • History ──
                val metaParts = buildList {
                    movie.contentRating?.let { add(it) }
                    movie.releaseYear?.let { add(it.toString()) }
                    movie.duration?.let { add("$it min") }
                    movie.country?.let { if (it.isNotBlank()) add(it) }
                    movie.genres.forEach { add(it) }
                }
                if (metaParts.isNotEmpty()) {
                    Text(
                        metaParts.joinToString(" • "),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.White.copy(alpha = 0.7f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }

        // ── Content area below hero (seamless, no box separation) ──
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
        ) {
            Spacer(modifier = Modifier.height(4.dp))

            // ── IMDb Rating with star icons ──
            val starRating = movie.starRating ?: movie.rating ?: 0.0
            if (starRating > 0) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // IMDb badge
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

                    // Rating number
                    Text(
                        String.format("%.1f", starRating),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )

                    // Star icons (5 stars, based on rating out of 10)
                    val starsOut5 = (starRating / 2.0).coerceIn(0.0, 5.0)
                    val fullStars = starsOut5.toInt()
                    val hasHalf = (starsOut5 - fullStars) >= 0.25
                    val emptyStars = 5 - fullStars - if (hasHalf) 1 else 0

                    Row(horizontalArrangement = Arrangement.spacedBy(1.dp)) {
                        repeat(fullStars) {
                            Icon(
                                Icons.Default.Star,
                                contentDescription = null,
                                tint = Color(0xFFFFD700),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        if (hasHalf) {
                            Icon(
                                Icons.Default.StarHalf,
                                contentDescription = null,
                                tint = Color(0xFFFFD700),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        repeat(emptyStars) {
                            Icon(
                                Icons.Default.StarBorder,
                                contentDescription = null,
                                tint = Color(0xFFFFD700).copy(alpha = 0.4f),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))
            }

            // ── WATCH NOW button — premium gold/accent themed ──
            Button(
                onClick = {
                    if (movie.id.isNotBlank()) {
                        onPlay(movie.id, null)
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = CineVaultTheme.colors.accentGold
                ),
                shape = RoundedCornerShape(8.dp),
                enabled = movie.id.isNotBlank()
            ) {
                Icon(
                    Icons.Default.PlayArrow,
                    contentDescription = "Play",
                    tint = Color.Black,
                    modifier = Modifier.size(22.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "WATCH NOW",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.Black,
                    letterSpacing = 1.sp
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // ── Premium action buttons ──
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                MovieActionButton(
                    "My List",
                    Icons.Default.Add,
                    onClick = { viewModel.toggleWatchlist() },
                    isActive = uiState.isInWatchlist
                )
                MovieActionButton("Thumbs Up", Icons.Default.ThumbUp)
                MovieActionButton("Share", Icons.Default.Share)
                MovieActionButton("Download", Icons.Default.Download)
            }

            Spacer(modifier = Modifier.height(24.dp))
        }

        // ── Tabs ──
        Divider(
            color = CineVaultTheme.colors.borderSubtle.copy(alpha = 0.5f),
            thickness = 0.5.dp
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(CineVaultTheme.colors.background)
                .padding(horizontal = 16.dp)
        ) {
            listOf("DETAILS", "COMMENTS", "TRAILER").forEachIndexed { index, title ->
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
                        color = if (selectedTab == index)
                            CineVaultTheme.colors.accentGold
                        else
                            CineVaultTheme.colors.textSecondary,
                        letterSpacing = 0.5.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    if (selectedTab == index) {
                        Box(
                            modifier = Modifier
                                .height(2.dp)
                                .fillMaxWidth(0.6f)
                                .background(
                                    CineVaultTheme.colors.accentGold,
                                    RoundedCornerShape(1.dp)
                                )
                        )
                    }
                }
            }
        }

        Divider(
            color = CineVaultTheme.colors.borderSubtle.copy(alpha = 0.5f),
            thickness = 0.5.dp
        )

        // Tab content
        when (selectedTab) {
            0 -> DetailsTabContent(movie)
            1 -> CommentsTabContent()
            2 -> TrailerTabContent(movie.trailerUrl)
        }

        Spacer(modifier = Modifier.height(40.dp))
    }
}

@Composable
private fun MovieActionButton(
    label: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit = {},
    isActive: Boolean = false
) {
    Column(
        modifier = modifier
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp, horizontal = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            icon,
            contentDescription = label,
            tint = if (isActive) CineVaultTheme.colors.accentGold else Color.White,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            label,
            fontSize = 10.sp,
            fontWeight = FontWeight.Medium,
            color = if (isActive) CineVaultTheme.colors.accentGold else CineVaultTheme.colors.textSecondary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun DetailsTabContent(movie: MovieDto) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        if (movie.description != null) {
            Text(
                movie.description!!,
                fontSize = 13.sp,
                lineHeight = 20.sp,
                color = CineVaultTheme.colors.textSecondary,
                modifier = Modifier.padding(bottom = 16.dp)
            )
        }

        if (!movie.cast.isNullOrEmpty()) {
            Text(
                "CAST & CREW",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = CineVaultTheme.colors.textPrimary,
                letterSpacing = 0.5.sp,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(movie.cast!!.size) { index ->
                    CastCardWidget(
                        name = movie.cast!![index].name,
                        photoUrl = movie.cast!![index].photoUrl
                    )
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
                .background(
                    CineVaultTheme.colors.surface,
                    RoundedCornerShape(6.dp)
                )
                .clip(RoundedCornerShape(6.dp)),
            contentAlignment = Alignment.Center
        ) {
            if (!photoUrl.isNullOrBlank()) {
                AsyncImage(
                    model = photoUrl,
                    contentDescription = name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                Icon(
                    Icons.Default.Person,
                    contentDescription = "Cast",
                    tint = CineVaultTheme.colors.textSecondary,
                    modifier = Modifier.size(35.dp)
                )
            }
        }
        Text(
            name,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = CineVaultTheme.colors.textPrimary,
            modifier = Modifier.padding(top = 8.dp),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun CommentsTabContent() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(150.dp)
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            "No comments yet",
            color = CineVaultTheme.colors.textSecondary,
            fontSize = 14.sp
        )
    }
}

@Composable
private fun TrailerTabContent(trailerUrl: String?) {
    val videoId = remember(trailerUrl) { trailerUrl?.let { extractYouTubeVideoId(it) } }
    if (videoId != null) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                "TRAILER",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = CineVaultTheme.colors.textPrimary,
                letterSpacing = 0.5.sp,
                modifier = Modifier.padding(bottom = 12.dp)
            )
            YouTubeTrailerPlayer(
                videoId = videoId,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .clip(RoundedCornerShape(12.dp)),
            )
        }
    } else {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(150.dp)
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                "No trailer available",
                color = CineVaultTheme.colors.textSecondary,
                fontSize = 14.sp
            )
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun YouTubeTrailerPlayer(
    videoId: String,
    modifier: Modifier = Modifier,
) {
    val safeVideoId = remember(videoId) {
        videoId.replace(Regex("[^a-zA-Z0-9_-]"), "")
    }

    val html = remember(safeVideoId) {
        """
        <!DOCTYPE html>
        <html><head>
        <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
        <style>
        *{margin:0;padding:0;overflow:hidden}
        body{background:#000}
        iframe{width:100%;height:100%;border:0}
        </style></head><body>
        <iframe src="https://www.youtube.com/embed/${safeVideoId}?autoplay=1&mute=0&loop=1&playlist=${safeVideoId}&controls=0&showinfo=0&modestbranding=1&rel=0&fs=0&iv_load_policy=3&disablekb=1&playsinline=1&cc_load_policy=0"
        allow="autoplay;encrypted-media" allowfullscreen></iframe>
        </body></html>
        """.trimIndent()
    }

    AndroidView(
        factory = { context ->
            WebView(context).apply {
                settings.javaScriptEnabled = true
                settings.mediaPlaybackRequiresUserGesture = false
                settings.domStorageEnabled = true
                settings.loadWithOverviewMode = true
                settings.useWideViewPort = true
                setLayerType(View.LAYER_TYPE_HARDWARE, null)
                setBackgroundColor(android.graphics.Color.BLACK)
                webChromeClient = WebChromeClient()
                webViewClient = WebViewClient()
                loadDataWithBaseURL(
                    "https://www.youtube.com", html, "text/html", "UTF-8", null
                )
            }
        },
        onRelease = { it.destroy() },
        modifier = modifier
    )
}

private fun extractYouTubeVideoId(url: String): String? {
    val pattern = Regex(
        "(?:youtube\\.com/watch\\?.*v=|youtu\\.be/|youtube\\.com/embed/|youtube\\.com/v/)([a-zA-Z0-9_-]{11})"
    )
    return pattern.find(url)?.groupValues?.getOrNull(1)
}
