import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, Grid3x3, List, Play, Cloud, X, Loader2, Check, Download, Film } from 'lucide-react';
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
  const [showBunnyImport, setShowBunnyImport] = useState(false);
  const [renamingMovie, setRenamingMovie] = useState<Movie | null>(null);

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
            onClick={() => setShowBunnyImport(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Cloud size={18} />
            Import from Bunny
          </button>
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
                          setRenamingMovie(movie);
                        }}
                        className="p-2 rounded-lg hover:bg-blue-500/10 text-text-secondary hover:text-blue-400 transition-colors"
                        title="Rename"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/movies/${movie._id}/edit`);
                        }}
                        className="p-2 rounded-lg hover:bg-surface-light text-text-secondary hover:text-text-primary transition-colors"
                        title="Edit Details"
                      >
                        <Eye size={14} />
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
                              onClick={() => setRenamingMovie(movie)}
                              className="p-1.5 rounded-lg hover:bg-blue-500/10 text-text-secondary hover:text-blue-400 transition-colors"
                              title="Rename"
                            >
                              <Pencil size={15} />
                            </button>
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
                              title="Edit Details"
                            >
                              <Film size={15} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this content?')) {
                                  deleteMutation.mutate(movie._id);
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                              title="Delete"
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

      {/* Bunny Stream Import Modal */}
      {showBunnyImport && (
        <BunnyMovieImportModal
          onClose={() => { setShowBunnyImport(false); queryClient.invalidateQueries({ queryKey: ['movies'] }); }}
        />
      )}

      {/* Rename Movie Modal */}
      {renamingMovie && (
        <RenameMovieModal
          movie={renamingMovie}
          onClose={() => setRenamingMovie(null)}
          onSaved={() => {
            setRenamingMovie(null);
            queryClient.invalidateQueries({ queryKey: ['movies'] });
          }}
        />
      )}
    </div>
  );
}

// ── Rename Movie Modal ──

function RenameMovieModal({ movie, onClose, onSaved }: { movie: Movie; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(movie.title);
  const [alternateTitle, setAlternateTitle] = useState(movie.alternateTitle || '');

  const renameMutation = useMutation({
    mutationFn: () => api.patch(`/movies/${movie._id}`, { title, alternateTitle: alternateTitle || undefined }),
    onSuccess: () => { toast.success('Movie renamed'); onSaved(); },
    onError: () => toast.error('Failed to rename movie'),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Rename Movie</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-muted font-medium mb-1 block">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-text-muted font-medium mb-1 block">Display Name / Alternate Title</label>
            <input
              value={alternateTitle}
              onChange={(e) => setAlternateTitle(e.target.value)}
              placeholder="Optional alternate display name"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-lg">Cancel</button>
          <button
            onClick={() => renameMutation.mutate()}
            disabled={!title.trim() || renameMutation.isPending}
            className="px-4 py-2 text-sm bg-gold text-background font-medium rounded-lg hover:bg-gold-light disabled:opacity-50"
          >
            {renameMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bunny Movie Import Modal ──

interface BunnyVideo {
  guid: string;
  title: string;
  status: number;
  length: number;
  storageSize: number;
  availableResolutions: string;
  thumbnailFileName: string;
}

function BunnyMovieImportModal({ onClose }: { onClose: () => void }) {
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<BunnyVideo | null>(null);
  const [customTitle, setCustomTitle] = useState('');

  // Fetch collections
  const { data: collections, isLoading: loadingCollections } = useQuery({
    queryKey: ['bunny-collections'],
    queryFn: async () => {
      const { data } = await api.get('/bunny/stream/collections');
      return data as { totalItems: number; items: { guid: string; name: string; videoCount: number }[] };
    },
  });

  // Fetch videos in selected collection
  const { data: videos, isLoading: loadingVideos } = useQuery({
    queryKey: ['bunny-collection-videos', selectedCollection],
    queryFn: async () => {
      const { data } = await api.get(`/bunny/stream/collections/${selectedCollection}/videos`);
      return data as { totalItems: number; items: BunnyVideo[] };
    },
    enabled: !!selectedCollection,
  });

  // Import single movie mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVideo) throw new Error('No video selected');
      const { data } = await api.post('/bunny/stream/movie/import-bunny', {
        videoId: selectedVideo.guid,
        collectionId: selectedCollection,
        title: customTitle.trim() || undefined,
      });
      return data as { movieId: string; title: string; hlsUrl: string; status: string };
    },
    onSuccess: (data) => {
      toast.success(`Movie "${data.title}" imported (${data.status})`);
      setSelectedVideo(null);
      setCustomTitle('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Import failed'),
  });

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const statusLabel = (s: number) => {
    const map: Record<number, string> = { 0: 'Created', 1: 'Uploaded', 2: 'Processing', 3: 'Transcoding', 4: 'Finished', 5: 'Error', 6: 'Upload Failed' };
    return map[s] || 'Unknown';
  };

  const statusColor = (s: number) => {
    if (s === 4) return 'text-green-400 bg-green-400/10';
    if (s === 5 || s === 6) return 'text-red-400 bg-red-400/10';
    return 'text-yellow-400 bg-yellow-400/10';
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Cloud size={20} className="text-purple-400" /> Import Movie from Bunny Stream
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={18} /></button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Step 1: Select Collection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Step 1: Select Collection</label>
            {loadingCollections ? (
              <div className="flex items-center gap-2 text-sm text-text-muted py-2"><Loader2 size={14} className="animate-spin" /> Loading collections...</div>
            ) : (
              <select
                value={selectedCollection}
                onChange={(e) => { setSelectedCollection(e.target.value); setSelectedVideo(null); }}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
              >
                <option value="">-- Select a collection --</option>
                {collections?.items?.map((c) => (
                  <option key={c.guid} value={c.guid}>{c.name} ({c.videoCount} videos)</option>
                ))}
              </select>
            )}
          </div>

          {/* Step 2: Select a Single Movie */}
          {selectedCollection && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Step 2: Select a Movie</label>
              {loadingVideos ? (
                <div className="flex items-center gap-2 text-sm text-text-muted py-2"><Loader2 size={14} className="animate-spin" /> Loading videos...</div>
              ) : videos?.items && videos.items.length > 0 ? (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {videos.items.map((video) => (
                    <div
                      key={video.guid}
                      onClick={() => { setSelectedVideo(video); setCustomTitle(video.title); }}
                      className={clsx(
                        'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border',
                        selectedVideo?.guid === video.guid
                          ? 'border-purple-400 bg-purple-400/10 shadow-sm'
                          : 'border-border hover:border-purple-400/40 hover:bg-surface-light/50'
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="w-20 h-12 rounded-lg overflow-hidden bg-surface-light flex-shrink-0">
                        <img
                          src={`https://vz-f3b830f6-306.b-cdn.net/${video.guid}/${video.thumbnailFileName || 'thumbnail.jpg'}`}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{video.title}</p>
                        <p className="text-xs text-text-muted">
                          {video.length > 0 && formatDuration(video.length)} · {formatSize(video.storageSize)}
                          {video.availableResolutions && ` · ${video.availableResolutions}`}
                        </p>
                      </div>
                      {/* Status */}
                      <span className={clsx('text-[10px] px-2 py-0.5 rounded font-medium', statusColor(video.status))}>
                        {statusLabel(video.status)}
                      </span>
                      {/* Selection indicator */}
                      {selectedVideo?.guid === video.guid && (
                        <Check size={16} className="text-purple-400 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted py-4 text-center">No videos in this collection</p>
              )}
            </div>
          )}

          {/* Step 3: Customize title and import */}
          {selectedVideo && (
            <div className="space-y-3 border-t border-border pt-4">
              <label className="text-sm font-medium text-text-secondary">Step 3: Import Movie</label>
              <div>
                <label className="text-xs text-text-muted font-medium mb-1 block">Movie Title</label>
                <input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                  placeholder="Enter movie title..."
                />
              </div>
              <button
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {importMutation.isPending ? (
                  <><Loader2 size={14} className="animate-spin" /> Importing...</>
                ) : (
                  <><Download size={14} /> Import This Movie</>
                )}
              </button>
              {importMutation.isSuccess && importMutation.data && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2 text-sm text-green-400">
                  <Check size={16} />
                  <span>Movie &quot;{importMutation.data.title}&quot; {importMutation.data.status === 'created' ? 'created as draft' : 'updated'} successfully!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-lg">Close</button>
        </div>
      </div>
    </div>
  );
}
