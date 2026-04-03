import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Trophy, TrendingUp, Star, Save, RefreshCw, Search, ArrowUp, ArrowDown } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

type RankType = 'download' | 'rating';

interface RankedMovie {
  _id: string;
  title: string;
  posterUrl?: string;
  contentType: string;
  genres?: string[];
  releaseYear?: number;
  rating?: number;
  starRating?: number;
  viewCount?: number;
  popularityScore?: number;
  videoQuality?: string;
}

const CONTENT_TYPES = [
  { value: '', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'web_series', label: 'TV Shows' },
  { value: 'tv_show', label: 'Reality Shows' },
  { value: 'anime', label: 'Anime' },
];

export default function RankingPage() {
  const queryClient = useQueryClient();
  const [rankType, setRankType] = useState<RankType>('download');
  const [contentType, setContentType] = useState('');
  const [genre, setGenre] = useState('');
  const [limit, setLimit] = useState(50);
  const [editedScores, setEditedScores] = useState<Record<string, { popularity?: number; star?: number }>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const { data: ranking = [], isLoading, refetch } = useQuery({
    queryKey: ['ranking', rankType, contentType, genre, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('type', rankType);
      params.set('limit', String(limit));
      if (contentType) params.set('contentType', contentType);
      if (genre) params.set('genre', genre);
      const { data } = await api.get(`/search/ranking?${params}`);
      return data as RankedMovie[];
    },
  });

  const { data: genres = [] } = useQuery({
    queryKey: ['genres'],
    queryFn: async () => {
      const { data } = await api.get('/search/genres');
      return data as string[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, number> }) => {
      await api.patch(`/movies/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking'] });
      toast.success('Score updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  const handleSaveAll = async () => {
    const entries = Object.entries(editedScores);
    if (entries.length === 0) return toast('No changes to save');
    let ok = 0;
    for (const [id, scores] of entries) {
      const updates: Record<string, number> = {};
      if (scores.popularity !== undefined) updates.popularityScore = scores.popularity;
      if (scores.star !== undefined) updates.starRating = scores.star;
      try {
        await api.patch(`/movies/${id}`, updates);
        ok++;
      } catch { /* skip */ }
    }
    setEditedScores({});
    queryClient.invalidateQueries({ queryKey: ['ranking'] });
    toast.success(`Updated ${ok} items`);
  };

  const handleBoost = (movie: RankedMovie, field: 'popularityScore' | 'starRating', delta: number) => {
    const current = field === 'popularityScore'
      ? (editedScores[movie._id]?.popularity ?? movie.popularityScore ?? 0)
      : (editedScores[movie._id]?.star ?? movie.starRating ?? 0);
    const newVal = Math.max(0, current + delta);
    setEditedScores((prev) => ({
      ...prev,
      [movie._id]: {
        ...prev[movie._id],
        ...(field === 'popularityScore' ? { popularity: newVal } : { star: newVal }),
      },
    }));
  };

  const filtered = searchQuery
    ? ranking.filter((m) => m.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : ranking;

  const hasChanges = Object.keys(editedScores).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h1 className="text-2xl font-bold text-white">Ranking Management</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          {hasChanges && (
            <button
              onClick={handleSaveAll}
              className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save All ({Object.keys(editedScores).length})
            </button>
          )}
        </div>
      </div>

      {/* Rank Type Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setRankType('download')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
            rankType === 'download'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white',
          )}
        >
          <TrendingUp className="w-4 h-4" /> Download Rank
        </button>
        <button
          onClick={() => setRankType('rating')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
            rankType === 'rating'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white',
          )}
        >
          <Star className="w-4 h-4" /> Rating Rank
        </button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search in ranking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm w-64 focus:outline-none focus:border-purple-500"
          />
        </div>
        <select
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
        >
          {CONTENT_TYPES.map((ct) => (
            <option key={ct.value} value={ct.value}>{ct.label}</option>
          ))}
        </select>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
        >
          <option value="">All Genres</option>
          {genres.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
        >
          <option value={20}>Top 20</option>
          <option value={50}>Top 50</option>
          <option value={100}>Top 100</option>
        </select>
      </div>

      {/* Ranking Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-sm">
              <th className="px-4 py-3 text-left w-12">#</th>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left w-24">Type</th>
              <th className="px-4 py-3 text-left w-20">Year</th>
              <th className="px-4 py-3 text-center w-36">
                {rankType === 'download' ? 'Popularity Score' : 'Star Rating'}
              </th>
              <th className="px-4 py-3 text-center w-28">Views</th>
              <th className="px-4 py-3 text-center w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">Loading rankings...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No results found</td></tr>
            ) : (
              filtered.map((movie, idx) => {
                const isEdited = !!editedScores[movie._id];
                const displayScore = rankType === 'download'
                  ? (editedScores[movie._id]?.popularity ?? movie.popularityScore ?? 0)
                  : (editedScores[movie._id]?.star ?? movie.starRating ?? 0);
                const isTop3 = idx < 3;
                const medalColor = idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : 'text-gray-500';

                return (
                  <tr
                    key={movie._id}
                    className={clsx(
                      'border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors',
                      isEdited && 'bg-purple-900/20',
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className={clsx('font-bold text-lg', medalColor)}>
                        {isTop3 ? ['🥇', '🥈', '🥉'][idx] : idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {movie.posterUrl ? (
                          <img
                            src={movie.posterUrl}
                            alt={movie.title}
                            className="w-10 h-14 rounded object-cover bg-gray-800"
                          />
                        ) : (
                          <div className="w-10 h-14 rounded bg-gray-800 flex items-center justify-center text-gray-600 text-xs">N/A</div>
                        )}
                        <div>
                          <p className="text-white font-medium text-sm">{movie.title}</p>
                          <p className="text-gray-500 text-xs">{movie.genres?.slice(0, 2).join(', ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-300">{movie.contentType}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{movie.releaseYear || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx(
                        'font-mono font-bold',
                        isEdited ? 'text-yellow-400' : 'text-white',
                      )}>
                        {rankType === 'rating' ? displayScore.toFixed(1) : displayScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400 text-sm">
                      {(movie.viewCount ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleBoost(movie, rankType === 'download' ? 'popularityScore' : 'starRating', rankType === 'download' ? 10 : 0.5)}
                          className="p-1.5 bg-green-900/50 text-green-400 rounded hover:bg-green-800/60"
                          title="Boost up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleBoost(movie, rankType === 'download' ? 'popularityScore' : 'starRating', rankType === 'download' ? -10 : -0.5)}
                          className="p-1.5 bg-red-900/50 text-red-400 rounded hover:bg-red-800/60"
                          title="Reduce"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        {isEdited && (
                          <button
                            onClick={() => {
                              updateMutation.mutate({
                                id: movie._id,
                                updates: {
                                  ...(editedScores[movie._id]?.popularity !== undefined && { popularityScore: editedScores[movie._id]!.popularity! }),
                                  ...(editedScores[movie._id]?.star !== undefined && { starRating: editedScores[movie._id]!.star! }),
                                },
                              });
                              setEditedScores((prev) => {
                                const next = { ...prev };
                                delete next[movie._id];
                                return next;
                              });
                            }}
                            className="p-1.5 bg-yellow-600/30 text-yellow-400 rounded hover:bg-yellow-600/50"
                            title="Save this item"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="text-gray-500 text-xs text-center">
        Rankings are auto-calculated from popularity scores & view counts (download) or star ratings (rating).
        Use the arrows to manually boost or reduce a title's ranking position.
      </div>
    </div>
  );
}
