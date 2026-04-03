package com.cinevault.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cinevault.app.data.model.MovieDto
import com.cinevault.app.data.model.Result
import com.cinevault.app.data.repository.ContentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RankingUiState(
    val isLoading: Boolean = false,
    val items: List<MovieDto> = emptyList(),
    val rankType: String = "download", // "download" or "rating"
    val selectedContentType: String? = null,
    val selectedGenre: String? = null,
    val error: String? = null,
)

@HiltViewModel
class RankingViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RankingUiState())
    val uiState: StateFlow<RankingUiState> = _uiState.asStateFlow()

    private var loadJob: Job? = null

    init {
        loadRanking()
    }

    private fun loadRanking() {
        loadJob?.cancel()
        val state = _uiState.value
        loadJob = viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = contentRepository.getRanking(
                type = state.rankType,
                contentType = state.selectedContentType,
                genre = state.selectedGenre,
                limit = 20,
            )) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, items = result.data) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun setRankType(type: String) {
        if (_uiState.value.rankType == type) return
        _uiState.update { it.copy(rankType = type) }
        loadRanking()
    }

    fun setContentType(type: String?) {
        _uiState.update { it.copy(selectedContentType = if (it.selectedContentType == type) null else type) }
        loadRanking()
    }

    fun setGenre(genre: String?) {
        _uiState.update { it.copy(selectedGenre = if (it.selectedGenre == genre) null else genre) }
        loadRanking()
    }
}
