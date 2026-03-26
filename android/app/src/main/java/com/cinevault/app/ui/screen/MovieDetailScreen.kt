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

    // Show error if loading failed
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
        // Trailer Video Section
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(250.dp)
                .background(CineVaultTheme.colors.surface)
                .clip(RoundedCornerShape(12.dp))
                .padding(12.dp)
        ) {
            AsyncImage(
                model = movie.backdropUrl ?: movie.posterUrl,
                contentDescription = "Trailer",
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(8.dp))
            )

            // Gradient overlay
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Black.copy(alpha = 0.2f),
                                Color.Black.copy(alpha = 0.6f)
                            )
                        )
                    )
                    .clip(RoundedCornerShape(8.dp))
            )

            // Play button
            Icon(
                Icons.Default.PlayArrow,
                contentDescription = "Play",
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(80.dp),
                tint = CineVaultTheme.colors.accentGold
            )

            // Back button
            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(8.dp)
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
        }

        // Movie Info Section
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Ranking badge
            if (movie.rankingLabel != null || true) {
                Surface(
                    modifier = Modifier
                        .wrapContentWidth()
                        .clip(RoundedCornerShape(4.dp)),
                    color = CineVaultTheme.colors.accentGold
                ) {
                    Text(
                        "Thriller #3 in India Today",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.Black,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Movie Title
            Text(
                movie.title,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = CineVaultTheme.colors.textPrimary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Metadata badges row 1
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .wrapContentHeight(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Content rating
                MetadataBadge("UA")

                // Year
                MetadataBadge("2024")

                // Duration
                MetadataBadge("180 min")

                // Country
                MetadataBadge("USA")
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Metadata badges row 2
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .wrapContentHeight(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Genre tags
                MetadataBadge("Drama")
                MetadataBadge("History")
            }

            Spacer(modifier = Modifier.height(12.dp))

            // IMDB Rating
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Surface(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp)),
                    color = Color(0xFFFFD700)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                    ) {
                        Text(
                            "IMDB",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.Black
                        )
                        Text(
                            "  8.2",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.Black
                        )
                    }
                }

                Text(
                    "2.4M views",
                    fontSize = 12.sp,
                    color = CineVaultTheme.colors.textSecondary
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // WATCH NOW button - Cyan/Teal color
            Button(
                onClick = {
                    if (movie.id.isNotBlank()) {
                        onPlay(movie.id, null)
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF00BCD4) // Cyan color
                ),
                shape = RoundedCornerShape(6.dp),
                enabled = movie.id.isNotBlank()
            ) {
                Icon(
                    Icons.Default.PlayArrow,
                    contentDescription = "Play",
                    tint = Color.Black,
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    "WATCH NOW - FULL HD 1080P",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black,
                    modifier = Modifier.padding(start = 8.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MovieActionButton("MY LIST", Icons.Default.Add, Modifier.weight(1f))
                MovieActionButton("RATING", Icons.Default.Star, Modifier.weight(1f))
                MovieActionButton("SHARE", Icons.Default.Share, Modifier.weight(1f))
                MovieActionButton("DOWNLOAD", Icons.Default.Download, Modifier.weight(1f))
            }
        }

        Divider(
            color = CineVaultTheme.colors.borderSubtle,
            thickness = 1.dp,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        // Tabs
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
                        .padding(vertical = 16.dp),
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
                    if (selectedTab == index) {
                        Box(
                            modifier = Modifier
                                .height(2.dp)
                                .fillMaxWidth(0.8f)
                                .background(CineVaultTheme.colors.accentGold)
                                .padding(top = 8.dp)
                        )
                    }
                }
            }
        }

        Divider(
            color = CineVaultTheme.colors.borderSubtle,
            thickness = 1.dp
        )

        // Tab content
        when (selectedTab) {
            0 -> DetailsTabContent(movie)
            1 -> CommentsTabContent()
            2 -> TrailerTabContent()
        }

        Spacer(modifier = Modifier.height(40.dp))
    }
}

@Composable
fun MetadataBadge(
    text: String,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .wrapContentWidth()
            .clip(RoundedCornerShape(4.dp)),
        color = CineVaultTheme.colors.surface
    ) {
        Text(
            text,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = CineVaultTheme.colors.textSecondary,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}

@Composable
fun MovieActionButton(
    label: String,
    icon: ImageVector,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .background(
                CineVaultTheme.colors.surface,
                RoundedCornerShape(6.dp)
            )
            .clickable { }
            .padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            icon,
            contentDescription = label,
            tint = CineVaultTheme.colors.accentGold,
            modifier = Modifier.size(18.dp)
        )
        Text(
            label,
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            color = CineVaultTheme.colors.textSecondary,
            modifier = Modifier.padding(top = 4.dp),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
fun DetailsTabContent(movie: MovieDto) {
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
            items(movie.cast?.size ?: 5) { index ->
                val castMember = if (index < (movie.cast?.size ?: 0)) movie.cast!![index] else null
                CastCardWidget(castMember?.name ?: "Actor ${index + 1}")
            }
        }
    }
}

@Composable
fun CastCardWidget(name: String) {
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
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.Person,
                contentDescription = "Cast",
                tint = CineVaultTheme.colors.textSecondary,
                modifier = Modifier.size(35.dp)
            )
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
fun CommentsTabContent() {
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
fun TrailerTabContent() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(150.dp)
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            "Trailer available on watch",
            color = CineVaultTheme.colors.textSecondary,
            fontSize = 14.sp
        )
    }
}
