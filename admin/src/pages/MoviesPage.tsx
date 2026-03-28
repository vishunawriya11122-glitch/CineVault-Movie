import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, Grid3x3, List, Play } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/api';
import type { Movie } from '../types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function MoviesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');

  const { data, isLoading } = useQuery({
    queryKey: ['movies', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      // Movies page only shows movie content type
      params.set('contentType', 'movie');
      const { data } = await api.get(`/movies?${params}`);
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/movies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      toast.success('Content deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const movies: Movie[] = data?.movies ?? data?.data ?? data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold">Movies</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-2 bg-surface-light rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                'p-2 rounded transition-colors',
                viewMode === 'grid'
                  ? 'bg-gold text-background'
                  : 'text-text-secondary hover:text-text-primary'
              )}
              title="Grid View"
            >
              <Grid3x3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={clsx(
                'p-2 rounded transition-colors',
                viewMode === 'table'
                  ? 'bg-gold text-background'
                  : 'text-text-secondary hover:text-text-primary'
              )}
              title="Table View"
            >
              <List size={18} />
            </button>
          </div>
          <button
            onClick={() => navigate('/movies/new?section=movie')}
            className="flex items-center gap-2 bg-gold hover:bg-gold-light text-background px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={18} />
            Add Movie
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-surface-light border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-video rounded-lg bg-surface-light animate-pulse" />
                <div className="h-4 bg-surface-light rounded animate-pulse" />
                <div className="h-4 bg-surface-light rounded animate-pulse w-2/3" />
              </div>
            ))
          ) : movies.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-text-secondary">No content found</p>
            </div>
          ) : (
            movies.map((movie) => (
              <div
                key={movie._id}
                className="group cursor-pointer"
                onClick={() => navigate(`/movies/${movie._id}`)}
              >
                {/* Movie Card */}
                <div className="rounded-lg overflow-hidden bg-surface border border-border transition-all duration-300 group-hover:border-gold group-hover:shadow-lg group-hover:shadow-gold/20">
                  {/* Poster */}
                  <div className="relative aspect-video bg-surface-light overflow-hidden">
                    <img
                      src={movie.bannerUrl || movie.posterUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 rounded-full bg-gold flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play size={24} className="text-background fill-background ml-1" />
                        </div>
                      </div>
                    </div>
                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          movie.status === 'published' && 'bg-success/90 text-background',
                          movie.status === 'draft' && 'bg-warning/90 text-background',
                          movie.status === 'archived' && 'bg-text-muted/90 text-background',
                        )}
                      >
                        {movie.status}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-sm truncate group-hover:text-gold transition-colors">
                        {movie.title}
                      </h3>
                      <p className="text-xs text-text-secondary mt-1">
                        {movie.genres.slice(0, 2).join(', ')}
                      </p>
                    </div>

                    {/* Rating & Year */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gold font-semibold">
                        {(movie.averageRating ?? 0).toFixed(1)}/5
                      </span>
                      <span className="text-text-secondary">{movie.releaseYear}</span>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/movies/${movie._id}`);
                        }}
                        className="flex-1 px-2 py-2 text-xs bg-gold hover:bg-gold-light text-background font-semibold rounded-lg transition-colors"
                      >
                        Watch Now
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/movies/${movie._id}/edit`);
                        }}
                        className="p-2 rounded-lg hover:bg-surface-light text-text-secondary hover:text-text-primary transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this content?')) {
                            deleteMutation.mutate(movie._id);
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-light border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Year</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Rating</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Views</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="h-4 bg-surface-light rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : movies.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-text-secondary">
                        No content found
                      </td>
                    </tr>
                  ) : (
                    movies.map((movie) => (
                      <tr key={movie._id} className="border-b border-border hover:bg-surface-light/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 cursor-pointer hover:text-gold transition-colors"
                            onClick={() => navigate(`/movies/${movie._id}`)}
                          >
                            <img
                              src={movie.posterUrl}
                              alt={movie.title}
                              className="w-10 h-14 object-cover rounded"
                            />
                            <div>
                              <p className="font-medium">{movie.title}</p>
                              <p className="text-xs text-text-muted">{movie.genres.join(', ')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize">{movie.contentType}</td>
                        <td className="px-4 py-3">{movie.releaseYear}</td>
                        <td className="px-4 py-3">
                          <span className="text-gold">{(movie.averageRating ?? 0).toFixed(1)}</span>
                        </td>
                        <td className="px-4 py-3">{(movie.viewCount ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded-full text-xs font-medium',
                              movie.status === 'published' && 'bg-success/10 text-success',
                              movie.status === 'draft' && 'bg-warning/10 text-warning',
                              movie.status === 'archived' && 'bg-text-muted/10 text-text-muted',
                            )}
                          >
                            {movie.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => navigate(`/movies/${movie._id}`)}
                              className="p-1.5 rounded-lg hover:bg-gold/10 text-text-secondary hover:text-gold transition-colors"
                              title="Watch/View"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => navigate(`/movies/${movie._id}/edit`)}
                              className="p-1.5 rounded-lg hover:bg-surface-light text-text-secondary hover:text-text-primary transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this content?')) {
                                  deleteMutation.mutate(movie._id);
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-surface-light text-text-secondary disabled:opacity-30 hover:text-text-primary transition-colors text-sm"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-text-secondary">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={movies.length < 20}
              className="px-3 py-1.5 rounded-lg bg-surface-light text-text-secondary disabled:opacity-30 hover:text-text-primary transition-colors text-sm"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
