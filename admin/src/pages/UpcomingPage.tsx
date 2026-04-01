import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Check, Square, Loader2, Trash2, Calendar, Clock, Edit2, X, Compass, User } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface TmdbPreviewItem {
  tmdbId: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string;
  rating: number;
  genreNames: string[];
  originalLanguage: string;
  alreadyImported: boolean;
}

interface UpcomingMovie {
  _id: string;
  title: string;
  posterUrl?: string;
  bannerUrl?: string;
  contentType: string;
  releaseDate?: string;
  releaseYear?: number;
  genres?: string[];
  status: string;
  tmdbId?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  items: Array<{ tmdbId: number; title?: string; status: string; reason?: string }>;
}

const CONTENT_TYPES = [
  { value: 'movies', label: 'Movies' },
  { value: 'shows', label: 'TV Shows' },
  { value: 'webseries', label: 'Web Series' },
  { value: 'anime', label: 'Anime' },
];

const REGIONS = [
  { value: 'bollywood', label: 'Bollywood (Hindi)' },
  { value: 'hollywood', label: 'Hollywood (English)' },
  { value: 'korean', label: 'Korean' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'telugu', label: 'Telugu' },
  { value: 'malayalam', label: 'Malayalam' },
  { value: 'kannada', label: 'Kannada' },
  { value: 'thai', label: 'Thai' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'french', label: 'French' },
  { value: 'turkish', label: 'Turkish' },
];

const DUBBED_OPTIONS = [
  { value: '', label: 'Original Language' },
  { value: 'hi', label: 'Hindi Dubbed' },
  { value: 'en', label: 'English Dubbed' },
  { value: 'ta', label: 'Tamil Dubbed' },
  { value: 'te', label: 'Telugu Dubbed' },
];

const GENRES = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 27, name: 'Horror' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
];

interface TmdbPerson {
  id: number;
  name: string;
  profileUrl: string | null;
  knownFor: string;
}

export default function UpcomingPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'manage' | 'import'>('manage');

  // ── Import state ──
  const [contentType, setContentType] = useState('movies');
  const [region, setRegion] = useState('hollywood');
  const [count, setCount] = useState(20);
  const [dubbedLang, setDubbedLang] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [nextPage, setNextPage] = useState(1);
  const [results, setResults] = useState<TmdbPreviewItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Actor search
  const [actorQuery, setActorQuery] = useState('');
  const [actorResults, setActorResults] = useState<TmdbPerson[]>([]);
  const [selectedActors, setSelectedActors] = useState<TmdbPerson[]>([]);
  const [showActorDropdown, setShowActorDropdown] = useState(false);
  const [searchingActors, setSearchingActors] = useState(false);
  const actorSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actorDropdownRef = useRef<HTMLDivElement>(null);

  // ── Manage state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');

  // Fetch all upcoming content
  const { data: upcomingMovies = [], isLoading: loadingUpcoming } = useQuery<UpcomingMovie[]>({
    queryKey: ['upcomingMovies'],
    queryFn: async () => {
      const { data } = await api.get('/movies', { params: { status: 'upcoming', limit: 200 } });
      return data.movies || [];
    },
  });

  // Group by date
  const groupedByDate = upcomingMovies.reduce<Record<string, UpcomingMovie[]>>((acc, movie) => {
    const dateKey = movie.releaseDate
      ? new Date(movie.releaseDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
      : 'No Date Set';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(movie);
    return acc;
  }, {});

  const sortedDateKeys = Object.keys(groupedByDate).sort((a, b) => {
    if (a === 'No Date Set') return 1;
    if (b === 'No Date Set') return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Actor search
  const searchActors = async (query: string) => {
    if (!query.trim()) { setActorResults([]); setShowActorDropdown(false); return; }
    setSearchingActors(true);
    try {
      const { data } = await api.post('/tmdb/search-person', { query });
      setActorResults(data.results || []);
      setShowActorDropdown(true);
    } catch { /* ignore */ }
    setSearchingActors(false);
  };

  const handleActorQueryChange = (value: string) => {
    setActorQuery(value);
    if (actorSearchTimeout.current) clearTimeout(actorSearchTimeout.current);
    actorSearchTimeout.current = setTimeout(() => searchActors(value), 400);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actorDropdownRef.current && !actorDropdownRef.current.contains(e.target as Node)) {
        setShowActorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Discover upcoming from TMDB
  const discoverMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        contentType,
        region,
        count,
        page: nextPage,
        releaseStatus: 'upcoming',
      };
      if (selectedGenres.length > 0) body.genres = selectedGenres;
      if (selectedActors.length > 0) body.withCast = selectedActors.map((a) => a.id).join(',');
      if (dubbedLang) body.withLanguage = dubbedLang;
      const { data } = await api.post('/tmdb/discover', body);
      return data as { items: TmdbPreviewItem[]; nextPage: number };
    },
    onSuccess: (data) => {
      setResults(data.items);
      setNextPage(data.nextPage);
      setSelected(new Set());
      setImportResult(null);
      toast.success(`Found ${data.items.length} upcoming titles`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Discovery failed'),
  });

  // Import as upcoming
  const importMutation = useMutation({
    mutationFn: async (tmdbIds: number[]) => {
      const { data } = await api.post('/tmdb/import', { tmdbIds, contentType, asUpcoming: true });
      return data as ImportResult;
    },
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ['upcomingMovies'] });
      if (data.imported > 0) toast.success(`${data.imported} upcoming title(s) imported`);
      if (data.skipped > 0) toast(`${data.skipped} skipped (already exist)`);
      // Mark imported in results
      setResults((prev) =>
        prev.map((r) => {
          const result = data.items.find((i) => i.tmdbId === r.tmdbId);
          return result?.status === 'imported' ? { ...r, alreadyImported: true } : r;
        })
      );
      setSelected(new Set());
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Import failed'),
  });

  // Update release date
  const updateDateMutation = useMutation({
    mutationFn: async ({ id, releaseDate }: { id: string; releaseDate: string }) => {
      await api.patch(`/movies/${id}`, { releaseDate: new Date(releaseDate).toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcomingMovies'] });
      toast.success('Release date updated');
      setEditingId(null);
    },
    onError: () => toast.error('Failed to update'),
  });

  // Delete upcoming
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/movies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcomingMovies'] });
      toast.success('Removed');
    },
    onError: () => toast.error('Failed to delete'),
  });

  // Publish (move from upcoming to published)
  const publishMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/movies/${id}`, { status: 'published' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcomingMovies'] });
      toast.success('Moved to Published');
    },
    onError: () => toast.error('Failed to publish'),
  });

  const toggleSelect = (tmdbId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(tmdbId) ? next.delete(tmdbId) : next.add(tmdbId);
      return next;
    });
  };

  const selectAll = () => {
    const importable = results.filter((r) => !r.alreadyImported).map((r) => r.tmdbId);
    setSelected(new Set(importable));
  };

  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      movie: 'Movie', web_series: 'Web Series', tv_show: 'TV Show',
      documentary: 'Documentary', short_film: 'Short Film', anime: 'Anime',
    };
    return map[t] || t;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upcoming Content</h1>
        <p className="text-sm text-text-secondary mt-1">
          Import upcoming releases from TMDB • Manage release dates • Content appears in the Upcoming section
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-surface border border-border rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('manage')}
          className={clsx(
            'px-5 py-2.5 rounded-lg text-sm font-medium transition-colors',
            tab === 'manage' ? 'bg-gold text-background' : 'text-text-secondary hover:text-text-primary',
          )}
        >
          <Calendar size={14} className="inline mr-1.5" />
          Manage ({upcomingMovies.length})
        </button>
        <button
          onClick={() => setTab('import')}
          className={clsx(
            'px-5 py-2.5 rounded-lg text-sm font-medium transition-colors',
            tab === 'import' ? 'bg-gold text-background' : 'text-text-secondary hover:text-text-primary',
          )}
        >
          <Download size={14} className="inline mr-1.5" />
          Import from TMDB
        </button>
      </div>

      {/* ── Manage Tab ── */}
      {tab === 'manage' && (
        <div className="space-y-6">
          {loadingUpcoming ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-gold" size={24} />
            </div>
          ) : upcomingMovies.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-xl">
              <Clock size={48} className="mx-auto text-text-muted mb-4" />
              <p className="text-text-secondary">No upcoming content yet</p>
              <p className="text-sm text-text-muted mt-1">Switch to "Import from TMDB" to add upcoming titles</p>
            </div>
          ) : (
            sortedDateKeys.map((dateKey) => (
              <div key={dateKey}>
                <h2 className="text-lg font-semibold text-gold mb-3 flex items-center gap-2">
                  <Calendar size={18} />
                  {dateKey}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {groupedByDate[dateKey].map((movie) => (
                    <div
                      key={movie._id}
                      className="bg-surface border border-border rounded-xl overflow-hidden group"
                    >
                      <div className="relative aspect-[2/3]">
                        {movie.posterUrl ? (
                          <img
                            src={movie.posterUrl}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-surface-light flex items-center justify-center text-text-muted">
                            No Poster
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="font-semibold text-white text-sm truncate">{movie.title}</p>
                          <p className="text-xs text-white/70">
                            {typeLabel(movie.contentType)}
                            {movie.releaseYear ? ` • ${movie.releaseYear}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 space-y-2">
                        {/* Release date editor */}
                        {editingId === movie._id ? (
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="flex-1 bg-surface-light border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-gold"
                            />
                            <button
                              onClick={() => updateDateMutation.mutate({ id: movie._id, releaseDate: editDate })}
                              disabled={!editDate || updateDateMutation.isPending}
                              className="px-2 py-1.5 bg-gold text-background rounded-lg text-xs font-semibold disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1.5 border border-border rounded-lg text-xs text-text-secondary"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-text-secondary">
                              {movie.releaseDate
                                ? new Date(movie.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : 'No date set'}
                            </span>
                            <button
                              onClick={() => {
                                setEditingId(movie._id);
                                setEditDate(movie.releaseDate ? movie.releaseDate.slice(0, 10) : '');
                              }}
                              className="text-text-muted hover:text-gold"
                              title="Edit date"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => publishMutation.mutate(movie._id)}
                            disabled={publishMutation.isPending}
                            className="flex-1 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                          >
                            Publish
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this upcoming title?')) deleteMutation.mutate(movie._id);
                            }}
                            disabled={deleteMutation.isPending}
                            className="px-3 py-1.5 bg-error/10 text-error rounded-lg text-xs hover:bg-error/20 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Import Tab ── */}
      {tab === 'import' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Content Type</label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold"
                >
                  {CONTENT_TYPES.map((ct) => (
                    <option key={ct.value} value={ct.value}>{ct.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold"
                >
                  {REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1">Count</label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold"
                >
                  {[10, 20, 40, 60, 100, 200].map((n) => (
                    <option key={n} value={n}>{n} results</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1">Language / Dubbed</label>
                <select
                  value={dubbedLang}
                  onChange={(e) => setDubbedLang(e.target.value)}
                  className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold"
                >
                  {DUBBED_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              {/* Actor search */}
              <div className="relative" ref={actorDropdownRef}>
                <label className="block text-sm text-text-secondary mb-1">Actor Filter</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    value={actorQuery}
                    onChange={(e) => handleActorQueryChange(e.target.value)}
                    placeholder="Search actor..."
                    className="w-full bg-surface-light border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold"
                  />
                  {searchingActors && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gold" />}
                </div>
                {showActorDropdown && actorResults.length > 0 && (
                  <div className="absolute z-30 top-full mt-1 w-full bg-surface border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {actorResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (!selectedActors.find((a) => a.id === p.id)) {
                            setSelectedActors((prev) => [...prev, p]);
                          }
                          setActorQuery('');
                          setShowActorDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-light text-left"
                      >
                        {p.profileUrl ? (
                          <img src={p.profileUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-xs text-text-muted">?</div>
                        )}
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-text-muted truncate">{p.knownFor}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected actors */}
            {selectedActors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedActors.map((a) => (
                  <span key={a.id} className="flex items-center gap-1 bg-gold/10 text-gold px-3 py-1 rounded-full text-xs font-medium">
                    {a.name}
                    <button onClick={() => setSelectedActors((prev) => prev.filter((x) => x.id !== a.id))}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Genres */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">Genres</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() =>
                      setSelectedGenres((prev) =>
                        prev.includes(genre.id) ? prev.filter((g) => g !== genre.id) : [...prev, genre.id]
                      )
                    }
                    className={clsx(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      selectedGenres.includes(genre.id)
                        ? 'bg-gold/20 border-gold/40 text-gold'
                        : 'border-border text-text-secondary hover:border-gold/30'
                    )}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Discover button */}
            <button
              onClick={() => { setNextPage(1); discoverMutation.mutate(); }}
              disabled={discoverMutation.isPending}
              className="flex items-center gap-2 bg-gold hover:bg-gold-light text-background px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {discoverMutation.isPending ? (
                <><Loader2 size={16} className="animate-spin" /> Discovering...</>
              ) : (
                <><Compass size={16} /> Discover Upcoming</>
              )}
            </button>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">{results.length} results</p>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-gold hover:underline">
                    Select All
                  </button>
                  {selected.size > 0 && (
                    <button
                      onClick={() => importMutation.mutate(Array.from(selected))}
                      disabled={importMutation.isPending}
                      className="flex items-center gap-1.5 bg-gold hover:bg-gold-light text-background px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                    >
                      {importMutation.isPending ? (
                        <><Loader2 size={14} className="animate-spin" /> Importing...</>
                      ) : (
                        <><Download size={14} /> Import {selected.size} as Upcoming</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Import results banner */}
              {importResult && (
                <div className="bg-surface border border-border rounded-xl p-4">
                  <p className="text-sm font-medium">
                    ✅ {importResult.imported} imported • ⏭️ {importResult.skipped} skipped
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {results.map((item) => {
                  const isSelected = selected.has(item.tmdbId);
                  const imported = item.alreadyImported;
                  return (
                    <div
                      key={item.tmdbId}
                      onClick={() => !imported && toggleSelect(item.tmdbId)}
                      className={clsx(
                        'relative rounded-xl overflow-hidden border cursor-pointer transition-all group',
                        imported
                          ? 'opacity-50 border-border cursor-not-allowed'
                          : isSelected
                          ? 'border-gold ring-2 ring-gold/30'
                          : 'border-border hover:border-gold/40'
                      )}
                    >
                      <div className="aspect-[2/3] bg-surface-light">
                        {item.posterUrl ? (
                          <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
                            No Poster
                          </div>
                        )}
                      </div>

                      {/* Selection indicator */}
                      <div className="absolute top-2 right-2">
                        {imported ? (
                          <div className="bg-emerald-500 rounded-full p-1"><Check size={12} className="text-white" /></div>
                        ) : isSelected ? (
                          <div className="bg-gold rounded-full p-1"><Check size={12} className="text-background" /></div>
                        ) : (
                          <div className="bg-black/40 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Square size={12} className="text-white" />
                          </div>
                        )}
                      </div>

                      {/* Release date badge */}
                      {item.releaseDate && (
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-0.5">
                          <span className="text-[10px] text-white font-medium">
                            {new Date(item.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )}

                      <div className="p-2">
                        <p className="text-xs font-medium text-text-primary truncate">{item.title}</p>
                        <p className="text-[10px] text-text-muted">
                          {item.genreNames.slice(0, 2).join(', ')}
                          {item.rating > 0 ? ` • ★${item.rating.toFixed(1)}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load more */}
              <div className="flex justify-center">
                <button
                  onClick={() => discoverMutation.mutate()}
                  disabled={discoverMutation.isPending}
                  className="px-6 py-2.5 border border-border rounded-xl text-sm text-text-secondary hover:text-gold hover:border-gold/30 transition-colors"
                >
                  Load More
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
