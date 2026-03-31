package com.cinevault.app.ui.screen

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.*
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.cinevault.app.data.model.BannerDto
import com.cinevault.app.data.model.HomeSectionDto
import com.cinevault.app.data.model.MovieDto
import com.cinevault.app.ui.components.ContinueWatchingCard
import com.cinevault.app.ui.components.TrendingMovieCard
import com.cinevault.app.ui.theme.CineVaultTheme
import com.cinevault.app.ui.viewmodel.HomeViewModel
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.SwipeRefreshIndicator
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState
import kotlinx.coroutines.delay

@Composable
fun HomeScreen(
    onMovieClick: (String) -> Unit,
    onPlayClick: (String) -> Unit = onMovieClick,
    onSearchClick: () -> Unit,
    onNotificationsClick: () -> Unit = {},
    onSectionClick: ((HomeSectionDto) -> Unit)? = null,
    onAddToWatchlist: ((String) -> Unit)? = null,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var currentBannerIndex by remember(uiState.selectedTab) { mutableIntStateOf(0) }
    val swipeRefreshState = rememberSwipeRefreshState(uiState.isRefreshing)

    // Auto-rotate banners
    LaunchedEffect(uiState.tabBanners.size, uiState.selectedTab) {
        while (true) {
            delay(3500)
            if (uiState.tabBanners.isNotEmpty()) {
                currentBannerIndex = (currentBannerIndex + 1) % uiState.tabBanners.size
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(CineVaultTheme.colors.background)
    ) {
        SwipeRefresh(
            state = swipeRefreshState,
            onRefresh = { viewModel.refresh() },
            indicator = { state, trigger ->
                SwipeRefreshIndicator(
                    state = state,
                    refreshTriggerDistance = trigger,
                    contentColor = CineVaultTheme.colors.accentGold,
                    backgroundColor = CineVaultTheme.colors.surface,
                )
            }
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize()
            ) {
                // ── Search Bar + Bell icon side by side ──
                item {
                    SearchBarWithBell(
                        onSearchClick = onSearchClick,
                        onNotificationsClick = onNotificationsClick,
                        movieTitles = uiState.homeSections
                            .flatMap { it.items }
                            .map { it.title }
                            .distinct()
                            .take(8)
                    )
                }

                // ── Top Navigation Tabs: Home / Shows / Movies / Anime ──
                item {
                    TopNavTabs(
                        selectedTab = uiState.selectedTab,
                        onTabSelected = { viewModel.selectTab(it) }
                    )
                }

                // ── Banner ──
                item {
                    SquareHeroBanner(
                        banner = if (uiState.tabBanners.isNotEmpty()) uiState.tabBanners[currentBannerIndex.coerceIn(0, (uiState.tabBanners.size - 1).coerceAtLeast(0))] else null,
                        onBannerClick = { contentId -> onMovieClick(contentId) },
                        onPlayClick = { contentId -> onPlayClick(contentId) },
                        onAddToWatchlist = { contentId -> onAddToWatchlist?.invoke(contentId) },
                        bannerCount = uiState.tabBanners.size,
                        currentIndex = currentBannerIndex.coerceIn(0, (uiState.tabBanners.size - 1).coerceAtLeast(0)),
                    )
                }

                // ── Continue Watching Section ──
                if (uiState.continueWatching.isNotEmpty()) {
                    item {
                        PremiumSectionHeader(
                            title = "Continue Watching",
                            onArrowClick = null,
                        )
                    }
                    item {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 20.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            items(uiState.continueWatching) { item ->
                                ContinueWatchingCard(
                                    item = item,
                                    onClick = { onPlayClick(item.contentId) },
                                    onRemove = { viewModel.removeContinueWatching(item) },
                                )
                            }
                        }
                    }
                }

                // ── Content based on selected tab ──
                if (uiState.isTabLoading) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(200.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(
                                color = CineVaultTheme.colors.accentGold,
                                strokeWidth = 3.dp
                            )
                        }
                    }
                } else {
                    val sectionsToShow = if (uiState.selectedTab == 0) uiState.homeSections else uiState.tabSections

                    if (sectionsToShow.isEmpty() && uiState.tabBanners.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(200.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    "No content available",
                                    color = CineVaultTheme.colors.textSecondary,
                                    fontSize = 16.sp
                                )
                            }
                        }
                    } else {
                        itemsIndexed(sectionsToShow) { _, section ->
                            Column {
                                PremiumSectionHeader(
                                    title = section.title,
                                    onArrowClick = if (section.showViewMore) {
                                        { onSectionClick?.invoke(section) }
                                    } else null
                                )
                                if (section.type == "trending") {
                                    LazyRow(
                                        contentPadding = PaddingValues(horizontal = 20.dp),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        itemsIndexed(section.items.take(10)) { index, movie ->
                                            TrendingMovieCard(
                                                movie = movie,
                                                rank = index + 1,
                                                onClick = onMovieClick,
                                            )
                                        }
                                    }
                                } else {
                                    HorizontalMovieRow(
                                        movies = section.items,
                                        onMovieClick = onMovieClick
                                    )
                                }
                            }
                        }
                    }
                }

                // Bottom spacer for nav bar
                item {
                    Spacer(modifier = Modifier.height(90.dp))
                }
            }
        }

        // Loading
        if (uiState.isLoading && uiState.homeSections.isEmpty()) {
            CircularProgressIndicator(
                modifier = Modifier.align(Alignment.Center),
                color = CineVaultTheme.colors.accentGold,
                strokeWidth = 3.dp
            )
        }

        // Error State
        if (!uiState.isLoading && uiState.homeSections.isEmpty() && uiState.tabSections.isEmpty() && uiState.error != null) {
            Column(
                modifier = Modifier
                    .align(Alignment.Center)
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Connection Failed",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = CineVaultTheme.colors.textPrimary
                )
                Text(
                    text = "Unable to connect to server.\nPlease check your network and try again.",
                    fontSize = 14.sp,
                    color = CineVaultTheme.colors.textSecondary,
                    textAlign = TextAlign.Center
                )
                Button(
                    onClick = { viewModel.refresh() },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = CineVaultTheme.colors.accentGold
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Retry", color = CineVaultTheme.colors.background)
                }
            }
        }
        // ── Floating Continue Watching Popup ──
        val lastWatched = uiState.continueWatching.firstOrNull()
        if (uiState.showContinuePopup && lastWatched != null) {
            var popupVisible by remember { mutableStateOf(true) }

            // Auto-hide after 10 seconds
            LaunchedEffect(Unit) {
                delay(10000)
                popupVisible = false
                viewModel.dismissContinuePopup()
            }

            AnimatedVisibility(
                visible = popupVisible,
                modifier = Modifier
                    .align(Alignment.BottomCenter),
                enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            ) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(16.dp),
                    color = CineVaultTheme.colors.surfaceElevated,
                    shadowElevation = 12.dp,
                    tonalElevation = 4.dp,
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        // Thumbnail
                        Box(
                            modifier = Modifier
                                .size(52.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(CineVaultTheme.colors.surface)
                        ) {
                            AsyncImage(
                                model = lastWatched.thumbnailUrl,
                                contentDescription = lastWatched.contentTitle,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop,
                            )
                        }

                        Spacer(Modifier.width(12.dp))

                        // Title
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Continue Watching",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium,
                                color = CineVaultTheme.colors.textSecondary,
                            )
                            Text(
                                lastWatched.contentTitle ?: "Unknown",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = CineVaultTheme.colors.textPrimary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }

                        Spacer(Modifier.width(8.dp))

                        // Continue button
                        Button(
                            onClick = { onPlayClick(lastWatched.contentId) },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = CineVaultTheme.colors.accentGold,
                            ),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                        ) {
                            Text(
                                "Continue \u25B6",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = CineVaultTheme.colors.background,
                            )
                        }

                        Spacer(Modifier.width(4.dp))

                        // X dismiss button
                        IconButton(
                            onClick = {
                                popupVisible = false
                                viewModel.dismissContinuePopup()
                            },
                            modifier = Modifier.size(28.dp),
                        ) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Dismiss",
                                tint = CineVaultTheme.colors.textSecondary,
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// SEARCH BAR + BELL ICON (side by side)
// ═══════════════════════════════════════════════════════════════

@Composable
fun SearchBarWithBell(
    onSearchClick: () -> Unit,
    onNotificationsClick: () -> Unit,
    movieTitles: List<String>,
) {
    val placeholders = if (movieTitles.isNotEmpty()) movieTitles
    else listOf("Search movies, shows...", "Action movies", "Thriller series", "Comedy")

    var currentPlaceholderIndex by remember { mutableIntStateOf(0) }
    val infiniteTransition = rememberInfiniteTransition(label = "search")
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = keyframes {
                durationMillis = 3000
                0f at 0
                1f at 500
                1f at 2500
                0f at 3000
            },
            repeatMode = RepeatMode.Restart
        ),
        label = "searchAlpha"
    )

    LaunchedEffect(placeholders.size) {
        currentPlaceholderIndex = 0
        while (true) {
            delay(3000)
            if (placeholders.size > 1) {
                currentPlaceholderIndex = (currentPlaceholderIndex + 1) % placeholders.size
            }
        }
    }

    val safeIndex = currentPlaceholderIndex.coerceIn(0, (placeholders.size - 1).coerceAtLeast(0))

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Search bar (takes remaining space)
        Box(
            modifier = Modifier
                .weight(1f)
                .height(44.dp)
                .clip(RoundedCornerShape(22.dp))
                .background(CineVaultTheme.colors.surface)
                .border(
                    width = 1.dp,
                    color = CineVaultTheme.colors.borderSubtle,
                    shape = RoundedCornerShape(22.dp)
                )
                .clickable(onClick = onSearchClick),
            contentAlignment = Alignment.CenterStart
        ) {
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(
                    Icons.Default.Search,
                    contentDescription = "Search",
                    tint = CineVaultTheme.colors.textMuted,
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    text = placeholders[safeIndex],
                    color = CineVaultTheme.colors.textMuted.copy(alpha = alpha),
                    fontSize = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        // Bell icon
        Surface(
            modifier = Modifier.size(44.dp),
            shape = CircleShape,
            color = CineVaultTheme.colors.surface,
            onClick = onNotificationsClick,
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    Icons.Default.Notifications,
                    contentDescription = "Notifications",
                    tint = CineVaultTheme.colors.textPrimary,
                    modifier = Modifier.size(22.dp)
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// TOP NAVIGATION TABS - Home / Shows / Movies / Anime
// ═══════════════════════════════════════════════════════════════

@Composable
fun TopNavTabs(
    selectedTab: Int,
    onTabSelected: (Int) -> Unit,
) {
    val tabs = listOf("Home", "Shows", "Movie", "Anime")

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(bottom = 4.dp),
        horizontalArrangement = Arrangement.Center,
    ) {
        tabs.forEachIndexed { index, title ->
            val isSelected = index == selectedTab
            val animatedScale by animateFloatAsState(
                targetValue = if (isSelected) 1.18f else 1f,
                animationSpec = spring(dampingRatio = 0.6f, stiffness = 300f),
                label = "tabScale$index"
            )
            val animatedAlpha by animateFloatAsState(
                targetValue = if (isSelected) 1f else 0.6f,
                animationSpec = tween(250),
                label = "tabAlpha$index"
            )
            val underlineWidth by animateDpAsState(
                targetValue = if (isSelected) 28.dp else 0.dp,
                animationSpec = spring(dampingRatio = 0.7f, stiffness = 400f),
                label = "underline$index"
            )

            Column(
                modifier = Modifier
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) { onTabSelected(index) }
                    .padding(horizontal = 14.dp, vertical = 6.dp)
                    .graphicsLayer {
                        scaleX = animatedScale
                        scaleY = animatedScale
                    },
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = title,
                    fontSize = 22.sp,
                    fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.Medium,
                    color = if (isSelected) CineVaultTheme.colors.textPrimary.copy(alpha = animatedAlpha)
                    else CineVaultTheme.colors.textSecondary.copy(alpha = animatedAlpha),
                )
                Spacer(modifier = Modifier.height(4.dp))
                Box(
                    modifier = Modifier
                        .width(underlineWidth)
                        .height(2.5.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(
                            if (isSelected) CineVaultTheme.colors.accentGold
                            else Color.Transparent
                        )
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// HERO BANNER - cinematic style with title, info & action buttons
// ═══════════════════════════════════════════════════════════════

@Composable
fun SquareHeroBanner(
    banner: BannerDto?,
    onBannerClick: (String) -> Unit,
    onPlayClick: (String) -> Unit,
    onAddToWatchlist: (String) -> Unit,
    bannerCount: Int,
    currentIndex: Int,
) {
    if (banner == null) return

    val movieId = banner.contentIdString ?: banner.id

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp)
    ) {
        // Banner container — wider aspect ratio for cinematic feel
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(0.75f)
                .background(CineVaultTheme.colors.surface)
                .clickable { onBannerClick(movieId) },
        ) {
            // Banner image
            AsyncImage(
                model = banner.imageUrl,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )

            // Top fade
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp)
                    .align(Alignment.TopCenter)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                CineVaultTheme.colors.background,
                                CineVaultTheme.colors.background.copy(alpha = 0.3f),
                                Color.Transparent,
                            )
                        )
                    )
            )

            // Bottom gradient — taller for text readability
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.50f)
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                CineVaultTheme.colors.background.copy(alpha = 0.6f),
                                CineVaultTheme.colors.background.copy(alpha = 0.9f),
                                CineVaultTheme.colors.background,
                            )
                        )
                    )
            )

            // Left fade
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .width(40.dp)
                    .align(Alignment.CenterStart)
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(
                                CineVaultTheme.colors.background.copy(alpha = 0.6f),
                                Color.Transparent,
                            )
                        )
                    )
            )

            // Right fade
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .width(40.dp)
                    .align(Alignment.CenterEnd)
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(
                                Color.Transparent,
                                CineVaultTheme.colors.background.copy(alpha = 0.6f),
                            )
                        )
                    )
            )

            // ── Bottom content: Title + Info + Buttons ──
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 32.dp),
            ) {
                // Title — always show as text
                if (banner.title != null) {
                    Text(
                        text = banner.title.uppercase(),
                        fontSize = 26.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.White,
                        letterSpacing = 1.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                }

                // Movie info line: ⭐ 8.5 · 2020 · TV SERIES
                val infoParts = mutableListOf<String>()
                banner.starRating?.let { infoParts.add("%.1f".format(it)) }
                banner.releaseYear?.let { infoParts.add(it.toString()) }
                banner.contentType?.let {
                    infoParts.add(it.replace("_", " ").uppercase())
                }
                banner.contentRating?.let { infoParts.add(it) }
                if (infoParts.isNotEmpty()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Filled.Star,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = CineVaultTheme.colors.accentGold,
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = infoParts.joinToString("  •  "),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color.White.copy(alpha = 0.85f),
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                }

                // Subtitle / tagline
                val infoText = banner.subtitle ?: banner.tagline
                if (infoText != null) {
                    Text(
                        text = infoText,
                        fontSize = 13.sp,
                        color = Color.White.copy(alpha = 0.85f),
                        lineHeight = 18.sp,
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                }

                // Genre tags
                if (!banner.genreTags.isNullOrEmpty()) {
                    Text(
                        text = banner.genreTags.joinToString("  •  "),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = CineVaultTheme.colors.accentGold.copy(alpha = 0.9f),
                        letterSpacing = 0.8.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                } else {
                    Spacer(modifier = Modifier.height(10.dp))
                }

                // ── Action buttons ──
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    // Play button
                    Button(
                        onClick = { onPlayClick(movieId) },
                        modifier = Modifier.height(42.dp),
                        shape = RoundedCornerShape(6.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color.White,
                        ),
                        contentPadding = PaddingValues(horizontal = 20.dp),
                    ) {
                        Icon(
                            Icons.Filled.PlayArrow,
                            contentDescription = "Play",
                            modifier = Modifier.size(22.dp),
                            tint = Color.Black,
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            "Play",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.Black,
                        )
                    }

                    // My List button
                    OutlinedButton(
                        onClick = { onAddToWatchlist(movieId) },
                        modifier = Modifier.height(42.dp),
                        shape = RoundedCornerShape(6.dp),
                        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.6f)),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = Color.White.copy(alpha = 0.1f),
                        ),
                        contentPadding = PaddingValues(horizontal = 16.dp),
                    ) {
                        Icon(
                            Icons.Filled.Add,
                            contentDescription = "My List",
                            modifier = Modifier.size(20.dp),
                            tint = Color.White,
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            "My List",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White,
                        )
                    }
                }
            }

            // ── Page indicator dots ──
            if (bannerCount > 1) {
                Row(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    repeat(bannerCount.coerceAtMost(5)) { index ->
                        Box(
                            modifier = Modifier
                                .size(if (index == currentIndex) 8.dp else 6.dp)
                                .clip(CircleShape)
                                .background(
                                    if (index == currentIndex) CineVaultTheme.colors.accentGold
                                    else CineVaultTheme.colors.textMuted.copy(alpha = 0.4f)
                                )
                        )
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// FILTERED CONTENT GRID - for Shows/Movies/Anime tabs
// ═══════════════════════════════════════════════════════════════

@Composable
fun FilteredContentGrid(
    movies: List<MovieDto>,
    onMovieClick: (String) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(top = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        movies.chunked(3).forEach { rowMovies ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                rowMovies.forEach { movie ->
                    Box(modifier = Modifier.weight(1f)) {
                        PremiumMovieCard(
                            movie = movie,
                            onClick = { onMovieClick(movie.id) },
                        )
                    }
                }
                // Fill empty slots
                repeat(3 - rowMovies.size) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// PREMIUM SECTION HEADER - with underline & arrow
// ═══════════════════════════════════════════════════════════════

@Composable
fun PremiumSectionHeader(
    title: String,
    onArrowClick: (() -> Unit)?,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .padding(top = 20.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Title with underline
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = CineVaultTheme.colors.textPrimary,
                letterSpacing = 0.5.sp,
            )
            Spacer(modifier = Modifier.height(4.dp))
            // Accent underline
            Box(
                modifier = Modifier
                    .width(36.dp)
                    .height(3.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(CineVaultTheme.colors.accentGold)
            )
        }

        // Arrow button
        if (onArrowClick != null) {
            Surface(
                modifier = Modifier.size(30.dp),
                shape = CircleShape,
                color = CineVaultTheme.colors.surface,
                onClick = onArrowClick,
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.ChevronRight,
                        contentDescription = "View all",
                        tint = CineVaultTheme.colors.accentGold,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// HORIZONTAL MOVIE ROW
// ═══════════════════════════════════════════════════════════════

@Composable
fun HorizontalMovieRow(
    movies: List<MovieDto>,
    onMovieClick: (String) -> Unit,
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(movies) { movie ->
            PremiumMovieCard(
                movie = movie,
                onClick = { onMovieClick(movie.id) }
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// PREMIUM MOVIE CARD
// ═══════════════════════════════════════════════════════════════

@Composable
fun PremiumMovieCard(
    movie: MovieDto,
    onClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .width(130.dp)
            .clickable(onClick = onClick)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(10.dp))
                .background(CineVaultTheme.colors.surface)
        ) {
            AsyncImage(
                model = movie.posterUrl ?: movie.bannerUrl,
                contentDescription = movie.title,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )

            // Bottom gradient
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(60.dp)
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.7f),
                            )
                        )
                    )
            )

            // Language label — top-right
            val langLabel = movie.languageLabel
            if (!langLabel.isNullOrBlank()) {
                Surface(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp),
                    shape = RoundedCornerShape(4.dp),
                    color = Color.White.copy(alpha = 0.15f),
                ) {
                    Text(
                        langLabel,
                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                        fontSize = 7.sp,
                        fontWeight = FontWeight.Medium,
                        fontStyle = FontStyle.Italic,
                        color = Color.White.copy(alpha = 0.85f),
                        letterSpacing = 0.3.sp,
                    )
                }
            }

            // Content rating badge — top-left, white faded
            if (!movie.contentRating.isNullOrEmpty()) {
                Surface(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(6.dp),
                    shape = RoundedCornerShape(4.dp),
                    color = Color.White.copy(alpha = 0.2f),
                ) {
                    Text(
                        movie.contentRating!!,
                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                        fontSize = 8.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White.copy(alpha = 0.9f),
                    )
                }
            }

            // Video quality — bottom-left
            if (!movie.videoQuality.isNullOrBlank()) {
                Surface(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(6.dp),
                    shape = RoundedCornerShape(4.dp),
                    color = Color.White.copy(alpha = 0.2f),
                ) {
                    Text(
                        movie.videoQuality!!,
                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                        fontSize = 8.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White.copy(alpha = 0.9f),
                    )
                }
            }

            // Star rating — bottom-right
            val displayRating = movie.starRating ?: movie.rating
            if (displayRating != null && displayRating > 0) {
                Surface(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(6.dp),
                    shape = RoundedCornerShape(4.dp),
                    color = CineVaultTheme.colors.background.copy(alpha = 0.85f),
                ) {
                    Text(
                        String.format("%.1f", displayRating),
                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 3.dp),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = CineVaultTheme.colors.ratingGold,
                    )
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(
            movie.title,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = CineVaultTheme.colors.textPrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
