package com.cinevault.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.cinevault.app.data.model.BannerDto
import com.cinevault.app.data.model.HomeSectionDto
import com.cinevault.app.data.model.MovieDto
import com.cinevault.app.data.model.WatchProgressDto
import com.cinevault.app.ui.theme.CineVaultTheme

@Composable
fun MovieCard(
    movie: MovieDto,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    width: Dp = 130.dp,
) {
    Column(
        modifier = modifier
            .width(width)
            .clickable(onClick = onClick),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(8.dp))
                .background(CineVaultTheme.colors.surface),
        ) {
            AsyncImage(
                model = movie.posterUrl,
                contentDescription = movie.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )

            // Bottom gradient
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
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
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                        style = CineVaultTheme.typography.labelSmall.copy(
                            shadow = Shadow(color = Color.Black, blurRadius = 3f)
                        ),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        letterSpacing = 0.3.sp,
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
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                        style = CineVaultTheme.typography.labelSmall,
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
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                        style = CineVaultTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = CineVaultTheme.colors.ratingGold,
                    )
                }
            }
        }
        Spacer(Modifier.height(6.dp))
        Text(
            movie.title,
            style = CineVaultTheme.typography.bodySmall,
            color = CineVaultTheme.colors.textPrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
fun GoldButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false,
    enabled: Boolean = true,
) {
    Button(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp),
        enabled = enabled && !isLoading,
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = CineVaultTheme.colors.accentGold,
            contentColor = CineVaultTheme.colors.background,
            disabledContainerColor = CineVaultTheme.colors.accentGold.copy(alpha = 0.4f),
        ),
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(22.dp),
                color = CineVaultTheme.colors.background,
                strokeWidth = 2.dp,
            )
        } else {
            Text(text, style = CineVaultTheme.typography.button)
        }
    }
}

@Composable
fun PlayButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    text: String = "Play",
) {
    Button(
        onClick = onClick,
        modifier = modifier.height(44.dp),
        shape = RoundedCornerShape(8.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = CineVaultTheme.colors.accentGold,
            contentColor = CineVaultTheme.colors.background,
        ),
    ) {
        Icon(Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(6.dp))
        Text(text, style = CineVaultTheme.typography.button)
    }
}

@Composable
fun GenreChip(
    label: String,
    selected: Boolean = false,
    onClick: () -> Unit = {},
) {
    Surface(
        modifier = Modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        color = if (selected) CineVaultTheme.colors.accentGold else CineVaultTheme.colors.surface,
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
            style = CineVaultTheme.typography.label,
            color = if (selected) CineVaultTheme.colors.background else CineVaultTheme.colors.textSecondary,
        )
    }
}

@Composable
fun ShimmerBox(
    modifier: Modifier = Modifier,
    shape: RoundedCornerShape = RoundedCornerShape(8.dp),
) {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnim = transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "shimmer_translate",
    )
    val brush = Brush.linearGradient(
        colors = listOf(
            CineVaultTheme.colors.surface,
            CineVaultTheme.colors.surface.copy(alpha = 0.5f),
            CineVaultTheme.colors.surface,
        ),
        start = Offset(translateAnim.value - 500f, 0f),
        end = Offset(translateAnim.value, 0f),
    )
    Box(
        modifier = modifier
            .clip(shape)
            .background(brush),
    )
}

@Composable
fun ShimmerMovieCard(modifier: Modifier = Modifier, width: Dp = 130.dp) {
    Column(modifier = modifier.width(width)) {
        ShimmerBox(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f),
        )
        Spacer(Modifier.height(6.dp))
        ShimmerBox(modifier = Modifier.fillMaxWidth().height(14.dp))
        Spacer(Modifier.height(4.dp))
        ShimmerBox(modifier = Modifier.width(50.dp).height(10.dp))
    }
}

@Composable
fun ErrorScreen(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            message,
            style = CineVaultTheme.typography.body,
            color = CineVaultTheme.colors.textSecondary,
        )
        Spacer(Modifier.height(16.dp))
        GoldButton(text = "Retry", onClick = onRetry, modifier = Modifier.width(160.dp))
    }
}


@Composable
fun SectionHeader(
    title: String,
    modifier: Modifier = Modifier,
    onSeeAll: (() -> Unit)? = null,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            title,
            style = CineVaultTheme.typography.sectionTitle,
            color = CineVaultTheme.colors.textPrimary,
        )
        if (onSeeAll != null) {
            IconButton(onClick = onSeeAll, modifier = Modifier.size(24.dp)) {
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = "View more",
                    tint = CineVaultTheme.colors.textSecondary
                )
            }
        }
    }
}

@Composable
fun HorizontalMovieSection(
    section: HomeSectionDto,
    onMovieClick: (String) -> Unit,
    onSeeMore: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        // Section Header
        SectionHeader(
            title = section.title,
            onSeeAll = onSeeMore
        )
        
        when (section.type) {
            "trending" -> {
                // Trending section with numbered cards
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp)
                ) {
                    itemsIndexed(section.items.take(10)) { index, movie ->
                        TrendingMovieCard(
                            movie = movie,
                            rank = index + 1,
                            onClick = { onMovieClick(movie.id) }
                        )
                    }
                }
            }
            "mid_banner" -> {
                // Mid-page banner section
                if (section.bannerImageUrl != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                            .aspectRatio(1f)
                            .clip(RoundedCornerShape(16.dp))
                            .background(CineVaultTheme.colors.surface)
                            .clickable { section.items.firstOrNull()?.let { onMovieClick(it.id) } }
                    ) {
                        AsyncImage(
                            model = section.bannerImageUrl,
                            contentDescription = section.title,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    }
                }
            }
            "large_card" -> {
                // Large card horizontal section
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp)
                ) {
                    items(section.items) { movie ->
                        LargeMovieCard(
                            movie = movie,
                            onClick = { onMovieClick(movie.id) }
                        )
                    }
                }
            }
            else -> {
                // Standard horizontal section with square cards
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp)
                ) {
                    items(section.items) { movie ->
                        SquareMovieCard(
                            movie = movie,
                            onClick = { onMovieClick(movie.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun SquareMovieCard(
    movie: MovieDto,
    onClick: (String) -> Unit,
    modifier: Modifier = Modifier,
    cardWidth: Dp = 130.dp,
) {
    Column(
        modifier = modifier
            .width(cardWidth)
            .clickable { onClick(movie.id) }
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .clip(RoundedCornerShape(8.dp))
                .background(CineVaultTheme.colors.surface)
        ) {
            AsyncImage(
                model = movie.posterUrl,
                contentDescription = movie.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
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
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                        style = CineVaultTheme.typography.labelSmall.copy(
                            shadow = Shadow(color = Color.Black, blurRadius = 3f)
                        ),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        letterSpacing = 0.3.sp,
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
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                        style = CineVaultTheme.typography.labelSmall,
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
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                        style = CineVaultTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = CineVaultTheme.colors.ratingGold,
                    )
                }
            }
        }
        
        Spacer(Modifier.height(6.dp))
        Text(
            movie.title,
            style = CineVaultTheme.typography.bodySmall,
            color = CineVaultTheme.colors.textPrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
fun LargeMovieCard(
    movie: MovieDto,
    onClick: (String) -> Unit,
    modifier: Modifier = Modifier,
    cardWidth: Dp = 180.dp,
) {
    Column(
        modifier = modifier
            .width(cardWidth)
            .clickable { onClick(movie.id) }
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(12.dp))
                .background(CineVaultTheme.colors.surface)
        ) {
            AsyncImage(
                model = movie.posterUrl,
                contentDescription = movie.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
            
            // Overlay gradient
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, CineVaultTheme.colors.background.copy(alpha = 0.8f)),
                            startY = 100f
                        )
                    )
            )

            // Language label — top-right
            val langLabel = movie.languageLabel
            if (!langLabel.isNullOrBlank()) {
                Surface(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp),
                    shape = RoundedCornerShape(4.dp),
                    color = Color.White.copy(alpha = 0.15f),
                ) {
                    Text(
                        langLabel,
                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                        style = CineVaultTheme.typography.labelSmall.copy(
                            shadow = Shadow(color = Color.Black, blurRadius = 3f)
                        ),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        letterSpacing = 0.3.sp,
                    )
                }
            }

            // Video quality — bottom-left
            if (!movie.videoQuality.isNullOrBlank()) {
                Surface(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(8.dp),
                    shape = RoundedCornerShape(6.dp),
                    color = Color.White.copy(alpha = 0.2f),
                ) {
                    Text(
                        movie.videoQuality!!,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                        style = CineVaultTheme.typography.labelSmall,
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
                        .padding(8.dp),
                    shape = RoundedCornerShape(6.dp),
                    color = CineVaultTheme.colors.background.copy(alpha = 0.85f),
                ) {
                    Text(
                        String.format("%.1f", displayRating),
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                        style = CineVaultTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = CineVaultTheme.colors.ratingGold,
                    )
                }
            }
        }
        
        Spacer(Modifier.height(8.dp))
        Text(
            movie.title,
            style = CineVaultTheme.typography.bodySmall,
            color = CineVaultTheme.colors.textPrimary,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
fun TrendingMovieCard(
    movie: MovieDto,
    rank: Int,
    onClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .width(135.dp)
            .clickable { onClick(movie.id) }
    ) {
        // Netflix-style: Large number on left, poster overlapping on right
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(175.dp)
        ) {
            // Large ranking number — outline stroke (behind poster)
            Text(
                text = rank.toString(),
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .offset(x = (-4).dp, y = 12.dp)
                    .graphicsLayer { rotationZ = 1f },
                style = TextStyle(
                    fontFamily = FontFamily.Serif,
                    fontSize = 100.sp,
                    fontWeight = FontWeight.Black,
                    fontStyle = FontStyle.Italic,
                    letterSpacing = (-6).sp,
                    drawStyle = Stroke(
                        width = 6f,
                        join = StrokeJoin.Round,
                    ),
                    color = CineVaultTheme.colors.accentGold,
                )
            )

            // Large ranking number — dark fill (behind poster)
            Text(
                text = rank.toString(),
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .offset(x = (-4).dp, y = 12.dp)
                    .graphicsLayer { rotationZ = 1f },
                style = TextStyle(
                    fontSize = 100.sp,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Black,
                    fontStyle = FontStyle.Italic,
                    letterSpacing = (-6).sp,
                    color = CineVaultTheme.colors.background,
                    shadow = Shadow(
                        color = CineVaultTheme.colors.accentGold.copy(alpha = 0.3f),
                        offset = Offset(2f, 2f),
                        blurRadius = 8f,
                    ),
                )
            )

            // Poster image (right side, overlapping number)
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .width(if (rank < 10) 100.dp else 95.dp)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(12.dp))
                    .background(CineVaultTheme.colors.surface)
            ) {
                AsyncImage(
                    model = movie.posterUrl,
                    contentDescription = movie.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )

                // Language badge — top-right
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
                            style = TextStyle(shadow = Shadow(color = Color.Black, blurRadius = 3f)),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            letterSpacing = 0.3.sp,
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(8.dp))

        // Title
        Text(
            movie.title,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = CineVaultTheme.colors.textPrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )

        // Watching count
        val watchCount = movie.viewCount ?: 0
        if (watchCount > 0) {
            Spacer(Modifier.height(2.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFE53935))
                )
                Spacer(Modifier.width(4.dp))
                Text(
                    text = "${formatWatchCount(watchCount)} Watching Now",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    color = CineVaultTheme.colors.textSecondary,
                )
            }
        }
    }
}

private fun formatWatchCount(count: Int): String {
    return when {
        count >= 1000 -> String.format("%.1fk", count / 1000.0)
        else -> count.toString()
    }
}

// ═══════════════════════════════════════════════════════════════
// CONTINUE WATCHING CARD
// ═══════════════════════════════════════════════════════════════

@Composable
fun ContinueWatchingCard(
    item: WatchProgressDto,
    onClick: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .width(170.dp)
            .clickable(onClick = onClick)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(16f / 9f)
                .clip(RoundedCornerShape(10.dp))
                .background(CineVaultTheme.colors.surface)
        ) {
            AsyncImage(
                model = item.thumbnailUrl,
                contentDescription = item.contentTitle,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )

            // Dark overlay
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.3f))
            )

            // Play icon overlay
            Surface(
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(38.dp),
                shape = CircleShape,
                color = CineVaultTheme.colors.accentGold.copy(alpha = 0.9f),
            ) {
                Icon(
                    Icons.Default.PlayArrow,
                    contentDescription = "Continue",
                    modifier = Modifier
                        .padding(6.dp),
                    tint = CineVaultTheme.colors.background,
                )
            }

            // X remove button top-right
            Surface(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(4.dp)
                    .size(24.dp),
                shape = CircleShape,
                color = Color.Black.copy(alpha = 0.6f),
                onClick = onRemove,
            ) {
                Icon(
                    Icons.Default.Close,
                    contentDescription = "Remove",
                    modifier = Modifier.padding(4.dp),
                    tint = Color.White,
                )
            }

            // Progress bar at bottom of thumbnail
            val progress = if (item.totalDuration > 0) item.currentTime.toFloat() / item.totalDuration else 0f
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .align(Alignment.BottomCenter),
                color = CineVaultTheme.colors.accentGold,
                trackColor = Color.White.copy(alpha = 0.2f),
            )
        }

        Spacer(Modifier.height(6.dp))

        Text(
            item.contentTitle ?: "Unknown",
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = CineVaultTheme.colors.textPrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )

        // Episode info if available
        if (!item.episodeTitle.isNullOrBlank()) {
            Text(
                item.episodeTitle!!,
                fontSize = 10.sp,
                color = CineVaultTheme.colors.textSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
fun BannerCarousel(
    banners: List<BannerDto>,
    onBannerClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    // Premium landscape banner with Play button
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(220.dp)
            .background(CineVaultTheme.colors.surface)
    ) {
        if (banners.isNotEmpty()) {
            val banner = banners[0]
            AsyncImage(
                model = banner.imageUrl,
                contentDescription = banner.title,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
            
            // Gradient overlay: transparent to dark
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, CineVaultTheme.colors.background),
                            startY = 100f
                        )
                    )
            )

            // Play Button centered
            IconButton(
                onClick = { 
                    banner.contentIdString?.let { contentId -> onBannerClick(contentId) }
                },
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(80.dp)
            ) {
                Surface(
                    modifier = Modifier
                        .size(70.dp),
                    shape = CircleShape,
                    color = CineVaultTheme.colors.accentGold.copy(alpha = 0.9f)
                ) {
                    Icon(
                        Icons.Filled.PlayArrow,
                        contentDescription = "Play",
                        modifier = Modifier
                            .align(Alignment.Center)
                            .size(40.dp),
                        tint = CineVaultTheme.colors.background
                    )
                }
            }
        } else {
            // Empty state
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(CineVaultTheme.colors.surface),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "No banners available",
                    color = CineVaultTheme.colors.textSecondary
                )
            }
        }
    }
}

@Composable
fun HomeTopBar(
    onSearchClick: () -> Unit,
    onProfileClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            "CineVault",
            style = CineVaultTheme.typography.displayLarge,
            color = CineVaultTheme.colors.accentGold,
        )
        Row {
            IconButton(onClick = onSearchClick) {
                Icon(
                    Icons.Default.Search,
                    contentDescription = "Search",
                    tint = CineVaultTheme.colors.textPrimary
                )
            }
            IconButton(onClick = onProfileClick) {
                Surface(
                    modifier = Modifier.size(32.dp),
                    shape = CircleShape,
                    color = CineVaultTheme.colors.surface
                ) {
                    // Avatar placeholder
                }
            }
        }
    }
}
