import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Play, Star, Share2, Download, Heart } from 'lucide-react';
import api from '../lib/api';
import type { Movie } from '../types';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function MovieDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [userRating, setUserRating] = useState(0);

  const { data: movie, isLoading, isError } = useQuery({
    queryKey: ['movie', id],
    queryFn: async () => {
      const { data } = await api.get(`/movies/${id}`);
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-text-primary">
        <div className="h-[60vh] bg-surface-light animate-pulse" />
        <div className="p-6 space-y-4 max-w-6xl mx-auto">
          <div className="h-8 bg-surface-light rounded animate-pulse w-1/3" />
          <div className="h-4 bg-surface-light rounded animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  if (isError || !movie) {
    return (
      <div className="min-h-screen bg-background text-text-primary flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Movie not found</h1>
          <button
            onClick={() => navigate('/movies')}
            className="px-6 py-2 bg-gold hover:bg-gold-light text-background font-semibold rounded-lg transition-colors"
          >
            Back to Movies
          </button>
        </div>
      </div>
    );
  }

  const m: Movie = movie;
  const durationText = m.duration ? `${Math.floor(m.duration / 60)}h ${m.duration % 60}m` : 'N/A';

  const handleRating = (value: number) => {
    setUserRating(value);
    toast.success(`Rated ${value}/5 stars!`);
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/movies/${m._id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  const handleDownload = () => {
    toast('Download feature coming soon!', {
      icon: '📥',
    });
  };

  return (
    <div className="min-h-screen bg-background text-text-primary">
      {/* Back Button */}
      <button
        onClick={() => navigate('/movies')}
        className="fixed top-6 left-6 z-40 flex items-center gap-2 text-text-secondary hover:text-text-primary p-3 rounded-lg hover:bg-surface transition-colors"
      >
        <ArrowLeft size={20} />
        <span className="hidden sm:inline">Back</span>
      </button>

      {/* Trailer Section - Using backdrop as placeholder */}
      <div className="relative w-full h-[60vh] bg-black overflow-hidden">
        <img
          src={m.backdropUrl || m.posterUrl}
          alt={m.title}
          className="w-full h-full object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
        
        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group cursor-pointer">
          <div className="w-24 h-24 rounded-full bg-gold/20 backdrop-blur flex items-center justify-center hover:bg-gold/40 transition-colors">
            <Play size={48} className="text-gold fill-gold ml-2" />
          </div>
        </div>

        {/* Content overlay on banner */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-10">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{m.title}</h1>
          
          {/* Rating & Details Bar */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Star size={18} className="text-gold fill-gold" />
              <span className="font-semibold">{(m.averageRating || 0).toFixed(1)}/5</span>
            </div>
            <span className="text-text-secondary">{m.releaseYear}</span>
            <span className="text-text-secondary">{durationText}</span>
            <span className="text-text-secondary capitalize">{m.contentType.replace(/_/g, ' ')}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-gold hover:bg-gold-light text-background font-semibold rounded-lg transition-colors">
            <Play size={20} className="fill-current" />
            Watch Now
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-3 border border-border hover:border-gold rounded-lg text-text-secondary hover:text-gold transition-colors"
          >
            <Share2 size={20} />
            Share
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-3 border border-border hover:border-gold rounded-lg text-text-secondary hover:text-gold transition-colors"
          >
            <Download size={20} />
            Download
          </button>
          <button className="flex items-center gap-2 px-4 py-3 border border-border hover:border-gold rounded-lg text-text-secondary hover:text-gold transition-colors">
            <Heart size={20} />
            <span className="hidden sm:inline">Watchlist</span>
          </button>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left side */}
          <div className="lg:col-span-2 space-y-8">
            {/* Details */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Details</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 p-4 bg-surface rounded-lg border border-border">
                <div>
                  <p className="text-text-secondary text-sm mb-1">Release Year</p>
                  <p className="font-semibold">{m.releaseYear}</p>
                </div>
                <div>
                  <p className="text-text-secondary text-sm mb-1">Duration</p>
                  <p className="font-semibold">{durationText}</p>
                </div>
                <div>
                  <p className="text-text-secondary text-sm mb-1">Content Type</p>
                  <p className="font-semibold capitalize">{m.contentType.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-text-secondary text-sm mb-1">Views</p>
                  <p className="font-semibold">{(m.viewCount || 0).toLocaleString()}</p>
                </div>
                {m.contentRating && (
                  <div>
                    <p className="text-text-secondary text-sm mb-1">Rating</p>
                    <p className="font-semibold">{m.contentRating}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Plot/Description */}
            {m.synopsis && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Plot</h2>
                <p className="text-text-secondary leading-relaxed">{m.synopsis}</p>
              </div>
            )}

            {/* Cast & Crew */}
            {m.cast && m.cast.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Cast & Crew</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {m.cast.slice(0, 8).map((member, idx) => (
                    <div key={idx} className="text-center">
                      {member.photoUrl && (
                        <img
                          src={member.photoUrl}
                          alt={member.name}
                          className="w-full aspect-square object-cover rounded-lg mb-2"
                        />
                      )}
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-text-secondary">{member.role}</p>
                      {member.character && <p className="text-xs text-gold">{member.character}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trailer Section */}
            {m.trailerUrl && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Trailer</h2>
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  {m.trailerUrl.includes('youtube') ? (
                    <iframe
                      width="100%"
                      height="100%"
                      src={m.trailerUrl}
                      title={`${m.title} Trailer`}
                      allowFullScreen
                      className="w-full h-full"
                    />
                  ) : (
                    <video
                      width="100%"
                      height="100%"
                      controls
                      src={m.trailerUrl}
                      className="w-full h-full"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Comments/Reviews Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Reviews & Comments</h2>
              <div className="space-y-4">
                <div className="p-4 bg-surface rounded-lg border border-border">
                  <p className="text-text-secondary text-sm mb-4">{m.totalReviews || 0} Reviews</p>
                  <div className="space-y-3">
                    {/* Sample review */}
                    <div className="pb-3 border-b border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">User Review</p>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              className={`${i < 4 ? 'text-gold fill-gold' : 'text-text-secondary'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-text-secondary text-sm">Great movie! Highly recommended.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Right side */}
          <div className="space-y-6">
            {/* Rate Section */}
            <div className="p-4 bg-surface rounded-lg border border-border">
              <h3 className="text-lg font-bold mb-4">Rate This Movie</h3>
              <div className="flex flex-col gap-4">
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRating(star)}
                      className="group transition-transform"
                    >
                      <Star
                        size={32}
                        className={`${
                          star <= userRating
                            ? 'text-gold fill-gold'
                            : 'text-text-secondary hover:text-gold'
                        } transition-colors group-hover:scale-110`}
                      />
                    </button>
                  ))}
                </div>
                {userRating > 0 && (
                  <p className="text-center text-sm text-gold font-semibold">
                    You rated {userRating}/5 ⭐
                  </p>
                )}
                <p className="text-center text-xs text-text-secondary">
                  {m.totalReviews || 0} people rated this
                </p>
              </div>
            </div>

            {/* Genres */}
            {m.genres && m.genres.length > 0 && (
              <div className="p-4 bg-surface rounded-lg border border-border">
                <h3 className="text-lg font-bold mb-3">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {m.genres.map((genre) => (
                    <span key={genre} className="px-3 py-1 bg-gold/10 text-gold rounded-full text-sm font-medium">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {m.tags && m.tags.length > 0 && (
              <div className="p-4 bg-surface rounded-lg border border-border">
                <h3 className="text-lg font-bold mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {m.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-border text-text-secondary rounded text-xs">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="p-4 bg-surface rounded-lg border border-border space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Views</span>
                <span className="font-semibold">{(m.viewCount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Rating</span>
                <span className="font-semibold">{(m.averageRating || 0).toFixed(1)}/5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Reviews</span>
                <span className="font-semibold">{m.totalReviews || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
