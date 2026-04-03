package com.cinevault.app.ui.screen

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.cinevault.app.R
import com.cinevault.app.data.model.MovieDto
import com.cinevault.app.ui.theme.CineVaultTheme
import com.cinevault.app.ui.viewmodel.FindUiState
import com.cinevault.app.ui.viewmodel.FindViewModel

// ═══════════════════════════════════════════════════════════════
// FIND SCREEN — Premium OTT Discover UI
// ═══════════════════════════════════════════════════════════════

private val platformLogoMap = mapOf(
    "Netflix" to R.drawable.ic_platform_netflix,
    "Disney+ Hotstar" to R.drawable.ic_platform_disney_hotstar,
    "ZEE5" to R.drawable.ic_platform_zee5,
    "Amazon Prime Video" to R.drawable.ic_platform_prime_video,
    "Crunchyroll" to R.drawable.ic_platform_crunchyroll,
    "MX Player" to R.drawable.ic_platform_mx_player,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FindScreen(
    onMovieClick: (String) -> Unit,
    onRankingClick: () -> Unit = {},
    viewModel: FindViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current
    val gridState = rememberLazyGridState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CineVaultTheme.colors.background),
    ) {
        // ── Search Bar ──
        FindSearchBar(
            query = uiState.query,
            onQueryChange = viewModel::onQueryChange,
            onSearch = {
                focusManager.clearFocus()
                viewModel.search()
            },
            onClear = viewModel::clearQuery,
        )

        // ── Autocomplete Overlay ──
        if (uiState.autocomplete.isNotEmpty() && uiState.query.isNotEmpty()) {
            AutocompleteOverlay(
                items = uiState.autocomplete,
                onSelect = { title ->
                    viewModel.selectAutocomplete(title)
                    focusManager.clearFocus()
                },
            )
        }

        // ── Filter Chips ──
        FilterChipsSection(uiState = uiState, viewModel = viewModel)

        // ── Loading ──
        if (uiState.isLoading && uiState.results.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = CineVaultTheme.colors.accentGold)
            }
        } else if (uiState.results.isNotEmpty()) {
            // ── Results Grid ──
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                state = gridState,
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                items(uiState.results, key = { it.id }) { movie ->
                    FindMovieCard(
                        movie = movie,
                        onClick = { onMovieClick(movie.id) },
                    )
                }
                if (uiState.hasMore) {
                    item(span = { GridItemSpan(3) }) {
                        LaunchedEffect(Unit) { viewModel.loadMore() }
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(16.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            CircularProgressIndicator(
                                color = CineVaultTheme.colors.accentGold,
                                modifier = Modifier.size(24.dp),
                                strokeWidth = 2.dp,
                            )
                        }
                    }
                }
            }
        } else if (uiState.hasSearched && !uiState.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    "No results found",
                    style = CineVaultTheme.typography.body,
                    color = CineVaultTheme.colors.textSecondary,
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// SEARCH BAR
// ═══════════════════════════════════════════════════════════════

@Composable
private fun FindSearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    onSearch: () -> Unit,
    onClear: () -> Unit,
) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        placeholder = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Search, contentDescription = null, tint = CineVaultTheme.colors.textMuted, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Search movies, series...", color = CineVaultTheme.colors.textMuted, fontSize = 14.sp)
            }
        },
        leadingIcon = if (query.isNotEmpty()) {
            { Icon(Icons.Filled.Search, contentDescription = null, tint = CineVaultTheme.colors.textSecondary) }
        } else null,
        trailingIcon = {
            if (query.isNotEmpty()) {
                IconButton(onClick = onClear) {
                    Icon(Icons.Filled.Close, contentDescription = "Clear", tint = CineVaultTheme.colors.textSecondary)
                }
            }
        },
        singleLine = true,
        shape = RoundedCornerShape(24.dp),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        keyboardActions = KeyboardActions(onSearch = { onSearch() }),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = Color(0xFF252525),
            unfocusedContainerColor = Color(0xFF252525),
            focusedBorderColor = CineVaultTheme.colors.accentGold.copy(alpha = 0.5f),
            unfocusedBorderColor = Color(0xFF3A3A3A).copy(alpha = 0.5f),
            cursorColor = CineVaultTheme.colors.accentGold,
            focusedTextColor = CineVaultTheme.colors.textPrimary,
            unfocusedTextColor = CineVaultTheme.colors.textPrimary,
        ),
        textStyle = CineVaultTheme.typography.body.copy(fontSize = 14.sp),
    )
}

// ═══════════════════════════════════════════════════════════════
// AUTOCOMPLETE OVERLAY
// ═══════════════════════════════════════════════════════════════

@Composable
private fun AutocompleteOverlay(
    items: List<com.cinevault.app.data.model.AutocompleteItem>,
    onSelect: (String) -> Unit,
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFF2A2A2A),
        tonalElevation = 8.dp,
        shadowElevation = 8.dp,
    ) {
        LazyColumn(modifier = Modifier.heightIn(max = 250.dp)) {
            items(items) { item ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelect(item.title) }
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Filled.Search, contentDescription = null, modifier = Modifier.size(16.dp), tint = CineVaultTheme.colors.textMuted)
                    Spacer(Modifier.width(12.dp))
                    Text(item.title, style = CineVaultTheme.typography.body, color = CineVaultTheme.colors.textPrimary)
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// FILTER CHIPS SECTION
// ═══════════════════════════════════════════════════════════════

@Composable
private fun FilterChipsSection(
    uiState: FindUiState,
    viewModel: FindViewModel,
) {
    Column {
        // ── Content Type Row ──
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 12.dp),
            modifier = Modifier.padding(bottom = 8.dp),
        ) {
            item {
                FindFilterChip(
                    label = "All Type",
                    selected = uiState.selectedContentType == null,
                    isGold = true,
                    onClick = { viewModel.setContentType(null) },
                )
            }
            item {
                FindFilterChip(
                    label = "Movies",
                    selected = uiState.selectedContentType == "movie",
                    icon = { Icon(Icons.Filled.Movie, contentDescription = null, modifier = Modifier.size(18.dp), tint = if (uiState.selectedContentType == "movie") Color.Black else CineVaultTheme.colors.textSecondary) },
                    onClick = { viewModel.setContentType("movie") },
                )
            }
            item {
                FindFilterChip(
                    label = "TV Shows",
                    selected = uiState.selectedContentType == "web_series",
                    icon = { Icon(Icons.Filled.Tv, contentDescription = null, modifier = Modifier.size(18.dp), tint = if (uiState.selectedContentType == "web_series") Color.Black else CineVaultTheme.colors.textSecondary) },
                    onClick = { viewModel.setContentType("web_series") },
                )
            }
            item {
                FindFilterChip(
                    label = "Anime",
                    selected = uiState.selectedContentType == "anime",
                    icon = { Icon(Icons.Filled.Animation, contentDescription = null, modifier = Modifier.size(18.dp), tint = if (uiState.selectedContentType == "anime") Color.Black else CineVaultTheme.colors.textSecondary) },
                    onClick = { viewModel.setContentType("anime") },
                )
            }
        }

        // ── Genre Row ──
        val allGenres = listOf("Action", "Comedy", "Mystery", "Romance", "Crime", "Drama", "Documentary", "Erotic", "Thriller", "Horror", "Sci-Fi", "Adventure", "Animation", "Cartoon", "Science fiction", "Others")
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 12.dp),
            modifier = Modifier.padding(bottom = 8.dp),
        ) {
            item {
                FindFilterChip(
                    label = "All Genre",
                    selected = uiState.selectedGenre == null,
                    isGold = true,
                    onClick = { viewModel.setGenre(null) },
                )
            }
            val genreIconMap = mapOf(
                "Action" to R.drawable.ic_genre_action,
                "Comedy" to R.drawable.ic_genre_comedy,
                "Mystery" to R.drawable.ic_genre_mystery,
                "Romance" to R.drawable.ic_genre_romance,
                "Crime" to R.drawable.ic_genre_crime,
                "Drama" to R.drawable.ic_genre_drama,
                "Documentary" to R.drawable.ic_genre_documentary,
                "Erotic" to R.drawable.ic_genre_erotic,
                "Thriller" to R.drawable.ic_genre_thriller,
                "Horror" to R.drawable.ic_genre_horror,
                "Sci-Fi" to R.drawable.ic_genre_scifi,
                "Science fiction" to R.drawable.ic_genre_scifi,
                "Animation" to R.drawable.ic_genre_animation,
                "Others" to R.drawable.ic_genre_others,
            )
            items(allGenres) { genre ->
                FindFilterChip(
                    label = genre,
                    selected = uiState.selectedGenre == genre,
                    icon = genreIconMap[genre]?.let { iconRes ->
                        {
                            Image(
                                painter = painterResource(id = iconRes),
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                colorFilter = ColorFilter.tint(
                                    if (uiState.selectedGenre == genre) Color.Black else CineVaultTheme.colors.textSecondary,
                                ),
                            )
                        }
                    },
                    onClick = { viewModel.setGenre(genre) },
                )
            }
        }

        // ── Platform Row ──
        val platformNames = listOf("All Platform", "Netflix", "Disney+ Hotstar", "ZEE5", "Amazon Prime Video", "Crunchyroll", "MX Player")
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 12.dp),
            modifier = Modifier.padding(bottom = 8.dp),
        ) {
            items(platformNames) { platform ->
                val isAll = platform == "All Platform"
                val isSelected = if (isAll) uiState.selectedPlatform == null else uiState.selectedPlatform == platform
                PlatformChip(
                    label = platform,
                    logoRes = platformLogoMap[platform],
                    selected = isSelected,
                    isGold = isAll,
                    onClick = { viewModel.setPlatform(if (isAll) null else platform) },
                )
            }
        }

        // ── More Filters + Default Sort ──
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { viewModel.toggleMoreFilters() }
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.Tune, contentDescription = null, tint = CineVaultTheme.colors.textSecondary, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("More Filters", style = CineVaultTheme.typography.bodySmall, color = CineVaultTheme.colors.textSecondary)
                Icon(
                    if (uiState.showMoreFilters) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown,
                    contentDescription = null,
                    tint = CineVaultTheme.colors.textSecondary,
                    modifier = Modifier.size(16.dp),
                )
            }

            SortDropdown(
                selectedSort = uiState.selectedSort,
                onSortChange = viewModel::setSort,
            )
        }

        // ── More Filters Expanded ──
        AnimatedVisibility(
            visible = uiState.showMoreFilters,
            enter = expandVertically() + fadeIn(),
            exit = shrinkVertically() + fadeOut(),
        ) {
            MoreFiltersPanel(uiState = uiState, viewModel = viewModel)
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// SORT DROPDOWN
// ═══════════════════════════════════════════════════════════════

@Composable
private fun SortDropdown(
    selectedSort: String?,
    onSortChange: (String?) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val sortOptions = listOf(
        null to "Default",
        "newest" to "Latest",
        "views" to "Most viewed",
        "rating" to "Rating",
    )
    val currentLabel = sortOptions.find { it.first == selectedSort }?.second ?: "Default"

    Box {
        Row(
            modifier = Modifier
                .clip(RoundedCornerShape(20.dp))
                .border(1.dp, Color(0xFF3A3A3A), RoundedCornerShape(20.dp))
                .clickable { expanded = true }
                .padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Filled.SwapVert, contentDescription = null, tint = CineVaultTheme.colors.textSecondary, modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(4.dp))
            Text(currentLabel, style = CineVaultTheme.typography.bodySmall, color = CineVaultTheme.colors.textSecondary)
            Icon(Icons.Filled.KeyboardArrowDown, contentDescription = null, tint = CineVaultTheme.colors.textSecondary, modifier = Modifier.size(14.dp))
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.background(Color(0xFF2A2A2A)),
        ) {
            sortOptions.forEach { (value, label) ->
                DropdownMenuItem(
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(label, color = if (selectedSort == value) CineVaultTheme.colors.accentGold else CineVaultTheme.colors.textPrimary)
                            if (selectedSort == value) {
                                Spacer(Modifier.width(8.dp))
                                Icon(Icons.Filled.Check, contentDescription = null, tint = CineVaultTheme.colors.accentGold, modifier = Modifier.size(16.dp))
                            }
                        }
                    },
                    onClick = {
                        onSortChange(value)
                        expanded = false
                    },
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// MORE FILTERS PANEL
// ═══════════════════════════════════════════════════════════════

@Composable
private fun MoreFiltersPanel(
    uiState: FindUiState,
    viewModel: FindViewModel,
) {
    Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)) {
        // ── Language ──
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 6.dp)) {
            Icon(Icons.Filled.Language, contentDescription = null, tint = CineVaultTheme.colors.textMuted, modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(6.dp))
            Text("Language", style = CineVaultTheme.typography.bodySmall, color = CineVaultTheme.colors.textMuted)
        }
        val defaultLanguages = listOf("Hindi", "English", "Tamil", "Telugu", "Malayalam", "Marathi", "Kannada", "Punjabi", "Korean", "Japanese")
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 10.dp)) {
            items(defaultLanguages) { lang ->
                SmallFilterChip(
                    label = lang,
                    selected = uiState.selectedLanguage == lang,
                    onClick = { viewModel.setLanguage(lang) },
                )
            }
        }

        // ── Region ──
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 6.dp)) {
            Icon(Icons.Filled.LocationOn, contentDescription = null, tint = CineVaultTheme.colors.textMuted, modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(6.dp))
            Text("Region", style = CineVaultTheme.typography.bodySmall, color = CineVaultTheme.colors.textMuted)
        }
        val regions = listOf("India", "Korea", "Thailand", "Russia", "Europe", "Other")
        val regionFlags = mapOf("India" to "\uD83C\uDDEE\uD83C\uDDF3", "Korea" to "\uD83C\uDDF0\uD83C\uDDF7", "Thailand" to "\uD83C\uDDF9\uD83C\uDDED", "Russia" to "\uD83C\uDDF7\uD83C\uDDFA", "Europe" to "\uD83C\uDDEA\uD83C\uDDFA")
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 10.dp)) {
            items(regions) { region ->
                SmallFilterChip(
                    label = "${regionFlags[region] ?: "🌍"} $region",
                    selected = uiState.selectedRegion == region,
                    onClick = { viewModel.setRegion(region) },
                )
            }
        }

        // ── Released Year ──
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 6.dp)) {
            Icon(Icons.Filled.CalendarToday, contentDescription = null, tint = CineVaultTheme.colors.textMuted, modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(6.dp))
            Text("Released", style = CineVaultTheme.typography.bodySmall, color = CineVaultTheme.colors.textMuted)
        }
        val defaultYears = listOf("All") + (2026 downTo 2015).map { it.toString() }
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 8.dp)) {
            items(defaultYears) { yearStr ->
                val yearVal = yearStr.toIntOrNull()
                SmallFilterChip(
                    label = yearStr,
                    selected = if (yearStr == "All") uiState.selectedYear == null else uiState.selectedYear == yearVal,
                    onClick = { viewModel.setYear(yearVal) },
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// FILTER CHIP COMPOSABLES
// ═══════════════════════════════════════════════════════════════

@Composable
private fun FindFilterChip(
    label: String,
    selected: Boolean,
    isGold: Boolean = false,
    icon: (@Composable () -> Unit)? = null,
    onClick: () -> Unit,
) {
    val bgColor = when {
        selected && isGold -> Color(0xFFD4AF37).copy(alpha = 0.15f)
        selected -> CineVaultTheme.colors.accentGold
        else -> Color.Transparent
    }
    val borderColor = when {
        selected && isGold -> CineVaultTheme.colors.accentGold.copy(alpha = 0.6f)
        selected -> Color.Transparent
        else -> Color(0xFF3A3A3A)
    }
    val textColor = when {
        selected && isGold -> CineVaultTheme.colors.accentGold
        selected -> Color.Black
        else -> CineVaultTheme.colors.textPrimary
    }

    Row(
        modifier = Modifier
            .height(40.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(bgColor)
            .border(
                width = if (selected) 1.5.dp else 1.dp,
                color = borderColor,
                shape = RoundedCornerShape(12.dp),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) {
            icon()
            Spacer(Modifier.width(6.dp))
        }
        Text(label, fontSize = 13.sp, fontWeight = if (selected && isGold) FontWeight.Bold else FontWeight.Medium, color = textColor, maxLines = 1)
    }
}

@Composable
private fun PlatformChip(
    label: String,
    logoRes: Int? = null,
    selected: Boolean,
    isGold: Boolean = false,
    onClick: () -> Unit,
) {
    val borderColor = when {
        selected && isGold -> CineVaultTheme.colors.accentGold.copy(alpha = 0.6f)
        selected -> CineVaultTheme.colors.accentGold.copy(alpha = 0.7f)
        else -> Color(0xFF3A3A3A)
    }
    val bgColor = when {
        selected && isGold -> Color(0xFFD4AF37).copy(alpha = 0.15f)
        selected -> Color(0xFF3A3A3A).copy(alpha = 0.5f)
        else -> Color.Transparent
    }

    Box(
        modifier = Modifier
            .height(40.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(bgColor)
            .border(
                width = if (selected) 1.5.dp else 1.dp,
                color = borderColor,
                shape = RoundedCornerShape(12.dp),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (logoRes != null) {
            Image(
                painter = painterResource(id = logoRes),
                contentDescription = label,
                modifier = Modifier
                    .height(28.dp)
                    .widthIn(min = 28.dp, max = 120.dp),
                contentScale = ContentScale.Fit,
            )
        } else {
            Text(
                label,
                fontSize = 13.sp,
                fontWeight = if (selected && isGold) FontWeight.Bold else FontWeight.SemiBold,
                color = if (selected && isGold) CineVaultTheme.colors.accentGold else if (selected) CineVaultTheme.colors.accentGold else CineVaultTheme.colors.textPrimary,
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun SmallFilterChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Text(
        text = label,
        fontSize = 11.sp,
        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
        color = if (selected) CineVaultTheme.colors.accentGold else CineVaultTheme.colors.textSecondary,
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(if (selected) Color(0xFF3A3A3A) else Color.Transparent)
            .border(
                width = 1.dp,
                color = if (selected) CineVaultTheme.colors.accentGold.copy(alpha = 0.5f) else Color(0xFF3A3A3A),
                shape = RoundedCornerShape(16.dp),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        maxLines = 1,
    )
}

// ═══════════════════════════════════════════════════════════════
// FIND MOVIE CARD
// ═══════════════════════════════════════════════════════════════

@Composable
private fun FindMovieCard(
    movie: MovieDto,
    onClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(8.dp))
                .background(Color(0xFF2A2A2A)),
        ) {
            AsyncImage(
                model = movie.posterUrl,
                contentDescription = movie.title,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )

            // Language badge (top-right)
            val langLabel = movie.languageLabel
            if (!langLabel.isNullOrEmpty()) {
                Text(
                    text = langLabel,
                    fontSize = 7.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(4.dp)
                        .background(
                            when {
                                langLabel.contains("MULTI") -> Color(0xFF9B59B6)
                                langLabel.contains("DUAL") -> Color(0xFF2196F3)
                                langLabel == "HINDI" -> Color(0xFFE53935)
                                langLabel == "TAMIL" -> Color(0xFF43A047)
                                else -> Color(0xFF757575)
                            },
                            RoundedCornerShape(3.dp),
                        )
                        .padding(horizontal = 4.dp, vertical = 1.dp),
                )
            }

            // Bottom gradient overlay
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f)),
                        )
                    ),
            )

            // Quality badge (bottom-left)
            if (!movie.videoQuality.isNullOrBlank()) {
                Text(
                    text = movie.videoQuality!!,
                    fontSize = 7.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(4.dp)
                        .background(Color(0xFF333333).copy(alpha = 0.8f), RoundedCornerShape(3.dp))
                        .padding(horizontal = 4.dp, vertical = 1.dp),
                )
            }

            // Season count / Rating (bottom-right)
            val ratingVal = movie.starRating?.takeIf { it > 0 } ?: movie.rating?.takeIf { it > 0 }
            if (ratingVal != null) {
                Text(
                    text = String.format("%.1f", ratingVal),
                    fontSize = 8.sp,
                    fontWeight = FontWeight.Bold,
                    color = CineVaultTheme.colors.accentGold,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(4.dp),
                )
            }
        }

        // Title
        Text(
            text = movie.title,
            style = CineVaultTheme.typography.bodySmall,
            color = CineVaultTheme.colors.textPrimary,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 4.dp),
            fontSize = 11.sp,
        )
    }
}
