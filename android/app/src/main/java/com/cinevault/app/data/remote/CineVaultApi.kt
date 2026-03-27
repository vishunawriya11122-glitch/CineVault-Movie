package com.cinevault.app.data.remote

import com.cinevault.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface CineVaultApi {

    // Auth
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("auth/refresh")
    suspend fun refreshToken(@Body body: Map<String, String>): Response<RefreshResponse>

    @POST("auth/forgot-password")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): Response<MessageResponse>

    @POST("auth/reset-password")
    suspend fun resetPassword(@Body request: ResetPasswordRequest): Response<MessageResponse>

    @POST("auth/logout")
    suspend fun logout(): Response<MessageResponse>

    // Users
    @GET("users/me")
    suspend fun getMe(): Response<UserDto>

    @PATCH("users/me")
    suspend fun updateMe(@Body updates: Map<String, String>): Response<UserDto>

    @PATCH("users/me/fcm-token")
    suspend fun updateFcmToken(@Body body: Map<String, String>): Response<MessageResponse>

    // Profiles
    @GET("profiles")
    suspend fun getProfiles(): Response<List<ProfileDto>>

    @POST("profiles")
    suspend fun createProfile(@Body request: CreateProfileRequest): Response<ProfileDto>

    @PATCH("profiles/{id}")
    suspend fun updateProfile(@Path("id") id: String, @Body updates: Map<String, String>): Response<ProfileDto>

    @DELETE("profiles/{id}")
    suspend fun deleteProfile(@Path("id") id: String): Response<MessageResponse>

    @POST("profiles/{id}/verify-pin")
    suspend fun verifyPin(@Path("id") id: String, @Body request: VerifyPinRequest): Response<VerifyPinResponse>

    // Home
    @GET("home/feed")
    suspend fun getHomeFeed(@Query("section") section: String? = null): Response<List<HomeSectionDto>>

    // Banners
    @GET("banners")
    suspend fun getBanners(@Query("section") section: String? = null): Response<List<BannerDto>>

    // Movies
    @GET("movies")
    suspend fun getMovies(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("contentType") contentType: String? = null,
        @Query("genre") genre: String? = null,
        @Query("language") language: String? = null,
        @Query("year") year: Int? = null,
        @Query("rating") rating: Double? = null,
        @Query("sort") sort: String? = null,
    ): Response<MoviesListResponse>

    @GET("movies/trending")
    suspend fun getTrending(@Query("limit") limit: Int = 20): Response<List<MovieDto>>

    @GET("movies/new-releases")
    suspend fun getNewReleases(@Query("limit") limit: Int = 20): Response<List<MovieDto>>

    @GET("movies/top-rated")
    suspend fun getTopRated(@Query("limit") limit: Int = 20): Response<List<MovieDto>>

    @GET("movies/{id}")
    suspend fun getMovie(@Path("id") id: String): Response<MovieDto>

    @GET("movies/{id}/related")
    suspend fun getRelated(@Path("id") id: String): Response<List<MovieDto>>

    // Series
    @GET("series/{seriesId}/seasons")
    suspend fun getSeasons(@Path("seriesId") seriesId: String): Response<List<SeasonDto>>

    @GET("series/seasons/{seasonId}/episodes")
    suspend fun getEpisodes(@Path("seasonId") seasonId: String): Response<List<EpisodeDto>>

    @GET("series/episodes/{id}")
    suspend fun getEpisode(@Path("id") id: String): Response<EpisodeDto>

    // Search
    @GET("search")
    suspend fun search(
        @Query("q") query: String? = null,
        @Query("contentType") contentType: String? = null,
        @Query("genre") genre: String? = null,
        @Query("language") language: String? = null,
        @Query("yearMin") yearMin: Int? = null,
        @Query("yearMax") yearMax: Int? = null,
        @Query("ratingMin") ratingMin: Double? = null,
        @Query("sort") sort: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): Response<SearchResponse>

    @GET("search/autocomplete")
    suspend fun autocomplete(@Query("q") query: String): Response<List<AutocompleteItem>>

    @GET("search/trending")
    suspend fun getTrendingSearches(): Response<List<String>>

    @GET("search/genres")
    suspend fun getGenres(): Response<List<String>>

    @GET("search/languages")
    suspend fun getLanguages(): Response<List<String>>

    // Watch Progress
    @POST("watch-progress")
    suspend fun updateProgress(
        @Header("x-profile-id") profileId: String,
        @Body request: UpdateProgressRequest,
    ): Response<WatchProgressDto>

    @GET("watch-progress/continue-watching")
    suspend fun getContinueWatching(
        @Header("x-profile-id") profileId: String,
    ): Response<List<WatchProgressDto>>

    @GET("watch-progress/history")
    suspend fun getWatchHistory(
        @Header("x-profile-id") profileId: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): Response<WatchHistoryResponse>

    @GET("watch-progress/{contentId}")
    suspend fun getProgress(
        @Header("x-profile-id") profileId: String,
        @Path("contentId") contentId: String,
    ): Response<WatchProgressDto?>

    // Watchlist
    @GET("watchlist")
    suspend fun getWatchlist(
        @Header("x-profile-id") profileId: String,
    ): Response<List<WatchlistItemDto>>

    @POST("watchlist/{contentId}")
    suspend fun addToWatchlist(
        @Header("x-profile-id") profileId: String,
        @Path("contentId") contentId: String,
    ): Response<MessageResponse>

    @DELETE("watchlist/{contentId}")
    suspend fun removeFromWatchlist(
        @Header("x-profile-id") profileId: String,
        @Path("contentId") contentId: String,
    ): Response<MessageResponse>

    @GET("watchlist/{contentId}/check")
    suspend fun checkWatchlist(
        @Header("x-profile-id") profileId: String,
        @Path("contentId") contentId: String,
    ): Response<WatchlistCheckResponse>

    // Reviews
    @GET("reviews/content/{contentId}")
    suspend fun getReviews(
        @Path("contentId") contentId: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): Response<ReviewsResponse>

    @POST("reviews")
    suspend fun createReview(@Body request: CreateReviewRequest): Response<ReviewDto>

    // Streaming
    @GET("streaming/url")
    suspend fun getStreamUrl(@Query("path") path: String): Response<SignedUrlResponse>
}
