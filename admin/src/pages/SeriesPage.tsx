import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Film, Plus, ChevronDown, ChevronRight, Trash2, Pencil, Upload, X } from 'lucide-react';
import { useState } from 'react';
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
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);
  const [showCreateSeason, setShowCreateSeason] = useState<string | null>(null);
  const [showBulkAdd, setShowBulkAdd] = useState<string | null>(null);
  const [showEditEpisode, setShowEditEpisode] = useState<Episode | null>(null);

  // Fetch all series content
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Series Manager</h1>
        <p className="text-sm text-text-secondary">Manage seasons &amp; episodes for your shows</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : series.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Film size={48} className="mb-4 opacity-50" />
          <p>No series found</p>
          <p className="text-sm text-text-muted mt-1">Create web series, TV shows, or anime from the Movies page first</p>
        </div>
      ) : (
        <div className="space-y-3">
          {series.map((s) => (
            <SeriesCard
              key={s._id}
              series={s}
              isExpanded={expandedSeries === s._id}
              onToggle={() => setExpandedSeries(expandedSeries === s._id ? null : s._id)}
              expandedSeason={expandedSeason}
              setExpandedSeason={setExpandedSeason}
              showCreateSeason={showCreateSeason}
              setShowCreateSeason={setShowCreateSeason}
              showBulkAdd={showBulkAdd}
              setShowBulkAdd={setShowBulkAdd}
              showEditEpisode={showEditEpisode}
              setShowEditEpisode={setShowEditEpisode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Series Card ──

function SeriesCard({
  series,
  isExpanded,
  onToggle,
  expandedSeason,
  setExpandedSeason,
  showCreateSeason,
  setShowCreateSeason,
  showBulkAdd,
  setShowBulkAdd,
  showEditEpisode,
  setShowEditEpisode,
}: {
  series: Movie;
  isExpanded: boolean;
  onToggle: () => void;
  expandedSeason: string | null;
  setExpandedSeason: (id: string | null) => void;
  showCreateSeason: string | null;
  setShowCreateSeason: (id: string | null) => void;
  showBulkAdd: string | null;
  setShowBulkAdd: (id: string | null) => void;
  showEditEpisode: Episode | null;
  setShowEditEpisode: (ep: Episode | null) => void;
}) {
  const queryClient = useQueryClient();

  const { data: seasons, refetch: refetchSeasons } = useQuery({
    queryKey: ['seasons', series._id],
    queryFn: async () => {
      const { data } = await api.get(`/series/${series._id}/seasons`);
      return data as Season[];
    },
    enabled: isExpanded,
  });

  const deleteSeason = useMutation({
    mutationFn: (id: string) => api.delete(`/series/seasons/${id}`),
    onSuccess: async () => {
      await refetchSeasons();
      toast.success('Season deleted');
    },
    onError: () => toast.error('Failed to delete season'),
  });

  const handleSeasonCreated = (createdSeason: any) => {
    // Immediately inject new season into React Query cache (synchronous, guaranteed)
    queryClient.setQueryData<Season[]>(['seasons', series._id], (old) =>
      [...(old ?? []), createdSeason]
    );
    setShowCreateSeason(null);
    if (createdSeason?._id) {
      setExpandedSeason(createdSeason._id);
      setShowBulkAdd(createdSeason._id);
    }
    // Background refetch to sync with backend
    refetchSeasons();
  };

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Series Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-surface-light transition-colors text-left"
      >
        <div className="w-16 h-20 rounded-lg overflow-hidden bg-surface-light flex-shrink-0">
          <img src={series.posterUrl || series.bannerUrl} alt={series.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{series.title}</h3>
          <p className="text-sm text-text-secondary">
            {series.contentType.replace('_', ' ')} &middot; {series.releaseYear} &middot; {series.genres?.join(', ')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <span className="text-xs bg-surface-light px-2 py-1 rounded">{seasons?.length ?? 0} seasons</span>
          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>
      </button>

      {/* Expanded: Seasons */}
      {isExpanded && (
        <div className="border-t border-border">
          <div className="p-4 flex items-center justify-between bg-surface-light/50">
            <h4 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Seasons</h4>
            <button
              onClick={() => setShowCreateSeason(series._id)}
              className="flex items-center gap-1 text-sm text-gold hover:text-gold-light"
            >
              <Plus size={16} /> Add Season
            </button>
          </div>

          {/* Create Season Form */}
          {showCreateSeason === series._id && (
            <CreateSeasonForm
              seriesId={series._id}
              nextNumber={(seasons?.length ?? 0) + 1}
              onSeasonCreated={handleSeasonCreated}
              onClose={() => setShowCreateSeason(null)}
            />
          )}

          {/* Seasons List */}
          {seasons && seasons.length > 0 ? (
            seasons.map((season) => (
              <SeasonRow
                key={season._id}
                season={season}
                isExpanded={expandedSeason === season._id}
                onToggle={() => setExpandedSeason(expandedSeason === season._id ? null : season._id)}
                onDelete={() => {
                  if (confirm('Delete this season and all its episodes?')) {
                    deleteSeason.mutate(season._id);
                  }
                }}
                showBulkAdd={showBulkAdd}
                setShowBulkAdd={setShowBulkAdd}
                showEditEpisode={showEditEpisode}
                setShowEditEpisode={setShowEditEpisode}
              />
            ))
          ) : (
            <div className="p-6 text-center text-text-muted text-sm">No seasons yet. Add one above.</div>
          )}
        </div>
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
  season, isExpanded, onToggle, onDelete, showBulkAdd, setShowBulkAdd, showEditEpisode, setShowEditEpisode,
}: {
  season: Season;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  showBulkAdd: string | null;
  setShowBulkAdd: (id: string | null) => void;
  showEditEpisode: Episode | null;
  setShowEditEpisode: (ep: Episode | null) => void;
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
                    <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded">Has Video</span>
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
        Paste one video URL per line (Google Drive links, direct URLs, etc). Each line becomes an episode, automatically numbered.
      </p>
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
