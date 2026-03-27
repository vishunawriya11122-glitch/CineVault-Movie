package com.cinevault.app.data.repository

import com.cinevault.app.data.model.*
import com.cinevault.app.data.remote.CineVaultApi
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ContentRepository @Inject constructor(private val api: CineVaultApi) {

    suspend fun getHomeFeed(section: String? = null): Result<List<HomeSectionDto>> {
        return try {
            val response = api.getHomeFeed(section)
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "Failed to load home feed")
        }
    }

    suspend fun getBanners(section: String? = null): Result<List<BannerDto>> {
        return try {
            val response = api.getBanners(section)
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "Failed to load banners")
        }
    }

    suspend fun getMovie(id: String): Result<MovieDto> {
        return try {
            val response = api.getMovie(id)
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "Failed to load content")
        }
    }

    suspend fun getRelated(movieId: String): Result<List<MovieDto>> {
        return try {
            val response = api.getRelated(movieId)
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "Failed to load related content")
        }
    }

    suspend fun getSeasons(seriesId: String): Result<List<SeasonDto>> {
        return try {
            val response = api.getSeasons(seriesId)
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "Failed to load seasons")
        }
    }

    suspend fun getEpisodes(seasonId: String): Result<List<EpisodeDto>> {
        return try {
            val response = api.getEpisodes(seasonId)
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "Failed to load episodes")
        }
    }

    suspend fun search(
        query: String? = null,
        contentType: String? = null,
        genre: String? = null,
        language: String? = null,
        yearMin: Int? = null,
        yearMax: Int? = null,
        ratingMin: Double? = null,
        sort: String? = null,
        page: Int = 1,
    ): Result<SearchResponse> {
        return try {
            val response = api.search(query, contentType, genre, language, yearMin, yearMax, ratingMin, sort, page)
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "Search failed")
        }
    }

    suspend fun autocomplete(query: String): Result<List<AutocompleteItem>> {
        return try {
            val response = api.autocomplete(query)
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "Autocomplete failed")
        }
    }

    suspend fun getTrendingSearches(): Result<List<String>> {
        return try {
            val response = api.getTrendingSearches()
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "Failed to load trending searches")
        }
    }

    suspend fun getGenres(): Result<List<String>> {
        return try {
            val response = api.getGenres()
            if (response.isSuccessful) Result.Success(response.body() ?: emptyList())
            else Result.Error(response.message())
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "Failed to load genres")
        }
    }

    suspend fun getLanguages(): Result<List<String>> {
        return try {
            val response = api.getLanguages()
            if (response.isSuccessful) Result.Success(response.body() ?: emptyList())
            else Result.Error(response.message())
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "Failed to load languages")
        }
    }

    suspend fun getMoviesByType(contentType: String?, page: Int = 1, limit: Int = 20): Result<List<MovieDto>> {
        return try {
            val response = api.getMovies(page = page, limit = limit, contentType = contentType)
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!.movies)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "Failed to load content")
        }
    }
}
