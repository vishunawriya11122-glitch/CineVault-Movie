import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import api from '../lib/api';
import type { Movie } from '../types';
import { useNavigate } from 'react-router-dom';

export default function AnimePage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['anime'],
    queryFn: async () => {
      const { data } = await api.get('/movies?contentType=anime');
      return data;
    },
  });

  const animeList: Movie[] = data?.movies ?? data?.data ?? data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles size={24} className="text-gold" /> Anime
        </h1>
        <button
          onClick={() => navigate('/movies/new?section=anime')}
          className="flex items-center gap-2 bg-gold hover:bg-gold-light text-background px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          + Add Anime
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : animeList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Sparkles size={48} className="mb-4 opacity-50" />
          <p>No anime found</p>
          <p className="text-sm text-text-muted mt-1">Add anime content from the Movies page or click "Add Anime"</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {animeList.map((anime) => (
            <div
              key={anime._id}
              onClick={() => navigate(`/movies/${anime._id}/edit`)}
              className="group cursor-pointer bg-surface border border-border rounded-xl overflow-hidden hover:border-gold/40 transition-all"
            >
              <div className="aspect-[2/3] relative overflow-hidden">
                <img
                  src={anime.posterUrl || anime.bannerUrl}
                  alt={anime.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{anime.title}</h3>
                  <p className="text-xs text-text-muted mt-1">{anime.releaseYear}</p>
                </div>
                <div className="absolute top-2 right-2">
                  <span className="bg-gold/90 text-background text-[10px] font-bold px-1.5 py-0.5 rounded">
                    ★ {(anime.averageRating ?? anime.rating ?? 0).toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="px-3 py-2 flex items-center justify-between text-xs text-text-muted">
                <span>{anime.genres?.slice(0, 2).join(', ')}</span>
                <span
                  className={
                    anime.status === 'published'
                      ? 'text-success'
                      : anime.status === 'draft'
                        ? 'text-warning'
                        : 'text-text-muted'
                  }
                >
                  {anime.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
