import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
  Cloud,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface PendingItem {
  id: string;
  title: string;
  type?: string;
  seasonId?: string;
  driveUrls: number;
}

interface PendingData {
  movies: PendingItem[];
  episodes: PendingItem[];
  totalDriveUrls: number;
}

interface MigrationStatus {
  total: number;
  completed: number;
  failed: number;
  current: string | null;
  running: boolean;
  results: { id: string; title: string; status: string; error?: string }[];
}

export default function StoragePage() {
  const queryClient = useQueryClient();

  const { data: pending, isLoading: pendingLoading } = useQuery<PendingData>({
    queryKey: ['bunny-pending'],
    queryFn: () => api.get('/bunny/pending').then((r) => r.data),
  });

  const { data: status, refetch: refetchStatus } = useQuery<MigrationStatus>({
    queryKey: ['bunny-status'],
    queryFn: () => api.get('/bunny/status').then((r) => r.data),
    refetchInterval: (query) => ((query.state.data as MigrationStatus | undefined)?.running ? 3000 : false),
  });

  // Auto-refresh pending list when migration finishes
  useEffect(() => {
    if (status && !status.running && status.completed > 0) {
      queryClient.invalidateQueries({ queryKey: ['bunny-pending'] });
    }
  }, [status?.running]);

  const migrateAll = useMutation({
    mutationFn: () => api.post('/bunny/migrate-all'),
    onSuccess: () => refetchStatus(),
  });

  const migrateSingle = useMutation({
    mutationFn: (movieId: string) => api.post(`/bunny/migrate/${movieId}`),
    onSuccess: () => {
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['bunny-pending'] });
    },
  });

  const migrateEpisode = useMutation({
    mutationFn: (episodeId: string) => api.post(`/bunny/migrate-episode/${episodeId}`),
    onSuccess: () => {
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['bunny-pending'] });
    },
  });

  const isRunning = status?.running ?? false;
  const progress =
    status && status.total > 0
      ? Math.round((status.completed / status.total) * 100)
      : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display text-gold tracking-wide">Storage Migration</h1>
          <p className="text-text-muted text-sm mt-1">
            Migrate Google Drive content to Bunny.net CDN for reliable streaming
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Cloud size={16} />
          <span>cinevault-cdn.b-cdn.net</span>
        </div>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-text-muted text-xs uppercase tracking-wider">Pending Movies</p>
          <p className="text-2xl font-bold text-text-primary mt-1">
            {pending?.movies.length ?? '—'}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-text-muted text-xs uppercase tracking-wider">Pending Episodes</p>
          <p className="text-2xl font-bold text-text-primary mt-1">
            {pending?.episodes.length ?? '—'}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-text-muted text-xs uppercase tracking-wider">Total Drive URLs</p>
          <p className="text-2xl font-bold text-gold mt-1">
            {pending?.totalDriveUrls ?? '—'}
          </p>
        </div>
      </div>

      {/* Migration Progress */}
      {(isRunning || (status && status.completed > 0)) && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isRunning ? (
                <Loader2 size={18} className="animate-spin text-gold" />
              ) : (
                <CheckCircle2 size={18} className="text-green-500" />
              )}
              <span className="font-medium text-text-primary">
                {isRunning ? 'Migration in progress...' : 'Migration complete'}
              </span>
            </div>
            <span className="text-sm text-text-muted">
              {status?.completed}/{status?.total} • {status?.failed} failed
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-surface-light rounded-full h-2.5 mb-3">
            <div
              className="bg-gold h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {status?.current && (
            <p className="text-xs text-text-muted">
              Currently: {status.current}
            </p>
          )}

          {/* Results log */}
          {status?.results && status.results.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto space-y-1">
              {status.results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs py-1 border-b border-border/30"
                >
                  {r.status === 'success' ? (
                    <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                  ) : r.status === 'partial' ? (
                    <AlertCircle size={14} className="text-yellow-500 shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-red-500 shrink-0" />
                  )}
                  <span className="text-text-primary truncate">{r.title}</span>
                  {r.error && (
                    <span className="text-red-400 text-[10px] truncate ml-auto">
                      {r.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Migrate All Button */}
      <button
        onClick={() => migrateAll.mutate()}
        disabled={isRunning || !pending?.totalDriveUrls}
        className="w-full bg-gold hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        {isRunning ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Migration Running...
          </>
        ) : (
          <>
            <PlayCircle size={18} /> Migrate All to Bunny CDN
          </>
        )}
      </button>

      {/* Pending Movies Table */}
      {pendingLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-gold" size={24} />
        </div>
      ) : (
        <>
          {pending?.movies && pending.movies.length > 0 && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-text-primary">
                  Movies ({pending.movies.length})
                </h2>
              </div>
              <div className="divide-y divide-border/50">
                {pending.movies.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-surface-light/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {m.title}
                      </p>
                      <p className="text-xs text-text-muted">
                        {m.type} • {m.driveUrls} Drive URL{m.driveUrls > 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => migrateSingle.mutate(m.id)}
                      disabled={isRunning || migrateSingle.isPending}
                      className="text-gold hover:text-gold/80 disabled:opacity-30 p-1"
                      title="Migrate this movie"
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pending?.episodes && pending.episodes.length > 0 && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-text-primary">
                  Episodes ({pending.episodes.length})
                </h2>
              </div>
              <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
                {pending.episodes.map((ep) => (
                  <div
                    key={ep.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-surface-light/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {ep.title}
                      </p>
                      <p className="text-xs text-text-muted">
                        {ep.driveUrls} Drive URL{ep.driveUrls > 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => migrateEpisode.mutate(ep.id)}
                      disabled={isRunning || migrateEpisode.isPending}
                      className="text-gold hover:text-gold/80 disabled:opacity-30 p-1"
                      title="Migrate this episode"
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pending && pending.totalDriveUrls === 0 && (
            <div className="text-center py-16">
              <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-text-primary">All Migrated!</h3>
              <p className="text-text-muted text-sm mt-1">
                No Google Drive URLs remaining. All content is on Bunny CDN.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
