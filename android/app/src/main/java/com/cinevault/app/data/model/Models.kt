package com.cinevault.app.data.model

import com.google.gson.annotations.SerializedName

// Auth
data class LoginRequest(val email: String, val password: String)
data class RegisterRequest(val name: String, val email: String, val password: String)
data class AuthResponse(
    val accessToken: String,
    val refreshToken: String?,
    val user: UserDto
)
data class RefreshResponse(
    val accessToken: String,
    val refreshToken: String?,
)
data class ForgotPasswordRequest(val email: String)
data class ResetPasswordRequest(val token: String, val password: String)
data class MessageResponse(val message: String)

// User
data class UserDto(
    val id: String,
    val name: String,
    val email: String,
    val avatarUrl: String?,
    val role: String,
    val isEmailVerified: Boolean
)

// Profile
data class ProfileDto(
    @SerializedName("_id") val id: String,
    val userId: String,
    val displayName: String,
    val avatarUrl: String?,
    val maturityRating: String,
    val isActive: Boolean
) {
    val name: String get() = displayName
}
data class CreateProfileRequest(
    val displayName: String,
    val avatarUrl: String? = null,
    val maturityRating: String? = null,
    val pin: String? = null
)
data class VerifyPinRequest(val pin: String)
data class VerifyPinResponse(val valid: Boolean)

// Movie / Content
data class MovieDto(
    @SerializedName("_id") val id: String,
    val title: String,
    val alternateTitle: String?,
    val synopsis: String?,
    val contentType: String,
    val genres: List<String>,
    val languages: List<String>?,
    val contentRating: String?,
    val status: String?,
    val releaseYear: Int?,
    val country: String?,
    val duration: Int?,
    val director: String?,
    val studio: String?,
    val cast: List<CastMemberDto>?,
    val posterUrl: String?,
    val bannerUrl: String?,
    val logoUrl: String?,
    val trailerUrl: String?,
    val cbfcCertificateUrl: String?,
    val streamingSources: List<StreamingSourceDto>?,
    val rating: Double?,
    val starRating: Double?,
    val voteCount: Int?,
    val viewCount: Int?,
    val popularityScore: Double?,
    val tags: List<String>?,
    val platformOrigin: String?,
    val isFeatured: Boolean?,
    val rankingLabel: String?,
    val videoQuality: String?,
    val hlsUrl: String?,
    val createdAt: String?,
    val updatedAt: String?
) {
    val averageRating: Double get() = rating ?: 0.0
    val backdropUrl: String? get() = bannerUrl
    val description: String? get() = synopsis

    val languageLabel: String?
        get() {
            val langs = languages ?: return null
            if (langs.isEmpty()) return null
            if (langs.size >= 3) return "MULTILINGUAL"
            if (langs.size == 2) return "DUAL AUDIO"
            return langs.first().uppercase()
        }
}

data class CastMemberDto(
    val name: String,
    val role: String?,
    val character: String?,
    val photoUrl: String?
)

data class StreamingSourceDto(
    val label: String,
    val url: String,
    val quality: String?,
    val priority: Int?
)

data class MoviesListResponse(
    val movies: List<MovieDto>,
    val total: Int,
    val page: Int,
    val pages: Int
)

// Banner
data class BannerDto(
    @SerializedName("_id") val id: String,
    val contentId: Any?,
    val title: String? = null,
    val subtitle: String? = null,
    val imageUrl: String,
    val logoUrl: String?,
    val tagline: String?,
    val genreTags: List<String>?,
    val displayOrder: Int,
    val isActive: Boolean
) {
    /** Extract movie ID from contentId which can be:
     *  - a plain String (unpopulated ObjectId)
     *  - a populated Map with "_id" key (when backend populates the ref)
     */
    val contentIdString: String?
        get() = when (contentId) {
            is String -> contentId
            is Map<*, *> -> (contentId as Map<*, *>)["_id"]?.toString()
            else -> null
        }

    val contentType: String?
        get() = when (contentId) {
            is Map<*, *> -> (contentId as Map<*, *>)["contentType"]?.toString()
            else -> null
        }

    val releaseYear: Int?
        get() = when (contentId) {
            is Map<*, *> -> (contentId as Map<*, *>)["releaseYear"]?.let {
                when (it) {
                    is Number -> it.toInt()
                    is String -> it.toIntOrNull()
                    else -> null
                }
            }
            else -> null
        }

    val contentRating: String?
        get() = when (contentId) {
            is Map<*, *> -> (contentId as Map<*, *>)["contentRating"]?.toString()
            else -> null
        }

    val starRating: Double?
        get() = when (contentId) {
            is Map<*, *> -> (contentId as Map<*, *>)["starRating"]?.let {
                when (it) {
                    is Number -> it.toDouble()
                    is String -> it.toDoubleOrNull()
                    else -> null
                }
            }
            else -> null
        }
}

// Home Feed
data class HomeSectionDto(
    val id: String,
    val title: String,
    val slug: String?,
    val type: String = "standard", // standard, large_card, mid_banner, trending
    val cardSize: String = "small", // small, medium, large
    val showViewMore: Boolean = true,
    val viewMoreText: String = "View More",
    val showTrendingNumbers: Boolean = false,
    val bannerImageUrl: String? = null,
    val items: List<MovieDto> = emptyList()
)

// Season / Episode
data class SeasonDto(
    @SerializedName("_id") val id: String,
    val seriesId: String,
    val seasonNumber: Int,
    val title: String?,
    val synopsis: String?,
    val posterUrl: String?,
    val releaseYear: Int?,
    val episodeCount: Int
)

data class EpisodeDto(
    @SerializedName("_id") val id: String,
    val seasonId: String,
    val episodeNumber: Int,
    val title: String,
    val synopsis: String?,
    val duration: Int?,
    val airDate: String?,
    val thumbnailUrl: String?,
    val streamingSources: List<StreamingSourceDto>?,
    val skipIntro: SkipTimestampDto?,
    val skipRecap: SkipTimestampDto?,
    val subtitles: List<SubtitleTrackDto>?,
    val audioTracks: List<AudioTrackDto>?
)

data class SkipTimestampDto(val start: Int, val end: Int)
data class SubtitleTrackDto(val language: String, val url: String, val isDefault: Boolean)
data class AudioTrackDto(val language: String, val label: String?, val isDefault: Boolean)

// Watch Progress
data class WatchProgressDto(
    @SerializedName("_id") val id: String?,
    val contentId: String,
    val contentType: String,
    val currentTime: Int,
    val totalDuration: Int,
    val isCompleted: Boolean,
    val lastWatchedAt: String?,
    val episodeTitle: String?,
    val contentTitle: String?,
    val thumbnailUrl: String?,
    val seriesId: String? = null,  // populated when contentType == "episode"
) {
    val duration: Int get() = totalDuration
    val position: Int get() = currentTime
}

data class UpdateProgressRequest(
    val contentId: String,
    val contentType: String,
    val currentTime: Int,
    val totalDuration: Int,
    val seriesId: String? = null,
    val episodeTitle: String? = null,
    val contentTitle: String? = null,
    val thumbnailUrl: String? = null
)

// Watchlist
data class WatchlistItemDto(
    @SerializedName("_id") val id: String?,
    val contentId: MovieDto,
)
data class WatchlistCheckResponse(val inWatchlist: Boolean)

// Watch History paginated response
data class WatchHistoryResponse(
    val items: List<WatchProgressDto>,
    val total: Int,
)

// Review
data class ReviewDto(
    @SerializedName("_id") val id: String,
    val userId: Any?,
    val contentId: String,
    val rating: Int,
    val text: String?,
    val moderationStatus: String,
    val createdAt: String
) {
    val userName: String get() = (userId as? String) ?: "User"
}

data class CreateReviewRequest(
    val contentId: String,
    val rating: Int,
    val text: String? = null
)

data class ReviewsResponse(
    val reviews: List<ReviewDto>,
    val total: Int
)

// Search
data class SearchResponse(
    val results: List<MovieDto>,
    val total: Int,
    val page: Int,
    val pages: Int,
    val hasMore: Boolean
)

data class AutocompleteItem(
    @SerializedName("_id") val id: String,
    val title: String,
    val posterUrl: String?,
    val contentType: String?,
    val releaseYear: Int?
)

// Streaming
data class SignedUrlResponse(val url: String)
