import { useEffect, useState, useRef, useCallback } from 'react';
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
  Upload,
  FolderPlus,
  FolderOpen,
  Trash2,
  Film,
  ChevronRight,
  HardDrive,
  RefreshCw,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [activeTab, setActiveTab] = useState<'bunny' | 'r2'>('r2');
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
          <h1 className="text-2xl font-display text-gold tracking-wide">Storage Manager</h1>
          <p className="text-text-muted text-sm mt-1">
            Manage Bunny CDN migration & Cloudflare R2 storage
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
        <button
          onClick={() => setActiveTab('r2')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'r2'
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <HardDrive size={16} />
          Cloudflare R2 Storage
        </button>
        <button
          onClick={() => setActiveTab('bunny')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'bunny'
              ? 'bg-gold/20 text-gold border border-gold/30'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Cloud size={16} />
          Bunny CDN Migration
        </button>
      </div>

      {/* R2 Tab */}
      {activeTab === 'r2' && <R2FileManager />}

      {/* Bunny Tab */}
      {activeTab === 'bunny' && (
        <>
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
      </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  R2 File Manager — Browse, Upload, Create Folders, Delete
// ═══════════════════════════════════════════════════════════
function R2FileManager() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState<{ name: string; progress: number; status: 'uploading' | 'done' | 'error' }[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // R2 bucket info
  const { data: r2Info } = useQuery({
    queryKey: ['r2-info'],
    queryFn: () => api.get('/r2/info').then((r) => r.data),
  });

  // Browse current folder
  const { data: browseData, isLoading: browsing, refetch: refetchBrowse } = useQuery({
    queryKey: ['r2-browse', currentPath],
    queryFn: () => api.get(`/r2/browse?path=${encodeURIComponent(currentPath)}`).then((r) => r.data) as Promise<{
      currentPath: string;
      folders: { name: string; path: string }[];
      files: { name: string; path: string; size: number; url: string }[];
    }>,
  });

  // Create folder mutation
  const createFolderMut = useMutation({
    mutationFn: (path: string) => api.post('/r2/folder', { path }),
    onSuccess: () => {
      toast.success('Folder created!');
      setShowCreateFolder(false);
      setNewFolderName('');
      queryClient.invalidateQueries({ queryKey: ['r2-browse', currentPath] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create folder'),
  });

  // Delete file mutation
  const deleteFileMut = useMutation({
    mutationFn: (key: string) => api.delete(`/r2/file?key=${encodeURIComponent(key)}`),
    onSuccess: () => {
      toast.success('File deleted');
      queryClient.invalidateQueries({ queryKey: ['r2-browse', currentPath] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  const formatSize = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  // Upload files via presigned URL (small) or multipart (large)
  const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const newUploads = fileArr.map((f) => ({ name: f.name, progress: 0, status: 'uploading' as const }));
    setUploadingFiles((prev) => [...prev, ...newUploads]);

    // Get worker config for multipart uploads
    let uploadConfig: { workerUrl: string; apiKey: string } | null = null;
    try {
      const { data } = await api.get('/r2/upload-config');
      if (data.useWorker) uploadConfig = data;
    } catch { /* fallback to presigned */ }

    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      try {
        const folder = currentPath.replace(/\/$/, '');
        const key = folder ? `${folder}/${file.name}` : file.name;

        if (file.size > CHUNK_SIZE && uploadConfig) {
          // ── Multipart upload for large files ──
          await multipartUpload(file, key, uploadConfig, (pct) => {
            setUploadingFiles((prev) =>
              prev.map((u) => u.name === file.name ? { ...u, progress: pct } : u),
            );
          });
        } else {
          // ── Single PUT for small files ──
          const { data } = await api.post('/r2/presigned-url', {
            folder,
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
          });

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', data.uploadUrl, true);
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                setUploadingFiles((prev) =>
                  prev.map((u) => u.name === file.name ? { ...u, progress: pct } : u),
                );
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else reject(new Error(`Upload failed: ${xhr.status}`));
            };

            xhr.onerror = () => reject(new Error('Upload failed'));
            xhr.send(file);
          });
        }

        setUploadingFiles((prev) =>
          prev.map((u) => u.name === file.name ? { ...u, progress: 100, status: 'done' } : u),
        );
        toast.success(`Uploaded: ${file.name}`);
      } catch (err: any) {
        setUploadingFiles((prev) =>
          prev.map((u) => u.name === file.name ? { ...u, status: 'error' } : u),
        );
        toast.error(`Failed: ${file.name}`);
      }
    }

    // Refresh browse after all uploads
    queryClient.invalidateQueries({ queryKey: ['r2-browse', currentPath] });

    // Clear completed uploads after 3s
    setTimeout(() => {
      setUploadingFiles((prev) => prev.filter((u) => u.status === 'uploading'));
    }, 3000);
  }, [currentPath, queryClient]);

  // Multipart upload: split file into chunks, upload each via worker
  async function multipartUpload(
    file: File,
    key: string,
    config: { workerUrl: string; apiKey: string },
    onProgress: (pct: number) => void,
  ) {
    const { workerUrl, apiKey } = config;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // 1. Create multipart upload
    const createResp = await fetch(
      `${workerUrl}/upload/multipart/create?key=${encodeURIComponent(key)}&apiKey=${encodeURIComponent(apiKey)}`,
      { method: 'POST' },
    );
    if (!createResp.ok) throw new Error('Failed to start multipart upload');
    const { uploadId } = await createResp.json();

    // 2. Upload each chunk
    const parts: { partNumber: number; etag: string }[] = [];

    for (let partNum = 1; partNum <= totalChunks; partNum++) {
      const start = (partNum - 1) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const partResp = await fetch(
        `${workerUrl}/upload/multipart/part?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNum}&apiKey=${encodeURIComponent(apiKey)}`,
        { method: 'PUT', body: chunk },
      );

      if (!partResp.ok) {
        // Abort on failure
        await fetch(
          `${workerUrl}/upload/multipart/abort?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&apiKey=${encodeURIComponent(apiKey)}`,
          { method: 'DELETE' },
        ).catch(() => {});
        throw new Error(`Failed to upload chunk ${partNum}/${totalChunks}`);
      }

      const partData = await partResp.json();
      parts.push({ partNumber: partData.partNumber, etag: partData.etag });

      onProgress(Math.round((partNum / totalChunks) * 100));
    }

    // 3. Complete multipart upload
    const completeResp = await fetch(
      `${workerUrl}/upload/multipart/complete?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&apiKey=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts }),
      },
    );

    if (!completeResp.ok) throw new Error('Failed to complete multipart upload');
  }

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }, [uploadFiles]);

  const navigateTo = (path: string) => {
    setCurrentPath(path);
  };

  const navigateUp = () => {
    const parts = currentPath.replace(/\/$/, '').split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length > 0 ? parts.join('/') + '/' : '');
  };

  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <div className="space-y-4">
      {/* R2 Info Bar */}
      <div className="bg-surface border border-orange-500/20 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <HardDrive size={20} className="text-orange-400" />
            </div>
            <div>
              <p className="font-semibold text-text-primary text-sm">Cloudflare R2 Bucket</p>
              <p className="text-xs text-text-muted">
                {r2Info?.configured
                  ? `${r2Info.bucket} • ${r2Info.publicUrl}`
                  : 'Not configured — set R2_* env vars on backend'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {r2Info?.configured && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-medium">Connected</span>
            )}
            {!r2Info?.configured && (
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full font-medium">Not Connected</span>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar: Breadcrumb + Actions */}
      <div className="flex items-center justify-between gap-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm flex-wrap flex-1 min-w-0">
          <button
            onClick={() => navigateTo('')}
            className="text-orange-400 hover:text-orange-300 font-medium shrink-0"
          >
            🪣 Root
          </button>
          {pathParts.map((part, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              <ChevronRight size={12} className="text-text-muted" />
              <button
                onClick={() => navigateTo(pathParts.slice(0, i + 1).join('/') + '/')}
                className="text-orange-400 hover:text-orange-300"
              >
                {part}
              </button>
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refetchBrowse()}
            className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-light transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowCreateFolder(true)}
            className="flex items-center gap-1.5 bg-surface-light hover:bg-surface border border-border px-3 py-2 rounded-lg text-sm font-medium text-text-primary transition-colors"
          >
            <FolderPlus size={14} />
            New Folder
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Upload size={14} />
            Upload Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*,.mkv,.avi,.ts,.m3u8"
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
        </div>
      </div>

      {/* Create Folder Inline */}
      {showCreateFolder && (
        <div className="bg-surface border border-orange-500/20 rounded-lg p-3 flex items-center gap-3">
          <FolderPlus size={18} className="text-orange-400 shrink-0" />
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name (e.g. series, anime, breaking-bad, s01)"
            className="flex-1 bg-surface-light border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newFolderName.trim()) {
                const folderPath = currentPath
                  ? `${currentPath.replace(/\/$/, '')}/${newFolderName.trim()}`
                  : newFolderName.trim();
                createFolderMut.mutate(folderPath);
              }
            }}
            autoFocus
          />
          <button
            onClick={() => {
              if (newFolderName.trim()) {
                const folderPath = currentPath
                  ? `${currentPath.replace(/\/$/, '')}/${newFolderName.trim()}`
                  : newFolderName.trim();
                createFolderMut.mutate(folderPath);
              }
            }}
            disabled={!newFolderName.trim() || createFolderMut.isPending}
            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium"
          >
            {createFolderMut.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
          </button>
          <button onClick={() => { setShowCreateFolder(false); setNewFolderName(''); }} className="text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-3 space-y-2">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Uploads</p>
          {uploadingFiles.map((uf, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              {uf.status === 'uploading' && <Loader2 size={14} className="animate-spin text-orange-400 shrink-0" />}
              {uf.status === 'done' && <CheckCircle2 size={14} className="text-green-500 shrink-0" />}
              {uf.status === 'error' && <XCircle size={14} className="text-red-500 shrink-0" />}
              <span className="flex-1 truncate text-text-primary">{uf.name}</span>
              {uf.status === 'uploading' && (
                <div className="w-24 bg-surface-light rounded-full h-1.5">
                  <div className="bg-orange-500 h-1.5 rounded-full transition-all" style={{ width: `${uf.progress}%` }} />
                </div>
              )}
              <span className="text-xs text-text-muted w-10 text-right">{uf.progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* File Browser — Drag & Drop Zone */}
      <div
        className={`bg-surface border rounded-xl overflow-hidden transition-colors ${
          dragOver ? 'border-orange-500 bg-orange-500/5' : 'border-border'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Back button */}
        {currentPath && (
          <button
            onClick={navigateUp}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-muted hover:text-text-primary hover:bg-surface-light w-full border-b border-border/50 transition-colors"
          >
            <ChevronRight size={14} className="rotate-180" />
            <span>.. (back)</span>
          </button>
        )}

        {browsing ? (
          <div className="flex items-center justify-center gap-2 py-12 text-text-muted text-sm">
            <Loader2 size={16} className="animate-spin" /> Browsing R2...
          </div>
        ) : (
          <>
            {/* Folders */}
            {browseData?.folders.map((folder) => (
              <button
                key={folder.path}
                onClick={() => navigateTo(folder.path)}
                className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-light w-full border-b border-border/30 transition-colors text-left"
              >
                <FolderOpen size={16} className="text-orange-400 shrink-0" />
                <span className="text-text-primary font-medium">{folder.name}/</span>
              </button>
            ))}

            {/* Files */}
            {browseData?.files.map((file) => (
              <div
                key={file.path}
                className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-light border-b border-border/30 transition-colors"
              >
                <Film size={16} className="text-blue-400 shrink-0" />
                <span className="text-text-primary flex-1 truncate">{file.name}</span>
                <span className="text-xs text-text-muted shrink-0">{formatSize(file.size)}</span>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 shrink-0"
                >
                  Open
                </a>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${file.name}?`)) deleteFileMut.mutate(file.path);
                  }}
                  className="text-red-400 hover:text-red-300 p-1 shrink-0"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {/* Empty state */}
            {!browseData?.folders.length && !browseData?.files.length && (
              <div className="text-center py-16">
                <Upload size={40} className="mx-auto text-text-muted/30 mb-3" />
                <p className="text-text-muted text-sm">Empty folder</p>
                <p className="text-text-muted/60 text-xs mt-1">
                  Drag & drop video files here or click "Upload Files"
                </p>
              </div>
            )}

            {/* Drag overlay */}
            {dragOver && (
              <div className="flex items-center justify-center py-12 text-orange-400 text-sm font-medium pointer-events-none">
                <Upload size={24} className="mr-2" />
                Drop files to upload to {currentPath || 'root'}
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Setup Guide */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">📁 Recommended Folder Structure</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-text-muted font-mono">
          <div className="bg-surface-light rounded-lg p-2.5 space-y-0.5">
            <p className="text-orange-400 font-semibold not-italic font-sans">Series</p>
            <p>series/breaking-bad/s01/e01-pilot.mp4</p>
            <p>series/breaking-bad/s01/e02-cats.mp4</p>
            <p>series/breaking-bad/s02/e01-seven.mp4</p>
          </div>
          <div className="bg-surface-light rounded-lg p-2.5 space-y-0.5">
            <p className="text-orange-400 font-semibold not-italic font-sans">Anime</p>
            <p>anime/naruto/season-1/episode-01.mp4</p>
            <p>anime/naruto/season-1/episode-02.mp4</p>
            <p>anime/attack-on-titan/s01/e01.mp4</p>
          </div>
        </div>
      </div>
    </div>
  );
}
