// OTT Platform Filter v2
import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Search, Download, Check, CheckSquare, Square, Loader2, AlertCircle, X, Compass, User } from 'lucide-react';
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
  { value: 'chinese', label: 'Chinese' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'telugu', label: 'Telugu' },
  { value: 'malayalam', label: 'Malayalam' },
  { value: 'kannada', label: 'Kannada' },
  { value: 'thai', label: 'Thai' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'french', label: 'French' },
  { value: 'turkish', label: 'Turkish' },
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
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
];

const DUBBED_OPTIONS = [
  { value: '', label: 'Original Language' },
  { value: 'hi', label: 'Hindi Dubbed' },
  { value: 'en', label: 'English' },
  { value: 'ta', label: 'Tamil Dubbed' },
  { value: 'te', label: 'Telugu Dubbed' },
];

const OTT_PLATFORMS = [
  { label: 'All Platforms', providerId: '', watchRegion: 'IN' },
  { label: '🎬 Netflix', providerId: '8', watchRegion: 'IN' },
  { label: '🌟 Jio Hotstar / Disney+', providerId: '122', watchRegion: 'IN' },
  { label: '📦 Amazon Prime Video', providerId: '119', watchRegion: 'IN' },
  { label: '🎭 Max (HBO)', providerId: '1899', watchRegion: 'US' },
  { label: '🌸 Crunchyroll', providerId: '283', watchRegion: 'US' },
  { label: '📺 SonyLIV', providerId: '237', watchRegion: 'IN' },
  { label: '📡 ZEE5', providerId: '232', watchRegion: 'IN' },
  { label: '🍎 Apple TV+', providerId: '350', watchRegion: 'US' },
  { label: '✨ Disney+', providerId: '337', watchRegion: 'US' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1979 }, (_, i) => currentYear - i);

interface TmdbPerson {
  id: number;
  name: string;
  profileUrl: string | null;
  knownFor: string;
}

export default function TmdbImportPage() {
  const [mode, setMode] = useState<'search' | 'discover'>('search');
  const [contentType, setContentType] = useState<string>('movies');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPage, setSearchPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [searchOttPlatform, setSearchOttPlatform] = useState('');
  const [searchDubbed, setSearchDubbed] = useState('');

  // Discover state
  const [region, setRegion] = useState<string>('bollywood');
  const [count, setCount] = useState<number>(20);
  const [year, setYear] = useState<string>('');
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [dubbed, setDubbed] = useState<string>('');
  const [ottPlatform, setOttPlatform] = useState<string>('');
  const [nextPage, setNextPage] = useState<number>(1);

  // Actor search state
  const [actorQuery, setActorQuery] = useState('');
  const [actorResults, setActorResults] = useState<TmdbPerson[]>([]);
  const [selectedActors, setSelectedActors] = useState<TmdbPerson[]>([]);
  const [showActorDropdown, setShowActorDropdown] = useState(false);
  const [searchingActors, setSearchingActors] = useState(false);
  const actorSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actorDropdownRef = useRef<HTMLDivElement>(null);

  // Shared state
  const [results, setResults] = useState<TmdbPreviewItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async (page: number) => {
      const selectedPlatform = OTT_PLATFORMS.find((p) => p.providerId === searchOttPlatform);
      const body: any = { query: searchQuery, contentType, page };
      if (searchOttPlatform && selectedPlatform) {
        body.watchProviders = selectedPlatform.providerId;
        body.watchRegion = selectedPlatform.watchRegion;
      }
      if (searchDubbed) {
        body.withOriginalLanguage = searchDubbed;
      }
      const { data } = await api.post('/tmdb/search', body);
      return data as { items: TmdbPreviewItem[]; nextPage: number; totalResults: number };
    },
    onSuccess: (data, page) => {
      if (page === 1) {
        setResults(data.items);
      } else {
        setResults((prev) => [...prev, ...data.items]);
      }
      setSearchPage(data.nextPage);
      setTotalResults(data.totalResults);
      setSelected(new Set());
      setImportResult(null);
      toast.success(`Found ${data.totalResults} results`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Search failed');
    },
  });

  // Actor search with debounce
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

  const addActor = (person: TmdbPerson) => {
    if (!selectedActors.find((a) => a.id === person.id)) {
      setSelectedActors((prev) => [...prev, person]);
    }
    setActorQuery('');
    setActorResults([]);
    setShowActorDropdown(false);
  };

  const removeActor = (personId: number) => {
    setSelectedActors((prev) => prev.filter((a) => a.id !== personId));
  };

  // Close actor dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actorDropdownRef.current && !actorDropdownRef.current.contains(e.target as Node)) {
        setShowActorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Discover mutation
  const discoverMutation = useMutation({
    mutationFn: async () => {
      const body: any = { contentType, region, count, page: nextPage };
      if (year) body.year = Number(year);
      if (selectedGenres.length > 0) body.genres = selectedGenres;
      if (dubbed) body.withLanguage = dubbed;
      if (selectedActors.length > 0) body.withCast = selectedActors.map((a) => a.id).join(',');
      if (ottPlatform) {
        const selectedPlatform = OTT_PLATFORMS.find((p) => p.providerId === ottPlatform);
        if (selectedPlatform) {
          body.withWatchProviders = selectedPlatform.providerId;
          body.watchRegion = selectedPlatform.watchRegion;
        }
      }
      const { data } = await api.post('/tmdb/discover', body);
      return data as { items: TmdbPreviewItem[]; nextPage: number };
    },
    onSuccess: (data) => {
      setResults(data.items);
      setNextPage(data.nextPage);
      setSelected(new Set());
      setImportResult(null);
      toast.success(`Found ${data.items.length} results`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to fetch from TMDB');
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const tmdbIds = Array.from(selected);
      const { data } = await api.post('/tmdb/import', { tmdbIds, contentType });
      return data as ImportResult;
    },
    onSuccess: (data) => {
      setImportResult(data);
      toast.success(`Imported ${data.imported} items, skipped ${data.skipped}`);
      setResults((prev) =>
        prev.map((item) => {
          const result = data.items.find((r) => r.tmdbId === item.tmdbId);
          if (result?.status === 'imported') return { ...item, alreadyImported: true };
          return item;
        }),
      );
      setSelected(new Set());
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Import failed');
    },
  });

  const isLoading = searchMutation.isPending || discoverMutation.isPending;
  const selectableItems = results.filter((r) => !r.alreadyImported);
  const allSelected = selectableItems.length > 0 && selectableItems.every((r) => selected.has(r.tmdbId));

  const toggleSelect = (tmdbId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tmdbId)) next.delete(tmdbId);
      else next.add(tmdbId);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(selectableItems.map((r) => r.tmdbId)));
  };

  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);
  };

  const resetPage = () => setNextPage(1);

  const switchMode = (m: 'search' | 'discover') => {
    setMode(m);
    setResults([]);
    setSelected(new Set());
    setImportResult(null);
    setSearchOttPlatform('');
    setSearchDubbed('');
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchPage(1);
    searchMutation.mutate(1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">TMDB Import</h1>

      {/* Mode Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit">
        <button
          onClick={() => switchMode('search')}
          className={clsx(
            'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
            mode === 'search'
              ? 'bg-gold text-background shadow-sm'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-light',
          )}
        >
          <Search size={16} /> Search
        </button>
        <button
          onClick={() => switchMode('discover')}
          className={clsx(
            'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
            mode === 'discover'
              ? 'bg-gold text-background shadow-sm'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-light',
          )}
        >
          <Compass size={16} /> Discover
        </button>
      </div>

      {/* ══════════ SEARCH MODE ══════════ */}
      {mode === 'search' && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-sm text-text-secondary mb-1.5">Search TMDB</label>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type movie, show, or anime name..."
                  className="flex-1 bg-surface-light border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!searchQuery.trim() || searchMutation.isPending}
                  className="flex items-center gap-2 bg-gold hover:bg-gold-light text-background px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {searchMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  Search
                </button>
              </form>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Content Type</label>
              <select
                value={contentType}
                onChange={(e) => { setContentType(e.target.value); setResults([]); }}
                className="w-full bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold"
              >
                {CONTENT_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>{ct.label}</option>
                ))}
              </select>
            </div>
          </div>
          {totalResults > 0 && results.length > 0 && (
            <p className="text-xs text-text-muted">
              Showing {results.length} of {totalResults} results
              {searchOttPlatform && (
                <span className="ml-2 text-gold font-medium">
                  · Filtered by {OTT_PLATFORMS.find((p) => p.providerId === searchOttPlatform)?.label}
                </span>
              )}
            </p>
          )}

          {/* OTT Platform Selection */}
          <div className="border border-gold/20 bg-gold/5 rounded-xl p-4">
            <p className="text-sm font-semibold text-gold mb-3">🎬 Filter by OTT Platform <span className="font-normal text-text-muted">(optional — filter results by platform availability)</span></p>
            <div className="flex flex-wrap gap-2">
              {OTT_PLATFORMS.map((platform) => (
                <button
                  key={platform.providerId}
                  onClick={() => setSearchOttPlatform(platform.providerId)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                    searchOttPlatform === platform.providerId
                      ? 'bg-gold text-background border-gold shadow-sm'
                      : 'bg-surface-light text-text-secondary border-border hover:border-gold/50 hover:text-text-primary',
                  )}
                >
                  {platform.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language filter */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Hindi Dub / Language</label>
            <select
              value={searchDubbed}
              onChange={(e) => setSearchDubbed(e.target.value)}
              className="w-full bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold"
            >
              <option value="">All Languages</option>
              <option value="hi">Hindi (Bollywood)</option>
              <option value="en">English (Hollywood)</option>
              <option value="ta">Tamil</option>
              <option value="te">Telugu</option>
              <option value="ko">Korean</option>
              <option value="ja">Japanese (Anime)</option>
            </select>
          </div>
        </div>
      )}

      {/* ══════════ DISCOVER MODE ══════════ */}
      {mode === 'discover' && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          {/* OTT Platform Selection */}
          <div className="border border-gold/20 bg-gold/5 rounded-xl p-4">
            <p className="text-sm font-semibold text-gold mb-3">🎬 Filter by OTT Platform <span className="font-normal text-text-muted">(optional)</span></p>
            <div className="flex flex-wrap gap-2">
              {OTT_PLATFORMS.map((platform) => (
                <button
                  key={platform.providerId}
                  onClick={() => { setOttPlatform(platform.providerId); resetPage(); }}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                    ottPlatform === platform.providerId
                      ? 'bg-gold text-background border-gold shadow-sm'
                      : 'bg-surface-light text-text-secondary border-border hover:border-gold/50 hover:text-text-primary',
                  )}
                >
                  {platform.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 1: Content Type, Region, Year, Count */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Content Type</label>
              <select
                value={contentType}
                onChange={(e) => { setContentType(e.target.value); resetPage(); }}
                className="w-full bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold"
              >
                {CONTENT_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>{ct.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Region</label>
              <select
                value={region}
                onChange={(e) => { setRegion(e.target.value); resetPage(); }}
                className="w-full bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold"
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Year</label>
              <select
                value={year}
                onChange={(e) => { setYear(e.target.value); resetPage(); }}
                className="w-full bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold"
              >
                <option value="">All Years</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Count</label>
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => { setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1))); resetPage(); }}
                className="w-full bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold"
                placeholder="e.g. 10"
              />
            </div>
          </div>

          {/* Row 2: Language / Dubbed + Actor Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Hindi Dub / Language</label>
              <select
                value={dubbed}
                onChange={(e) => { setDubbed(e.target.value); resetPage(); }}
                className="w-full bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold"
              >
                {DUBBED_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div ref={actorDropdownRef} className="relative">
              <label className="block text-sm text-text-secondary mb-1.5">Actor / Cast</label>
              <div className="relative">
                <input
                  value={actorQuery}
                  onChange={(e) => handleActorQueryChange(e.target.value)}
                  onFocus={() => { if (actorResults.length > 0) setShowActorDropdown(true); }}
                  placeholder="Search actor name (e.g. Ranveer Singh)"
                  className="w-full bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold pr-8"
                />
                {searchingActors ? (
                  <Loader2 size={14} className="absolute right-3 top-3 text-text-muted animate-spin" />
                ) : (
                  <User size={14} className="absolute right-3 top-3 text-text-muted" />
                )}
              </div>
              {/* Actor search dropdown */}
              {showActorDropdown && actorResults.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {actorResults.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => addActor(person)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface-light transition-colors text-sm',
                        selectedActors.find((a) => a.id === person.id) && 'opacity-50'
                      )}
                    >
                      {person.profileUrl ? (
                        <img src={person.profileUrl} alt={person.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center flex-shrink-0">
                          <User size={14} className="text-text-muted" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{person.name}</p>
                        {person.knownFor && <p className="text-xs text-text-muted truncate">{person.knownFor}</p>}
                      </div>
                      {selectedActors.find((a) => a.id === person.id) && (
                        <Check size={14} className="text-gold ml-auto flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
              {/* Selected actors */}
              {selectedActors.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedActors.map((actor) => (
                    <span key={actor.id} className="flex items-center gap-1 bg-gold/10 text-gold px-2.5 py-1 rounded-full text-xs font-medium">
                      {actor.name}
                      <button onClick={() => removeActor(actor.id)} className="hover:text-gold-light">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Genre Multi-Select */}
          <div>
            <label className="block text-sm text-text-secondary mb-2">Genres {selectedGenres.length > 0 && `(${selectedGenres.length} selected)`}</label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => {
                const active = selectedGenres.includes(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => { toggleGenre(g.id); resetPage(); }}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                      active
                        ? 'bg-gold text-background border-gold'
                        : 'bg-surface-light text-text-secondary border-border hover:border-gold/50',
                    )}
                  >
                    {g.name}
                    {active && <X size={12} className="inline ml-1 -mr-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { resetPage(); discoverMutation.mutate(); }}
              disabled={discoverMutation.isPending}
              className="flex items-center gap-2 bg-gold hover:bg-gold-light text-background px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {discoverMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Compass size={18} />}
              {discoverMutation.isPending ? 'Fetching...' : 'Discover'}
            </button>
            {results.length > 0 && (
              <button
                onClick={() => discoverMutation.mutate()}
                disabled={discoverMutation.isPending}
                className="flex items-center gap-2 bg-surface-light hover:bg-surface text-text-primary border border-border px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {discoverMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Compass size={18} />}
                Load More
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════ RESULTS (shared) ══════════ */}
      {results.length > 0 && (
        <div className="space-y-4">
          {/* Active filter badges */}
          {((mode === 'discover' && (ottPlatform || dubbed)) || (mode === 'search' && (searchOttPlatform || searchDubbed))) && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-text-muted">Active filters:</span>
              {mode === 'discover' && ottPlatform && (
                <span className="flex items-center gap-1 bg-gold/10 text-gold border border-gold/20 px-2.5 py-1 rounded-full text-xs font-medium">
                  {OTT_PLATFORMS.find((p) => p.providerId === ottPlatform)?.label}
                  <button onClick={() => setOttPlatform('')} className="hover:text-gold-light"><X size={11} /></button>
                </span>
              )}
              {mode === 'search' && searchOttPlatform && (
                <span className="flex items-center gap-1 bg-gold/10 text-gold border border-gold/20 px-2.5 py-1 rounded-full text-xs font-medium">
                  {OTT_PLATFORMS.find((p) => p.providerId === searchOttPlatform)?.label}
                  <button onClick={() => setSearchOttPlatform('')} className="hover:text-gold-light"><X size={11} /></button>
                </span>
              )}
              {mode === 'discover' && dubbed && (
                <span className="flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full text-xs font-medium">
                  {DUBBED_OPTIONS.find((d) => d.value === dubbed)?.label}
                  <button onClick={() => setDubbed('')} className="hover:text-blue-300"><X size={11} /></button>
                </span>
              )}
              {mode === 'search' && searchDubbed && (
                <span className="flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full text-xs font-medium">
                  Hindi/Language filter
                  <button onClick={() => setSearchDubbed('')} className="hover:text-blue-300"><X size={11} /></button>
                </span>
              )}
            </div>
          )}
          {/* Action bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleAll}
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {allSelected ? <CheckSquare size={18} className="text-gold" /> : <Square size={18} />}
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm text-text-secondary">
                {selected.size} of {selectableItems.length} selected
              </span>
            </div>
            <button
              onClick={() => importMutation.mutate()}
              disabled={selected.size === 0 || importMutation.isPending}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {importMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {importMutation.isPending ? 'Importing...' : `Import ${selected.size} Items`}
            </button>
          </div>

          {/* Import results banner */}
          {importResult && (
            <div className="bg-surface border border-green-600/30 rounded-xl p-4 flex items-start gap-3">
              <Check size={20} className="text-green-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-green-400">
                  Import complete: {importResult.imported} imported, {importResult.skipped} skipped
                </p>
                {importResult.items.filter((i) => i.status === 'error').length > 0 && (
                  <div className="mt-2 space-y-1">
                    {importResult.items
                      .filter((i) => i.status === 'error')
                      .map((i) => (
                        <p key={i.tmdbId} className="text-red-400 flex items-center gap-1">
                          <AlertCircle size={14} />
                          TMDB #{i.tmdbId}: {i.reason}
                        </p>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {results.map((item) => {
              const isSelected = selected.has(item.tmdbId);
              const disabled = item.alreadyImported;
              return (
                <div
                  key={item.tmdbId}
                  onClick={() => !disabled && toggleSelect(item.tmdbId)}
                  className={clsx(
                    'relative bg-surface border rounded-xl overflow-hidden cursor-pointer transition-all group',
                    disabled
                      ? 'opacity-50 cursor-not-allowed border-border'
                      : isSelected
                        ? 'border-gold ring-1 ring-gold'
                        : 'border-border hover:border-gold/50',
                  )}
                >
                  {!disabled && (
                    <div className="absolute top-2 left-2 z-10">
                      <div
                        className={clsx(
                          'w-6 h-6 rounded flex items-center justify-center transition-colors',
                          isSelected ? 'bg-gold text-background' : 'bg-black/60 text-white border border-white/30',
                        )}
                      >
                        {isSelected && <Check size={14} />}
                      </div>
                    </div>
                  )}

                  {disabled && (
                    <div className="absolute top-2 right-2 z-10 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      IMPORTED
                    </div>
                  )}

                  <div className="aspect-[2/3] bg-surface-light">
                    {item.posterUrl ? (
                      <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs">No Poster</div>
                    )}
                  </div>

                  <div className="p-3 space-y-1">
                    <h3 className="text-sm font-medium text-text-primary line-clamp-2 leading-tight">{item.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      {item.releaseDate && <span>{item.releaseDate.split('-')[0]}</span>}
                      {item.rating > 0 && (
                        <span className="flex items-center gap-0.5">
                          <span className="text-yellow-400">★</span>
                          {item.rating.toFixed(1)}
                        </span>
                      )}
                      {item.originalLanguage && (
                        <span className="uppercase">{item.originalLanguage}</span>
                      )}
                    </div>
                    {item.genreNames.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.genreNames.slice(0, 2).map((g) => (
                          <span key={g} className="text-[10px] bg-surface-light text-text-secondary px-1.5 py-0.5 rounded">{g}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More for search */}
          {mode === 'search' && results.length < totalResults && (
            <div className="flex justify-center">
              <button
                onClick={() => searchMutation.mutate(searchPage)}
                disabled={searchMutation.isPending}
                className="flex items-center gap-2 bg-surface-light hover:bg-surface text-text-primary border border-border px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {searchMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                Load More Results
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && !isLoading && (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <Search size={48} className="mx-auto text-text-secondary/30 mb-4" />
          <p className="text-text-secondary">
            {mode === 'search'
              ? 'Search for any movie, TV show, web series, or anime by name.'
              : 'Select filters and click Discover to browse TMDB.'}
          </p>
        </div>
      )}

      {isLoading && results.length === 0 && (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <Loader2 size={48} className="mx-auto text-gold animate-spin mb-4" />
          <p className="text-text-secondary">
            {mode === 'search' ? 'Searching TMDB...' : 'Fetching from TMDB...'}
          </p>
        </div>
      )}
    </div>
  );
}
