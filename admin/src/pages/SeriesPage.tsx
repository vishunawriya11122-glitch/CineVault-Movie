import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Film, Plus, ChevronDown, ChevronRight, Trash2, Pencil, Upload, X, Layers, FolderInput, Loader2, Check, AlertTriangle, Cloud, RefreshCw, Zap } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { Movie } from '../types';
import toast from 'react-hot-toast';

interface Season {
  _id: string;
  seriesId: string;
  seasonNumber: number;
  title: string;
  synopsis?: string;
  posterUrl?: string;
  releaseYear?: number;
  episodeCount: number;
}

interface Episode {
  _id: string;
  seasonId: string;
  episodeNumber: number;
  title: string;
  synopsis?: string;
  duration?: number;
  thumbnailUrl?: string;
  streamingSources: { quality: string; url: string; label: string }[];
}

export default function SeriesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // selectedSeries = card clicked to manage; null = show grid only
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);
  const [showCreateSeason, setShowCreateSeason] = useState<string | null>(null);
  const [showBulkAdd, setShowBulkAdd] = useState<string | null>(null);
  const [showEditEpisode, setShowEditEpisode] = useState<Episode | null>(null);
  const [showBunnyStream, setShowBunnyStream] = useState<string | null>(null);
  const [showFolderImport, setShowFolderImport] = useState(false);

  // Fetch all series content (web_series + tv_show + anime — anime web series are stored as contentType='anime')
  const { data, isLoading } = useQuery({
    queryKey: ['series-list'],
    queryFn: async () => {
      const types = ['web_series', 'tv_show', 'anime'];
      const results = await Promise.all(
        types.map((t) => api.get(`/movies?contentType=${t}&limit=100`).then((r) => r.data))
      );
      const all: Movie[] = [];
      results.forEach((r) => {
        const movies = r?.movies ?? r?.data ?? r ?? [];
        all.push(...movies);
      });
      return all;
    },
  });

  const series: Movie[] = data ?? [];
  const activeSeries = series.find((s) => s._id === selectedSeries) ?? null;

  const deleteSeries = useMutation({
    mutationFn: (id: string) => api.delete(`/movies/${id}`),
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['series-list'] });
      if (selectedSeries === deletedId) setSelectedSeries(null);
      toast.success('Series deleted');
    },
    onError: () => toast.error('Failed to delete series'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Series</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFolderImport(true)}
            className="flex items-center gap-2 bg-surface-light hover:bg-surface text-text-primary border border-border px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <FolderInput size={18} /> Folder Import
          </button>
          <button
            onClick={() => navigate('/movies/new?section=series')}
            className="flex items-center gap-2 bg-gold hover:bg-gold-light text-background px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={18} /> Add Series
          </button>
        </div>
      </div>

      {/* ── Series Cards Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : series.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Film size={48} className="mb-4 opacity-50" />
          <p>No series found</p>
          <p className="text-sm text-text-muted mt-1">Click "Add Series" to create your first web series or TV show</p>
          <button
            onClick={() => navigate('/movies/new?section=series')}
            className="mt-4 flex items-center gap-2 bg-gold hover:bg-gold-light text-background px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Add Series
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {series.map((s) => (
            <div
              key={s._id}
              className={`group relative bg-surface border rounded-xl overflow-hidden transition-all cursor-pointer ${
                selectedSeries === s._id
                  ? 'border-gold shadow-lg shadow-gold/20'
                  : 'border-border hover:border-gold/40'
              }`}
              onClick={() => setSelectedSeries(selectedSeries === s._id ? null : s._id)}
            >
              <div className="aspect-[2/3] relative overflow-hidden">
                <img
                  src={s.posterUrl || s.bannerUrl}
                  alt={s.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{s.title}</h3>
                  <p className="text-xs text-text-muted mt-0.5">{s.releaseYear} · {s.contentType.replace('_', ' ')}</p>
                </div>
                {selectedSeries === s._id && (
                  <div className="absolute top-2 left-2 bg-gold text-background text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Layers size={10} /> Managing
                  </div>
                )}
              </div>
              <div className="px-2 py-2 flex items-center justify-end gap-1 border-t border-border bg-surface">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/movies/${s._id}/edit?section=${s.contentType === 'anime' ? 'anime' : 'series'}`); }}
                  className="p-1.5 rounded-lg hover:bg-surface-light text-text-secondary hover:text-gold transition-colors"
                  title="Edit series"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${s.title}" and all its seasons/episodes?`)) {
                      deleteSeries.mutate(s._id);
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                  title="Delete series"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Inline Series Manager (shown when a card is selected) ── */}
      {activeSeries && (
        <div className="bg-surface border border-gold/30 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-4 p-4 border-b border-border bg-surface-light/50">
            <div className="w-12 h-16 rounded-lg overflow-hidden bg-surface-light flex-shrink-0">
              <img src={activeSeries.posterUrl || activeSeries.bannerUrl} alt={activeSeries.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg truncate flex items-center gap-2">
                <Layers size={18} className="text-gold" /> {activeSeries.title} — Season Manager
              </h2>
              <p className="text-sm text-text-secondary">{activeSeries.contentType.replace('_', ' ')} · {activeSeries.releaseYear}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/movies/${activeSeries._id}/edit?section=${activeSeries.contentType === 'anime' ? 'anime' : 'series'}`)}
                className="flex items-center gap-1.5 text-sm text-gold hover:text-gold-light px-3 py-1.5 rounded-lg border border-gold/30 hover:border-gold transition-colors"
              >
                <Pencil size={14} /> Edit
              </button>
              <button onClick={() => setSelectedSeries(null)} className="p-1.5 text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
          </div>
          <SeriesManager
            series={activeSeries}
            expandedSeason={expandedSeason}
            setExpandedSeason={setExpandedSeason}
            showCreateSeason={showCreateSeason}
            setShowCreateSeason={setShowCreateSeason}
            showBulkAdd={showBulkAdd}
            setShowBulkAdd={setShowBulkAdd}
            showEditEpisode={showEditEpisode}
            setShowEditEpisode={setShowEditEpisode}
            showBunnyStream={showBunnyStream}
            setShowBunnyStream={setShowBunnyStream}
          />
        </div>
      )}

      {/* Folder Import Modal */}
      {showFolderImport && (
        <FolderImportModal
          series={series}
          onClose={() => { setShowFolderImport(false); queryClient.invalidateQueries({ queryKey: ['series-list'] }); }}
        />
      )}
    </div>
  );
}

// ── Series Manager (inline season/episode manager) ──

function SeriesManager({
  series,
  expandedSeason,
  setExpandedSeason,
  showCreateSeason,
  setShowCreateSeason,
  showBulkAdd,
  setShowBulkAdd,
  showEditEpisode,
  setShowEditEpisode,
  showBunnyStream,
  setShowBunnyStream,
}: {
  series: Movie;
  expandedSeason: string | null;
  setExpandedSeason: (id: string | null) => void;
  showCreateSeason: string | null;
  setShowCreateSeason: (id: string | null) => void;
  showBulkAdd: string | null;
  setShowBulkAdd: (id: string | null) => void;
  showEditEpisode: Episode | null;
  setShowEditEpisode: (ep: Episode | null) => void;
  showBunnyStream: string | null;
  setShowBunnyStream: (id: string | null) => void;
}) {
  const [localSeasons, setLocalSeasons] = useState<Season[]>([]);

  const { data: fetchedSeasons, refetch: refetchSeasons } = useQuery({
    queryKey: ['seasons', series._id],
    queryFn: async () => {
      const { data } = await api.get(`/series/${series._id}/seasons`);
      return data as Season[];
    },
  });

  const seasons = useMemo(() => {
    const fromServer = fetchedSeasons ?? [];
    const newOnes = localSeasons.filter((ls) => !fromServer.some((s) => s._id === ls._id));
    return [...fromServer, ...newOnes];
  }, [fetchedSeasons, localSeasons]);

  const deleteSeason = useMutation({
    mutationFn: (id: string) => api.delete(`/series/seasons/${id}`),
    onSuccess: async (_data, deletedId) => {
      setLocalSeasons((prev) => prev.filter((s) => s._id !== deletedId));
      await refetchSeasons();
      toast.success('Season deleted');
    },
    onError: () => toast.error('Failed to delete season'),
  });

  const handleSeasonCreated = useCallback(
    (createdSeason: Season) => {
      setLocalSeasons((prev) => [...prev, createdSeason]);
      setShowCreateSeason(null);
      if (createdSeason?._id) {
        setExpandedSeason(createdSeason._id);
        setShowBulkAdd(createdSeason._id);
      }
      refetchSeasons();
    },
    [refetchSeasons, setShowCreateSeason, setExpandedSeason, setShowBulkAdd],
  );

  return (
    <div>
      <div className="p-4 flex items-center justify-between bg-surface-light/30">
        <h4 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
          Seasons ({seasons.length})
        </h4>
        <button
          onClick={() => setShowCreateSeason(series._id)}
          className="flex items-center gap-1 text-sm text-gold hover:text-gold-light"
        >
          <Plus size={16} /> Add Season
        </button>
      </div>

      {showCreateSeason === series._id && (
        <CreateSeasonForm
          seriesId={series._id}
          nextNumber={(seasons.length ?? 0) + 1}
          onSeasonCreated={handleSeasonCreated}
          onClose={() => setShowCreateSeason(null)}
        />
      )}

      {seasons.length === 0 ? (
        <div className="p-8 text-center text-text-muted text-sm">No seasons yet. Add one above.</div>
      ) : (
        seasons.map((season) => (
          <SeasonRow
            key={season._id}
            season={season}
            isExpanded={expandedSeason === season._id}
            onToggle={() => setExpandedSeason(expandedSeason === season._id ? null : season._id)}
            onDelete={() => {
              if (confirm('Delete this season and all its episodes?')) deleteSeason.mutate(season._id);
            }}
            showBulkAdd={showBulkAdd}
            setShowBulkAdd={setShowBulkAdd}
            showEditEpisode={showEditEpisode}
            setShowEditEpisode={setShowEditEpisode}
            showBunnyStream={showBunnyStream}
            setShowBunnyStream={setShowBunnyStream}
          />
        ))
      )}
    </div>
  );
}

// ── Create Season Form ──

function CreateSeasonForm({ seriesId, nextNumber, onSeasonCreated, onClose }: {
  seriesId: string;
  nextNumber: number;
  onSeasonCreated: (createdSeason: any) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ seasonNumber: nextNumber, title: `Season ${nextNumber}`, synopsis: '' });

  const create = useMutation({
    mutationFn: () => api.post(`/series/${seriesId}/seasons`, form),
    onSuccess: (response) => {
      console.log('=== Season API response ===');
      console.log('response.data:', JSON.stringify(response.data, null, 2));
      console.log('response.status:', response.status);
      toast.success('Season created');
      onSeasonCreated(response.data);
    },
    onError: (err: any) => {
      console.error('Season creation failed:', err?.response?.data || err);
      toast.error(err?.response?.data?.message || 'Failed to create season');
    },
  });

  return (
    <div className="p-4 bg-background border-b border-border space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="font-medium">New Season</h5>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <input
          type="number"
          value={form.seasonNumber}
          onChange={(e) => setForm({ ...form, seasonNumber: parseInt(e.target.value) || 1 })}
          placeholder="Season #"
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
        />
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Season title"
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm col-span-2"
        />
      </div>
      <input
        value={form.synopsis}
        onChange={(e) => setForm({ ...form, synopsis: e.target.value })}
        placeholder="Synopsis (optional)"
        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm"
      />
      <button
        onClick={() => create.mutate()}
        disabled={create.isPending}
        className="bg-gold text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold-light disabled:opacity-50"
      >
        {create.isPending ? 'Creating...' : 'Create Season'}
      </button>
    </div>
  );
}

// ── Season Row ──

function SeasonRow({
  season, isExpanded, onToggle, onDelete, showBulkAdd, setShowBulkAdd, showEditEpisode, setShowEditEpisode, showBunnyStream, setShowBunnyStream,
}: {
  season: Season;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  showBulkAdd: string | null;
  setShowBulkAdd: (id: string | null) => void;
  showEditEpisode: Episode | null;
  setShowEditEpisode: (ep: Episode | null) => void;
  showBunnyStream: string | null;
  setShowBunnyStream: (id: string | null) => void;
}) {
  const queryClient = useQueryClient();

  const { data: episodes } = useQuery({
    queryKey: ['episodes', season._id],
    queryFn: async () => {
      const { data } = await api.get(`/series/seasons/${season._id}/episodes`);
      return data as Episode[];
    },
    enabled: isExpanded,
  });

  const deleteEpisode = useMutation({
    mutationFn: (id: string) => api.delete(`/series/episodes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes', season._id] });
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast.success('Episode deleted');
    },
    onError: () => toast.error('Failed to delete episode'),
  });

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Season Header */}
      <div className="flex items-center gap-3 px-6 py-3 hover:bg-surface-light/30 transition-colors">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 text-left">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-medium">Season {season.seasonNumber}</span>
          {season.title && season.title !== `Season ${season.seasonNumber}` && (
            <span className="text-text-secondary text-sm">— {season.title}</span>
          )}
          <span className="text-xs text-text-muted ml-2">{season.episodeCount} episodes</span>
        </button>
        <button
          onClick={() => setShowBunnyStream(showBunnyStream === season._id ? null : season._id)}
          className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 px-2 py-1 rounded bg-purple-400/10"
        >
          <Cloud size={14} /> Bunny Stream
        </button>
        <button
          onClick={() => setShowBulkAdd(showBulkAdd === season._id ? null : season._id)}
          className="flex items-center gap-1 text-xs text-gold hover:text-gold-light px-2 py-1 rounded bg-gold/10"
        >
          <Upload size={14} /> Bulk Add
        </button>
        <button onClick={onDelete} className="text-red-400 hover:text-red-300 p-1">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Bulk Add Form */}
      {showBulkAdd === season._id && (
        <BulkAddForm seasonId={season._id} onClose={() => setShowBulkAdd(null)} />
      )}

      {/* Bunny Stream Panel */}
      {showBunnyStream === season._id && (
        <BunnyStreamPanel seasonId={season._id} onClose={() => setShowBunnyStream(null)} />
      )}

      {/* Episodes List */}
      {isExpanded && episodes && (
        <div className="px-6 pb-3">
          {episodes.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">No episodes yet. Use &quot;Bulk Add&quot; to add episodes.</p>
          ) : (
            <div className="space-y-1">
              {episodes.map((ep) => (
                <div
                  key={ep._id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-light/40 group transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-24 h-14 rounded-md overflow-hidden bg-surface-light flex-shrink-0 relative">
                    {ep.thumbnailUrl ? (
                      <img src={ep.thumbnailUrl} alt={ep.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted">
                        <Film size={20} />
                      </div>
                    )}
                    <div className="absolute bottom-1 left-1 bg-black/70 text-[10px] px-1 rounded">
                      E{String(ep.episodeNumber).padStart(2, '0')}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ep.title}</p>
                    <p className="text-xs text-text-muted truncate">
                      {ep.duration ? `${ep.duration} min` : 'No duration'}
                      {ep.streamingSources?.length > 0 && ` · ${ep.streamingSources.length} source${ep.streamingSources.length > 1 ? 's' : ''}`}
                    </p>
                  </div>

                  {/* URL indicator */}
                  {ep.streamingSources?.length > 0 && (
                    ep.streamingSources.some((s) => s.url?.includes('playlist.m3u8')) ? (
                      <span className="text-[10px] text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded flex items-center gap-1">
                        <Zap size={10} /> HLS
                      </span>
                    ) : (
                      <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded">Has Video</span>
                    )
                  )}

                  {/* Actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button
                      onClick={() => setShowEditEpisode(ep)}
                      className="p-1 text-text-secondary hover:text-text-primary"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete Episode ${ep.episodeNumber}?`)) {
                          deleteEpisode.mutate(ep._id);
                        }
                      }}
                      className="p-1 text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Episode Modal */}
      {showEditEpisode && episodes?.some((e) => e._id === showEditEpisode._id) && (
        <EditEpisodeForm episode={showEditEpisode} seasonId={season._id} onClose={() => setShowEditEpisode(null)} />
      )}
    </div>
  );
}

// ── Bulk Add Form ──

function BulkAddForm({ seasonId, onClose }: { seasonId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [urls, setUrls] = useState('');
  const [titlePrefix, setTitlePrefix] = useState('Episode');

  const bulkCreate = useMutation({
    mutationFn: async () => {
      const lines = urls
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length === 0) throw new Error('No URLs provided');

      const episodes = lines.map((url, i) => {
        // Try to extract episode info from filename
        const filename = decodeURIComponent(url.split('/').pop()?.split('?')[0] || '');
        const epMatch = filename.match(/[Ee](?:pisode)?[\s._-]*(\d+)/i);

        const title = epMatch
          ? `${titlePrefix} ${parseInt(epMatch[1])}`
          : `${titlePrefix} ${i + 1}`;

        return {
          title,
          streamingSources: [{ quality: 'original', url, label: 'Original' }],
        };
      });

      return api.post(`/series/seasons/${seasonId}/episodes/bulk`, { episodes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      const count = urls.split('\n').filter((l) => l.trim()).length;
      toast.success(`${count} episode${count > 1 ? 's' : ''} added`);
      onClose();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to add episodes'),
  });

  return (
    <div className="px-6 py-4 bg-background border-b border-border space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="font-medium text-sm flex items-center gap-2">
          <Upload size={16} className="text-gold" /> Bulk Add Episodes
        </h5>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
      </div>
      <p className="text-xs text-text-muted">
        Paste one video URL per line. Each line becomes an episode, automatically numbered.
      </p>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-xs text-green-400">
        <span>✓</span>
        <span>Google Drive links are <strong>automatically converted</strong> to streaming URLs. Just paste the share link — no manual conversion needed.</span>
      </div>
      <div className="flex gap-3">
        <input
          value={titlePrefix}
          onChange={(e) => setTitlePrefix(e.target.value)}
          placeholder="Title prefix"
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm w-40"
        />
        <span className="self-center text-xs text-text-muted">e.g. &quot;Episode&quot; → Episode 1, Episode 2…</span>
      </div>
      <textarea
        value={urls}
        onChange={(e) => setUrls(e.target.value)}
        placeholder={"https://drive.google.com/file/d/.../view\nhttps://drive.google.com/file/d/.../view\nhttps://example.com/episode3.mp4"}
        rows={8}
        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono resize-y"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">
          {urls.split('\n').filter((l) => l.trim()).length} episode(s) to add
          {urls.includes('drive.google.com') && <span className="ml-2 text-green-400">• Drive links detected — will auto-convert</span>}
        </span>
        <button
          onClick={() => bulkCreate.mutate()}
          disabled={bulkCreate.isPending || !urls.trim()}
          className="bg-gold text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold-light disabled:opacity-50"
        >
          {bulkCreate.isPending ? 'Adding...' : 'Add All Episodes'}
        </button>
      </div>
    </div>
  );
}

// ── Edit Episode Form ──

function EditEpisodeForm({ episode, seasonId, onClose }: { episode: Episode; seasonId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: episode.title,
    synopsis: episode.synopsis || '',
    duration: episode.duration ?? '',
    thumbnailUrl: episode.thumbnailUrl || '',
    streamingUrl: episode.streamingSources?.[0]?.url || '',
  });

  const update = useMutation({
    mutationFn: () =>
      api.patch(`/series/episodes/${episode._id}`, {
        title: form.title,
        synopsis: form.synopsis || undefined,
        duration: form.duration ? Number(form.duration) : undefined,
        thumbnailUrl: form.thumbnailUrl || undefined,
        streamingSources: form.streamingUrl
          ? [{ quality: 'original', url: form.streamingUrl, label: 'Original' }]
          : episode.streamingSources,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes', seasonId] });
      toast.success('Episode updated');
      onClose();
    },
    onError: () => toast.error('Failed to update'),
  });

  return (
    <div className="px-6 py-4 bg-background border-b border-border space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="font-medium text-sm">Edit Episode {episode.episodeNumber}</h5>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Title"
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
        />
        <input
          value={form.duration}
          onChange={(e) => setForm({ ...form, duration: e.target.value })}
          placeholder="Duration (min)"
          type="number"
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <input
        value={form.streamingUrl}
        onChange={(e) => setForm({ ...form, streamingUrl: e.target.value })}
        placeholder="Video URL (Google Drive / Direct)"
        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono"
      />
      {form.streamingUrl.includes('drive.google.com') && (
        <p className="text-xs text-green-400">✓ Google Drive link detected — will be auto-converted to streaming URL on save</p>
      )}
      <input
        value={form.thumbnailUrl}
        onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
        placeholder="Thumbnail URL (optional)"
        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm"
      />
      <input
        value={form.synopsis}
        onChange={(e) => setForm({ ...form, synopsis: e.target.value })}
        placeholder="Synopsis (optional)"
        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
        <button
          onClick={() => update.mutate()}
          disabled={update.isPending}
          className="bg-gold text-black px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gold-light disabled:opacity-50"
        >
          {update.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ── Bunny Stream Panel (import/migrate/status for a season) ──

function BunnyStreamPanel({ seasonId, onClose }: { seasonId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [folderUrl, setFolderUrl] = useState('');
  const [tab, setTab] = useState<'import' | 'migrate' | 'status'>('import');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Import from Drive folder to Bunny Stream
  const importMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/bunny/stream/season/${seasonId}/import-folder`, { folderUrl });
      return data as { jobId: string; message: string };
    },
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      toast.success(data.message || 'Import started');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Import failed'),
  });

  // Migrate existing episodes to Bunny Stream
  const migrateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/bunny/stream/season/${seasonId}/migrate`);
      return data as { jobId: string; message: string };
    },
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      toast.success(data.message || 'Migration started');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Migration failed'),
  });

  // Poll job progress
  const { data: jobProgress } = useQuery({
    queryKey: ['bunny-job', activeJobId],
    queryFn: async () => {
      const { data } = await api.get(`/bunny/stream/progress?jobId=${activeJobId}`);
      return data as { jobId: string; total: number; uploaded: number; transcoding: number; completed: number; failed: number; current: string[]; running: boolean; results: any[] } | null;
    },
    enabled: !!activeJobId,
    refetchInterval: activeJobId ? 2000 : false,
  });

  // Stop polling when job completes
  useEffect(() => {
    if (jobProgress && !jobProgress.running && activeJobId) {
      queryClient.invalidateQueries({ queryKey: ['episodes', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    }
  }, [jobProgress?.running, activeJobId, queryClient, seasonId]);

  // Poll transcoding status
  const { data: transcodingStatus, refetch: refetchTranscoding } = useQuery({
    queryKey: ['bunny-transcoding', seasonId],
    queryFn: async () => {
      const { data } = await api.get(`/bunny/stream/season/${seasonId}/status`);
      return data as { total: number; finished: number; processing: number; failed: number; episodes: { episodeNumber: number; status: number; encodeProgress: number; resolutions: string }[] };
    },
    enabled: tab === 'status',
    refetchInterval: tab === 'status' ? 10000 : false,
  });

  const statusLabel = (s: number) => {
    const map: Record<number, string> = { 0: 'Created', 1: 'Uploaded', 2: 'Processing', 3: 'Transcoding', 4: 'Finished', 5: 'Error', 6: 'Upload Failed', [-1]: 'No HLS' };
    return map[s] || 'Unknown';
  };
  const statusColor = (s: number) => {
    if (s === 4) return 'text-green-400';
    if (s === 5 || s === 6 || s === -1) return 'text-red-400';
    return 'text-yellow-400';
  };

  const progress = jobProgress;
  const progressPct = progress && progress.total > 0 ? ((progress.uploaded + progress.failed) / progress.total) * 100 : 0;

  return (
    <div className="px-6 py-4 bg-background border-b border-border space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="font-medium text-sm flex items-center gap-2">
          <Cloud size={16} className="text-purple-400" /> Bunny Stream
        </h5>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-lg p-1">
        {(['import', 'migrate', 'status'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors font-medium ${
              tab === t ? 'bg-purple-500/20 text-purple-400' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {t === 'import' ? 'Import Folder' : t === 'migrate' ? 'Migrate Existing' : 'Transcoding Status'}
          </button>
        ))}
      </div>

      {/* Import Tab */}
      {tab === 'import' && (
        <div className="space-y-3">
          <p className="text-xs text-text-muted">
            Paste a Google Drive folder link. All video files will be uploaded to Bunny Stream <strong>in parallel</strong> with automatic multi-resolution transcoding (1080p, 720p, 480p, 360p, 240p).
          </p>
          <div className="flex gap-2">
            <input
              value={folderUrl}
              onChange={(e) => setFolderUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono"
            />
            <button
              onClick={() => importMutation.mutate()}
              disabled={!folderUrl.trim() || importMutation.isPending || !!progress?.running}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 whitespace-nowrap"
            >
              {importMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
              Import to Bunny
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300">
            <Zap size={14} />
            <span>5 episodes upload simultaneously. Auto-detected, uploaded to Bunny Stream, and transcoded to <strong>HLS adaptive streaming</strong>.</span>
          </div>
        </div>
      )}

      {/* Migrate Tab */}
      {tab === 'migrate' && (
        <div className="space-y-3">
          <p className="text-xs text-text-muted">
            Re-upload all existing episodes in this season to Bunny Stream <strong>in parallel</strong>. Current video URLs will be fetched and transcoded into HLS adaptive streaming.
          </p>
          <button
            onClick={() => migrateMutation.mutate()}
            disabled={migrateMutation.isPending || !!progress?.running}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {migrateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Migrate All Episodes to Bunny Stream
          </button>
        </div>
      )}

      {/* Status Tab */}
      {tab === 'status' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">Transcoding progress for all episodes in this season.</p>
            <button onClick={() => refetchTranscoding()} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
          {transcodingStatus ? (
            <>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-surface rounded-lg p-2 text-center">
                  <div className="text-lg font-bold">{transcodingStatus.total}</div>
                  <div className="text-[10px] text-text-muted">Total</div>
                </div>
                <div className="bg-surface rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-green-400">{transcodingStatus.finished}</div>
                  <div className="text-[10px] text-text-muted">Finished</div>
                </div>
                <div className="bg-surface rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-yellow-400">{transcodingStatus.processing}</div>
                  <div className="text-[10px] text-text-muted">Processing</div>
                </div>
                <div className="bg-surface rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-red-400">{transcodingStatus.failed}</div>
                  <div className="text-[10px] text-text-muted">Failed</div>
                </div>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {transcodingStatus.episodes.map((ep) => (
                  <div key={ep.episodeNumber} className="flex items-center gap-3 px-3 py-1.5 rounded bg-surface text-sm">
                    <span className="text-text-muted w-8">E{String(ep.episodeNumber).padStart(2, '0')}</span>
                    <div className="flex-1">
                      {ep.status >= 1 && ep.status <= 3 && (
                        <div className="w-full bg-surface-light rounded-full h-1.5">
                          <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${ep.encodeProgress}%` }} />
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-medium ${statusColor(ep.status)}`}>{statusLabel(ep.status)}</span>
                    {ep.encodeProgress > 0 && ep.status !== 4 && (
                      <span className="text-xs text-text-muted">{ep.encodeProgress}%</span>
                    )}
                    {ep.resolutions && <span className="text-[10px] text-purple-400">{ep.resolutions}</span>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-4 text-center text-text-muted text-sm">Loading...</div>
          )}
        </div>
      )}

      {/* Progress Bar (shown during import/migration) */}
      {progress?.running && (
        <div className="bg-surface rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-purple-400 font-medium">
              {progress.current?.length > 0 ? progress.current.join(' · ') : 'Starting...'}
            </span>
            <span className="text-text-muted">
              {progress.uploaded}/{progress.total} uploaded
              {progress.failed > 0 && <span className="text-red-400 ml-1">({progress.failed} failed)</span>}
            </span>
          </div>
          <div className="w-full bg-surface-light rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-[10px] text-text-muted">Processing 5 episodes in parallel</div>
        </div>
      )}

      {/* Completed results */}
      {progress && !progress.running && progress.results?.length > 0 && (
        <div className="bg-surface rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-green-400">
              Complete: {progress.uploaded}/{progress.total} succeeded
            </span>
            <span className="text-xs text-text-muted">
              {progress.failed > 0 && <span className="text-red-400">{progress.failed} failed</span>}
            </span>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {progress.results.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {r.status === 'success' ? (
                  <Check size={12} className="text-green-400" />
                ) : (
                  <AlertTriangle size={12} className="text-red-400" />
                )}
                <span className="truncate">{r.title}</span>
                {r.error && <span className="text-red-400 truncate">{r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Folder Import Modal ──

interface ScannedEpisode {
  fileId: string;
  fileName: string;
  episodeNumber: number;
  title: string;
  streamUrl: string;
  thumbnailUrl: string;
}

interface ScannedSeason {
  seasonNumber: number;
  folderName?: string;
  folderId?: string;
  episodes: ScannedEpisode[];
}

interface ScanResult {
  totalFiles: number;
  seasons: ScannedSeason[];
}

function FolderImportModal({
  series,
  onClose,
}: {
  series: Movie[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [folderUrl, setFolderUrl] = useState('');
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [uploadToBunny, setUploadToBunny] = useState(true);
  const [bunnyJobId, setBunnyJobId] = useState<string | null>(null);

  const scanMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/gdrive-folder/scan', { folderUrl });
      return data as ScanResult;
    },
    onSuccess: (data) => {
      setScanResult(data);
      toast.success(`Found ${data.totalFiles} video files in ${data.seasons.length} season(s)`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to scan folder');
    },
  });

  // DB-only import (old flow)
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSeriesId || !scanResult) throw new Error('Select a series first');
      const { data } = await api.post('/gdrive-folder/import', {
        seriesId: selectedSeriesId,
        scanResult,
      });
      return data as { seasonsCreated: number; episodesCreated: number };
    },
    onSuccess: (data) => {
      toast.success(
        `Imported ${data.seasonsCreated} season(s) with ${data.episodesCreated} episode(s)`,
      );
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Import failed');
    },
  });

  // Full pipeline: scan + create DB entries + upload to Bunny Stream
  const fullImportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSeriesId) throw new Error('Select a series first');
      const { data } = await api.post(`/bunny/stream/series/${selectedSeriesId}/import`, {
        folderUrl,
      });
      return data as { jobId: string; message: string };
    },
    onSuccess: (data) => {
      setBunnyJobId(data.jobId);
      toast.success(data.message || 'Full pipeline started');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Full import failed');
    },
  });

  // Poll Bunny job progress
  const { data: bunnyProgress } = useQuery({
    queryKey: ['bunny-full-import', bunnyJobId],
    queryFn: async () => {
      const { data } = await api.get(`/bunny/stream/progress?jobId=${bunnyJobId}`);
      return data as { jobId: string; label: string; total: number; uploaded: number; transcoding: number; completed: number; failed: number; current: string[]; running: boolean; results: any[] } | null;
    },
    enabled: !!bunnyJobId,
    refetchInterval: bunnyJobId ? 2000 : false,
  });

  useEffect(() => {
    if (bunnyProgress && !bunnyProgress.running && bunnyJobId) {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
    }
  }, [bunnyProgress?.running, bunnyJobId, queryClient]);

  const bunnyPct = bunnyProgress && bunnyProgress.total > 0 ? ((bunnyProgress.uploaded + bunnyProgress.failed) / bunnyProgress.total) * 100 : 0;

  const seriesOptions = series.filter((s) =>
    ['web_series', 'tv_show', 'anime'].includes(s.contentType),
  );

  const handleImport = () => {
    if (uploadToBunny) {
      fullImportMutation.mutate();
    } else {
      importMutation.mutate();
    }
  };

  const isImporting = importMutation.isPending || fullImportMutation.isPending || bunnyProgress?.running;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FolderInput size={20} className="text-gold" />
              Google Drive Folder Import
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              Paste a public Drive folder link to auto-detect all episodes
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Step 1: Folder URL */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              1. Google Drive Folder Link
            </label>
            <div className="flex gap-2">
              <input
                value={folderUrl}
                onChange={(e) => { setFolderUrl(e.target.value); setScanResult(null); setBunnyJobId(null); }}
                placeholder="https://drive.google.com/drive/folders/..."
                className="flex-1 bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-gold"
              />
              <button
                onClick={() => scanMutation.mutate()}
                disabled={!folderUrl.trim() || scanMutation.isPending}
                className="flex items-center gap-2 bg-gold hover:bg-gold-light text-background px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {scanMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FolderInput size={16} />
                )}
                {scanMutation.isPending ? 'Scanning...' : 'Scan Folder'}
              </button>
            </div>
            <p className="text-xs text-text-muted">
              The folder must be shared as &quot;Anyone with the link&quot;. Subfolders are treated as seasons.
            </p>
          </div>

          {/* Scan Results */}
          {scanResult && (
            <>
              {/* Summary */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
                <Check size={20} className="text-green-500 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-green-400">
                    Found {scanResult.totalFiles} episodes in {scanResult.seasons.length} season(s)
                  </p>
                  <p className="text-text-secondary mt-0.5">
                    Drive links will be auto-converted to streaming URLs with thumbnails.
                  </p>
                </div>
              </div>

              {/* Season/Episode Preview */}
              <div className="space-y-3">
                <label className="block text-sm font-medium">Detected Structure</label>
                {scanResult.seasons.map((season) => (
                  <div key={season.seasonNumber} className="border border-border rounded-xl overflow-hidden">
                    <div className="bg-surface-light px-4 py-2.5 flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Season {season.seasonNumber}
                        {season.folderName && season.folderName !== `Season ${season.seasonNumber}` && (
                          <span className="text-text-secondary ml-1">— {season.folderName}</span>
                        )}
                      </span>
                      <span className="text-xs text-text-muted">{season.episodes.length} episodes</span>
                    </div>
                    <div className="divide-y divide-border max-h-48 overflow-y-auto">
                      {season.episodes.map((ep) => (
                        <div
                          key={ep.fileId}
                          className="px-4 py-2 flex items-center gap-3 text-sm"
                        >
                          <div className="w-16 h-10 rounded bg-surface-light overflow-hidden flex-shrink-0">
                            <img
                              src={ep.thumbnailUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                          <span className="text-text-muted w-8 text-xs">E{String(ep.episodeNumber).padStart(2, '0')}</span>
                          <span className="flex-1 truncate">{ep.title}</span>
                          <span className="text-xs text-text-muted truncate max-w-40">{ep.fileName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Step 2: Select Series */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  2. Import Into Series
                </label>
                {seriesOptions.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-xl p-3">
                    <AlertTriangle size={16} />
                    No series found. Create one first using &quot;Add Series&quot;.
                  </div>
                ) : (
                  <select
                    value={selectedSeriesId}
                    onChange={(e) => setSelectedSeriesId(e.target.value)}
                    className="w-full bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
                  >
                    <option value="">Select a series...</option>
                    {seriesOptions.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.title} ({s.contentType.replace('_', ' ')}, {s.releaseYear})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Upload to Bunny Stream Toggle */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">3. Upload Options</label>
                <button
                  onClick={() => setUploadToBunny(!uploadToBunny)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    uploadToBunny
                      ? 'border-purple-500/50 bg-purple-500/10'
                      : 'border-border bg-surface-light hover:bg-surface'
                  }`}
                >
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${uploadToBunny ? 'bg-purple-500' : 'bg-surface'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${uploadToBunny ? 'left-5' : 'left-0.5'}`} />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <Cloud size={14} className={uploadToBunny ? 'text-purple-400' : 'text-text-muted'} />
                      Upload to Bunny Stream
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      {uploadToBunny
                        ? 'Full pipeline: Create DB entries + upload all episodes to Bunny Stream in parallel with HLS transcoding (1080p-240p)'
                        : 'DB only: Create seasons & episodes with Google Drive links (no Bunny Stream upload)'}
                    </p>
                  </div>
                  {uploadToBunny && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-medium">RECOMMENDED</span>
                  )}
                </button>
              </div>

              {/* Import Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleImport}
                  disabled={!selectedSeriesId || !!isImporting}
                  className={`flex items-center gap-2 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                    uploadToBunny
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isImporting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : uploadToBunny ? (
                    <Cloud size={18} />
                  ) : (
                    <Upload size={18} />
                  )}
                  {isImporting
                    ? 'Processing...'
                    : uploadToBunny
                      ? `Import & Upload ${scanResult.totalFiles} Episodes to Bunny`
                      : `Import ${scanResult.totalFiles} Episodes`}
                </button>
              </div>
            </>
          )}

          {/* Bunny pipeline progress */}
          {bunnyProgress?.running && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-purple-400 flex items-center gap-2">
                  <Cloud size={14} /> {bunnyProgress.label || 'Uploading to Bunny Stream...'}
                </span>
                <span className="text-xs text-text-muted">
                  {bunnyProgress.uploaded}/{bunnyProgress.total} uploaded
                </span>
              </div>
              <div className="w-full bg-surface rounded-full h-2.5">
                <div className="bg-purple-500 h-2.5 rounded-full transition-all" style={{ width: `${bunnyPct}%` }} />
              </div>
              {bunnyProgress.current?.length > 0 && (
                <div className="text-xs text-text-muted">
                  Now: {bunnyProgress.current.join(' · ')}
                </div>
              )}
              <div className="flex gap-4 text-xs text-text-muted">
                <span>Transcoding: {bunnyProgress.transcoding}</span>
                {bunnyProgress.failed > 0 && <span className="text-red-400">Failed: {bunnyProgress.failed}</span>}
              </div>
            </div>
          )}

          {/* Bunny pipeline completed */}
          {bunnyProgress && !bunnyProgress.running && bunnyProgress.results?.length > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Check size={16} className="text-green-400" />
                <span className="text-sm font-medium text-green-400">
                  Pipeline complete: {bunnyProgress.uploaded}/{bunnyProgress.total} uploaded to Bunny Stream
                </span>
              </div>
              {bunnyProgress.failed > 0 && (
                <p className="text-xs text-red-400">{bunnyProgress.failed} episode(s) failed</p>
              )}
              <div className="max-h-32 overflow-y-auto space-y-1">
                {bunnyProgress.results.map((r: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {r.status === 'success' ? (
                      <Check size={12} className="text-green-400" />
                    ) : (
                      <AlertTriangle size={12} className="text-red-400" />
                    )}
                    <span className="truncate">{r.title}</span>
                    {r.error && <span className="text-red-400 truncate">{r.error}</span>}
                  </div>
                ))}
              </div>
              <button
                onClick={onClose}
                className="text-xs text-purple-400 hover:text-purple-300 underline"
              >
                Close and view series
              </button>
            </div>
          )}

          {/* Scanning state */}
          {scanMutation.isPending && (
            <div className="py-8 text-center">
              <Loader2 size={32} className="mx-auto text-gold animate-spin mb-3" />
              <p className="text-sm text-text-secondary">Scanning folder contents...</p>
              <p className="text-xs text-text-muted mt-1">This may take a moment for folders with many subfolders</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
