package com.cinevault.app.data.repository

import com.cinevault.app.data.model.*
import com.cinevault.app.data.remote.CineVaultApi
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WatchProgressRepository @Inject constructor(private val api: CineVaultApi) {

    suspend fun updateProgress(
        contentId: String,
        profileId: String,
        position: Long,
        duration: Long,
        contentTitle: String? = null,
        thumbnailUrl: String? = null,
        contentType: String = "movie",
        seriesId: String? = null,
        episodeTitle: String? = null,
    ): Result<WatchProgressDto> {
        return try {
            val request = UpdateProgressRequest(
                contentId = contentId,
                contentType = contentType,
                currentTime = position.toInt(),
                totalDuration = duration.toInt(),
                contentTitle = contentTitle,
                thumbnailUrl = thumbnailUrl,
                seriesId = seriesId,
                episodeTitle = episodeTitle,
            )
            val response = api.updateProgress(profileId, request)
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "Failed to update progress")
        }
    }

    suspend fun getProgress(profileId: String, contentId: String): Result<WatchProgressDto?> {
        return try {
            val response = api.getProgress(profileId, contentId)
            if (response.isSuccessful) {
                Result.Success(response.body())
            } else if (response.code() == 404) {
                Result.Success(null)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Success(null)
        }
    }

    /** For series: returns the most recently watched episode's progress. */
    suspend fun getLatestEpisodeProgress(profileId: String, seriesId: String): Result<WatchProgressDto?> {
        return try {
            val response = api.getLatestEpisodeForSeries(profileId, seriesId)
            if (response.isSuccessful) {
                Result.Success(response.body())
            } else if (response.code() == 404) {
                Result.Success(null)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Success(null)
        }
    }

    suspend fun getContinueWatching(profileId: String): Result<List<WatchProgressDto>> {
        return try {
            val response = api.getContinueWatching(profileId)
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "Failed to load continue watching")
        }
    }

    suspend fun getWatchHistory(profileId: String): Result<List<WatchProgressDto>> {
        return try {
            val response = api.getWatchHistory(profileId)
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!.items)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "Failed to load watch history")
        }
    }

    suspend fun getStreamingUrl(path: String): Result<SignedUrlResponse> {
        return try {
            val response = api.getStreamUrl(path)
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.localizedMessage ?: "Failed to get streaming URL")
        }
    }
}
