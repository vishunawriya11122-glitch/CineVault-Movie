package com.cinevault.app.ui.screen

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material.icons.filled.GetApp
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.cinevault.app.data.model.HomeSectionDto
import com.cinevault.app.data.model.WatchProgressDto
import com.cinevault.app.data.model.MovieDto
import com.cinevault.app.ui.components.BannerCarousel
import com.cinevault.app.ui.components.HorizontalMovieSection
import com.cinevault.app.ui.components.MovieCard
import com.cinevault.app.ui.theme.CineVaultTheme
import com.cinevault.app.ui.viewmodel.HomeViewModel
import kotlinx.coroutines.delay

@Composable
fun HomeScreen(
    onMovieClick: (String) -> Unit,
    onSearchClick: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var currentBannerIndex by remember { mutableIntStateOf(0) }

    // Auto-rotate banners every 3-4 seconds
    LaunchedEffect(Unit) {
        while (true) {
            delay(3500)
            if (uiState.banners.isNotEmpty()) {
                currentBannerIndex = (currentBannerIndex + 1) % uiState.banners.size
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(CineVaultTheme.colors.background)
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize()
        ) {
            // Top Navigation Bar
            item {
                TopNavigationBar(
                    onSearchClick = onSearchClick,
                    onProfileClick = { /* TODO: Navigate to profile */ }
                )
            }

            // Hero Banner with metadata and buttons
            item {
                RectangularHeroBanner(
                    banner = if (uiState.banners.isNotEmpty()) uiState.banners[currentBannerIndex] else null,
                    onWatchNowClick = { contentId -> onMovieClick(contentId) },
                    onMyListClick = { /* TODO: Add to watchlist */ }
                )
            }

            // Continue Watching Section
            if (uiState.continueWatching.isNotEmpty()) {
                item {
                    ContinueWatchingSection(
                        items = uiState.continueWatching,
                        onItemClick = { onMovieClick(it) }
                    )
                }
            }

            // Dynamic Sections from Backend
            itemsIndexed(uiState.homeSections) { index, section ->
                MovieSectionWithTitle(
                    section = section,
                    onMovieClick = onMovieClick,
                    sectionTitle = when (index) {
                        0 -> "Trending Now"
                        1 -> "Bollywood"
                        2 -> "Web Series"
                        else -> section.title
                    }
                )
            }

            item {
                Spacer(modifier = Modifier.height(80.dp))
            }
        }

        // Loading Indicator
        if (uiState.isLoading && uiState.homeSections.isEmpty()) {
            CircularProgressIndicator(
                modifier = Modifier.align(Alignment.Center),
                color = CineVaultTheme.colors.accentGold
            )
        }
    }
}

@Composable
fun TopNavigationBar(
    onSearchClick: () -> Unit,
    onProfileClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(CineVaultTheme.colors.background)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Left side - empty or logo (can add app name here if needed)
        Text(
            "CINEMAX",
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = CineVaultTheme.colors.accentGold
        )

        // Right side - Search, Notifications, Profile
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onSearchClick,
                modifier = Modifier.size(40.dp)
            ) {
                Icon(
                    Icons.Default.Search,
                    contentDescription = "Search",
                    tint = CineVaultTheme.colors.textPrimary,
                    modifier = Modifier.size(24.dp)
                )
            }

            IconButton(
                onClick = { /* TODO: Show notifications */ },
                modifier = Modifier.size(40.dp)
            ) {
                Icon(
                    Icons.Default.Notifications,
                    contentDescription = "Notifications",
                    tint = CineVaultTheme.colors.textPrimary,
                    modifier = Modifier.size(24.dp)
                )
            }

            IconButton(
                onClick = onProfileClick,
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(CineVaultTheme.colors.accentGold)
            ) {
                Icon(
                    Icons.Default.Person,
                    contentDescription = "Profile",
                    tint = CineVaultTheme.colors.background,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

@Composable
fun RectangularHeroBanner(
    banner: com.cinevault.app.data.model.BannerDto?,
    onWatchNowClick: (String) -> Unit,
    onMyListClick: () -> Unit,
) {
    if (banner == null) return

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(280.dp)
            .background(CineVaultTheme.colors.surface)
    ) {
        // Background image
        AsyncImage(
            model = banner.imageUrl,
            contentDescription = banner.title,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )

        // Gradient overlay (darker at bottom and left side)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color.Black.copy(alpha = 0.2f),
                            Color.Black.copy(alpha = 0.5f),
                            Color.Black.copy(alpha = 0.8f)
                        ),
                        startY = 100f,
                        endY = Float.POSITIVE_INFINITY
                    )
                )
        )

        // Content at bottom left
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
                .padding(24.dp),
            verticalArrangement = Arrangement.Bottom
        ) {
            // Movie title
            Text(
                banner.title ?: "Featured",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = CineVaultTheme.colors.textPrimary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            // Movie metadata (Duration, Year, Rating)
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    "26 Jan",
                    fontSize = 12.sp,
                    color = CineVaultTheme.colors.textSecondary
                )

                Text(
                    "2024",
                    fontSize = 12.sp,
                    color = CineVaultTheme.colors.textSecondary
                )

                // IMDB Rating
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .background(
                            Color(0xFFFFD700).copy(alpha = 0.15f),
                            RoundedCornerShape(4.dp)
                        )
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Icon(
                        Icons.Default.Star,
                        contentDescription = "Rating",
                        tint = Color(0xFFFFD700),
                        modifier = Modifier.size(12.dp)
                    )
                    Text(
                        "8.4",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = CineVaultTheme.colors.textPrimary,
                        modifier = Modifier.padding(start = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Action buttons row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // WATCH NOW button (smaller)
                Button(
                    onClick = { 
                        val movieId = banner.contentId?.toString() ?: banner.id
                        onWatchNowClick(movieId)
                    },
                    modifier = Modifier
                        .height(40.dp)
                        .wrapContentWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = CineVaultTheme.colors.accentGold
                    ),
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp)
                ) {
                    Icon(
                        Icons.Default.PlayArrow,
                        contentDescription = "Play",
                        tint = CineVaultTheme.colors.background,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        "WATCH NOW",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = CineVaultTheme.colors.background,
                        modifier = Modifier.padding(start = 4.dp)
                    )
                }

                // MY LIST button
                OutlinedButton(
                    onClick = onMyListClick,
                    modifier = Modifier
                        .height(40.dp)
                        .wrapContentWidth(),
                    border = BorderStroke(1.5.dp, CineVaultTheme.colors.accentGold),
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp)
                ) {
                    Icon(
                        Icons.Default.Add,
                        contentDescription = "Add to List",
                        tint = CineVaultTheme.colors.accentGold,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        "MY LIST",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = CineVaultTheme.colors.accentGold,
                        modifier = Modifier.padding(start = 4.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun ContinueWatchingSection(
    items: List<WatchProgressDto>,
    onItemClick: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "CONTINUE WATCHING",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = CineVaultTheme.colors.textPrimary,
                letterSpacing = 1.sp
            )
            
            Text(
                text = "See All",
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = CineVaultTheme.colors.accentGold
            )
        }

        LazyRow(
            contentPadding = PaddingValues(horizontal = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(items.size) { index ->
                val progress = items[index]
                ContinueWatchingCard(
                    progress = progress,
                    onClick = { onItemClick(progress.contentId ?: "") }
                )
            }
        }
    }
}

@Composable
fun ContinueWatchingCard(
    progress: WatchProgressDto,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .width(180.dp)
            .clickable(onClick = onClick)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(105.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(CineVaultTheme.colors.surface)
        ) {
            AsyncImage(
                model = progress.thumbnailUrl,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )

            // Progress bar at bottom
            val fraction = if (progress.duration > 0) progress.position.toFloat() / progress.duration else 0f
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .background(CineVaultTheme.colors.surface.copy(alpha = 0.5f))
                    .align(Alignment.BottomCenter)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(fraction)
                        .background(CineVaultTheme.colors.accentGold)
                )
            }
        }
    }
}

@Composable
fun MovieSectionWithTitle(
    section: HomeSectionDto,
    onMovieClick: (String) -> Unit,
    sectionTitle: String,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = sectionTitle,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = CineVaultTheme.colors.textPrimary,
                letterSpacing = 1.sp
            )
            
            Text(
                text = "See All",
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = CineVaultTheme.colors.accentGold
            )
        }

        LazyRow(
            contentPadding = PaddingValues(horizontal = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(section.items.size) { index ->
                val movie = section.items[index]
                MovieCardItem(
                    movie = movie,
                    onClick = { onMovieClick(movie.id) }
                )
            }
        }
    }
}

@Composable
fun MovieCardItem(
    movie: MovieDto,
    onClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .width(120.dp)
            .clickable(onClick = onClick)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(CineVaultTheme.colors.surface)
        ) {
            AsyncImage(
                model = movie.posterUrl ?: movie.bannerUrl,
                contentDescription = movie.title,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )

            // Rating badge on top right
            if (movie.rating != null) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                        .background(
                            CineVaultTheme.colors.ratingGold.copy(alpha = 0.9f),
                            shape = RoundedCornerShape(4.dp)
                        )
                        .padding(4.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 4.dp)
                    ) {
                        Icon(
                            Icons.Default.Star,
                            contentDescription = "Rating",
                            tint = Color.Black,
                            modifier = Modifier.size(12.dp)
                        )
                        Text(
                            String.format("%.1f", movie.rating),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.Black,
                            modifier = Modifier.padding(start = 2.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            movie.title,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = CineVaultTheme.colors.textPrimary,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
    }
}
