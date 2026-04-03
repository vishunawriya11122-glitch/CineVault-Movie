package com.cinevault.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cinevault.app.data.model.*
import com.cinevault.app.data.repository.ContentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class FindUiState(
    val isLoading: Boolean = false,
    val query: String = "",
    val results: List<MovieDto> = emptyList(),
    val autocomplete: List<AutocompleteItem> = emptyList(),

    // Filter options (loaded from backend)
    val genres: List<String> = emptyList(),
    val languages: List<String> = emptyList(),
    val platforms: List<String> = emptyList(),
    val years: List<Int> = emptyList(),

    // Selected filters
    val selectedContentType: String? = null,
    val selectedGenre: String? = null,
    val selectedLanguage: String? = null,
    val selectedPlatform: String? = null,
    val selectedYear: Int? = null,
    val selectedSort: String? = null,
    val selectedRegion: String? = null,

    // UI state
    val showMoreFilters: Boolean = false,
    val hasMore: Boolean = false,
    val currentPage: Int = 1,
    val total: Int = 0,
    val error: String? = null,

    // Initial load done
    val filtersLoaded: Boolean = false,
    val hasSearched: Boolean = false,
)

@HiltViewModel
class FindViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(FindUiState())
    val uiState: StateFlow<FindUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null
    private var autocompleteJob: Job? = null

    init {
        loadFilterOptions()
        // Initially load all content (no filters)
        performSearch(resetPage = true)
    }

    private fun loadFilterOptions() {
        viewModelScope.launch {
            val genres = when (val r = contentRepository.getGenres()) {
                is Result.Success -> r.data
                else -> emptyList()
            }
            val languages = when (val r = contentRepository.getLanguages()) {
                is Result.Success -> r.data
                else -> emptyList()
            }
            val platforms = when (val r = contentRepository.getPlatforms()) {
                is Result.Success -> r.data.filter { it.isNotBlank() }
                else -> emptyList()
            }
            val years = when (val r = contentRepository.getYears()) {
                is Result.Success -> r.data
                else -> emptyList()
            }
            _uiState.update {
                it.copy(
                    genres = genres,
                    languages = languages,
                    platforms = platforms,
                    years = years,
                    filtersLoaded = true,
                )
            }
        }
    }

    fun onQueryChange(query: String) {
        _uiState.update { it.copy(query = query) }
        autocompleteJob?.cancel()
        if (query.length >= 2) {
            autocompleteJob = viewModelScope.launch {
                delay(300)
                when (val result = contentRepository.autocomplete(query)) {
                    is Result.Success -> _uiState.update { it.copy(autocomplete = result.data) }
                    else -> {}
                }
            }
        } else {
            _uiState.update { it.copy(autocomplete = emptyList()) }
        }
    }

    fun search() {
        performSearch(resetPage = true)
    }

    fun loadMore() {
        performSearch(resetPage = false)
    }

    private fun performSearch(resetPage: Boolean) {
        searchJob?.cancel()
        val state = _uiState.value
        val page = if (resetPage) 1 else state.currentPage + 1

        searchJob = viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, autocomplete = emptyList()) }
            when (val result = contentRepository.search(
                query = state.query.takeIf { it.isNotBlank() },
                contentType = state.selectedContentType,
                genre = state.selectedGenre,
                language = state.selectedLanguage,
                platform = state.selectedPlatform,
                yearMin = state.selectedYear,
                yearMax = state.selectedYear,
                sort = state.selectedSort,
                page = page,
            )) {
                is Result.Success -> {
                    val data = result.data
                    val newResults = if (resetPage) data.results else state.results + data.results
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            results = newResults,
                            hasMore = data.hasMore,
                            currentPage = data.page,
                            total = data.total,
                            hasSearched = true,
                        )
                    }
                }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun setContentType(type: String?) {
        _uiState.update { it.copy(selectedContentType = if (it.selectedContentType == type) null else type) }
        performSearch(resetPage = true)
    }

    fun setGenre(genre: String?) {
        _uiState.update { it.copy(selectedGenre = if (it.selectedGenre == genre) null else genre) }
        performSearch(resetPage = true)
    }

    fun setPlatform(platform: String?) {
        _uiState.update { it.copy(selectedPlatform = if (it.selectedPlatform == platform) null else platform) }
        performSearch(resetPage = true)
    }

    fun setLanguage(language: String?) {
        _uiState.update { it.copy(selectedLanguage = if (it.selectedLanguage == language) null else language) }
        performSearch(resetPage = true)
    }

    fun setYear(year: Int?) {
        _uiState.update { it.copy(selectedYear = if (it.selectedYear == year) null else year) }
        performSearch(resetPage = true)
    }

    fun setSort(sort: String?) {
        _uiState.update { it.copy(selectedSort = if (it.selectedSort == sort) null else sort) }
        performSearch(resetPage = true)
    }

    fun setRegion(region: String?) {
        _uiState.update { it.copy(selectedRegion = if (it.selectedRegion == region) null else region) }
    }

    fun toggleMoreFilters() {
        _uiState.update { it.copy(showMoreFilters = !it.showMoreFilters) }
    }

    fun clearQuery() {
        _uiState.update { it.copy(query = "", autocomplete = emptyList()) }
        performSearch(resetPage = true)
    }

    fun selectAutocomplete(title: String) {
        _uiState.update { it.copy(query = title, autocomplete = emptyList()) }
        performSearch(resetPage = true)
    }
}
