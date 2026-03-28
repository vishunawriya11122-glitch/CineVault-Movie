import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Pencil, Trash2 } from 'lucide-react';
import api from '../lib/api';
import type { Movie } from '../types';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AnimePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['anime'],
    queryFn: async () => {
      const { data } = await api.get('/movies?contentType=anime');
      return data;
    },
  });

  const animeList: Movie[] = data?.movies ?? data?.data ?? data ?? [];

  const deleteAnime = useMutation({
    mutationFn: (id: string) => api.delete(`/movies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anime'] });
      toast.success('Anime deleted');
    },
    onError: () => toast.error('Failed to delete anime'),
  });

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
              className="group cursor-pointer bg-surface border border-border rounded-xl overflow-hidden hover:border-gold/40 transition-all"
              onClick={() => navigate(`/movies/${anime._id}/edit?section=anime`)}
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
              <div className="px-2 py-2 flex items-center justify-between text-xs text-text-muted border-t border-border">
                <span className="pl-1">{anime.genres?.slice(0, 2).join(', ')}</span>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate(`/movies/${anime._id}/edit?section=anime`)}
                    className="p-1.5 rounded-lg hover:bg-surface-light text-text-secondary hover:text-gold transition-colors"
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${anime.title}"?`)) deleteAnime.mutate(anime._id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
