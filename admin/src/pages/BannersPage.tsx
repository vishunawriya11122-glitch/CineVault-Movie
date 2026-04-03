import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { Plus, Trash2, GripVertical, X, Edit2, Search, Image as ImageIcon, Film } from 'lucide-react';
import api from '../lib/api';
import type { Banner } from '../types';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SECTIONS = [
  { key: 'home', label: 'Home' },
  { key: 'movies', label: 'Movies' },
  { key: 'shows', label: 'Shows' },
  { key: 'anime', label: 'Anime' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

interface MovieItem {
  _id: string;
  title: string;
  posterUrl?: string;
  bannerUrl?: string;
  contentType: string;
  status: string;
  releaseYear?: number;
  synopsis?: string;
  genres?: string[];
  contentRating?: string;
  starRating?: number;
  languages?: string[];
}

// Maps section key → allowed content types
function contentTypesForSection(section: SectionKey): string[] | null {
  switch (section) {
    case 'movies': return ['movie', 'short_film', 'documentary'];
    case 'shows': return ['web_series', 'tv_show'];
    case 'anime': return ['anime'];
    default: return null; // home → all content
  }
}

// ── Sortable Banner Row ──
function SortableBannerRow({
  banner,
  onEdit,
  onDelete,
  onToggle,
}: {
  banner: Banner;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: banner._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  const contentTitle =
    typeof banner.contentId === 'object' && banner.contentId?.title
      ? banner.contentId.title
      : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'bg-surface border border-border rounded-xl p-4 flex items-center gap-4',
        isDragging && 'shadow-xl ring-2 ring-gold/30',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-surface-light touch-none"
      >
        <GripVertical size={18} className="text-text-muted" />
      </button>

      {banner.imageUrl ? (
        <div className="relative w-36 h-20 rounded-lg overflow-hidden bg-border flex-shrink-0">
          <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-36 h-20 bg-border rounded-lg flex items-center justify-center text-xs text-text-muted flex-shrink-0">
          <ImageIcon size={20} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">{banner.title}</h3>
          {banner.type === 'mid' && (
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
              Mid Banner
            </span>
          )}
          {(!banner.type || banner.type === 'hero') && (
            <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded">
              Hero
            </span>
          )}
          {!banner.contentId && (
            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
              Pre-release
            </span>
          )}
        </div>
        {banner.subtitle && (
          <p className="text-sm text-text-secondary truncate">{banner.subtitle}</p>
        )}
        {contentTitle && (
          <p className="text-xs text-gold mt-0.5">
            <Film size={12} className="inline mr-1" />
            {contentTitle}
          </p>
        )}
        <p className="text-xs text-text-muted mt-1">
          Order: {banner.displayOrder ?? banner.order}
          {banner.type === 'mid' && banner.position != null && ` · Position: after section ${banner.position}`}
        </p>
      </div>

      <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
        <input type="checkbox" checked={banner.isActive} onChange={onToggle} className="sr-only peer" />
        <div
          className={clsx(
            'w-10 h-5 rounded-full transition-colors relative',
            banner.isActive ? 'bg-success' : 'bg-border',
          )}
        >
          <div
            className={clsx(
              'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform',
              banner.isActive ? 'translate-x-5' : 'translate-x-0.5',
            )}
          />
        </div>
      </label>

      <button
        onClick={onEdit}
        className="p-2 rounded-lg hover:bg-gold/10 text-text-secondary hover:text-gold transition-colors"
      >
        <Edit2 size={16} />
      </button>

      <button
        onClick={onDelete}
        className="p-2 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

// ── Main Banner Manager Page ──
export default function BannersPage() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<SectionKey>('home');
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [showMovieSearch, setShowMovieSearch] = useState(false);
  const [movieSearch, setMovieSearch] = useState('');

  const emptyForm = {
    title: '',
    subtitle: '',
    imageUrl: '',
    actionType: 'movie',
    contentId: '',
    isActive: true,
    section: activeSection as string,
    type: 'hero' as string,
    position: 2,
  };
  const [form, setForm] = useState(emptyForm);

  // Fetch banners for current section
  const { data: banners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ['banners', activeSection],
    queryFn: async () => {
      const { data } = await api.get(`/banners/all?section=${activeSection}`);
      return data.map((b: any) => ({
        ...b,
        order: b.displayOrder ?? 0,
        section: b.section ?? 'home',
      }));
    },
  });

  // Fetch movies for content selection
  const { data: movies = [] } = useQuery<MovieItem[]>({
    queryKey: ['movies-for-banners'],
    queryFn: async () => {
      const { data } = await api.get('/movies?limit=200');
      return data.movies || data || [];
    },
    staleTime: 60000,
  });

  const filteredMovies = useMemo(() => {
    // First filter by section content types
    const allowedTypes = contentTypesForSection(form.section as SectionKey ?? activeSection);
    let filtered = movies;
    if (allowedTypes) {
      filtered = filtered.filter(m => allowedTypes.includes(m.contentType));
    }
    // Then filter by search query
    if (movieSearch.trim()) {
      const q = movieSearch.toLowerCase();
      filtered = filtered.filter(
        (m) => m.title.toLowerCase().includes(q) || m.contentType?.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [movies, movieSearch, form.section, activeSection]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/banners', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners', activeSection] });
      toast.success('Banner created');
      closeForm();
    },
    onError: () => toast.error('Failed to create banner'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/banners/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners', activeSection] });
      toast.success('Banner updated');
      closeForm();
    },
    onError: () => toast.error('Failed to update banner'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/banners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners', activeSection] });
      toast.success('Banner deleted');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/banners/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banners', activeSection] }),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => api.post('/banners/reorder', { orderedIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banners', activeSection] }),
  });

  function closeForm() {
    setShowForm(false);
    setEditingBanner(null);
    setForm({ ...emptyForm, section: activeSection });
    setShowMovieSearch(false);
    setMovieSearch('');
  }

  function openCreate() {
    setEditingBanner(null);
    setForm({ ...emptyForm, section: activeSection });
    setShowForm(true);
  }

  function openEdit(banner: Banner) {
    setEditingBanner(banner);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || '',
      imageUrl: banner.imageUrl,
      actionType: banner.actionType || 'movie',
      contentId:
        typeof banner.contentId === 'object'
          ? banner.contentId?._id || ''
          : banner.contentId || '',
      isActive: banner.isActive,
      section: banner.section || activeSection,
      type: banner.type || 'hero',
      position: banner.position ?? 2,
    });
    setShowForm(true);
  }

  function handleSubmit() {
    const data: any = { ...form };
    if (!data.contentId || data.contentId.trim() === '') {
      delete data.contentId;
    }
    // Mid banners don't need a title
    if (data.type === 'mid' && !data.title) {
      data.title = 'Mid Banner';
    }
    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner._id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = banners.findIndex((b) => b._id === active.id);
    const newIndex = banners.findIndex((b) => b._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(banners, oldIndex, newIndex);
    queryClient.setQueryData(['banners', activeSection], reordered);
    reorderMutation.mutate(reordered.map((b) => b._id));
  }

  function selectMovie(movie: MovieItem) {
    setForm({
      ...form,
      contentId: movie._id,
      title: movie.title,
      subtitle: movie.synopsis?.slice(0, 150) || form.subtitle,
      imageUrl: movie.bannerUrl || movie.posterUrl || form.imageUrl || '',
    });
    setShowMovieSearch(false);
    setMovieSearch('');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Banner Manager</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-gold hover:bg-gold-light text-background px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus size={18} />
          Add Banner
        </button>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 bg-surface border border-border rounded-xl p-1">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={clsx(
              'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors',
              activeSection === s.key
                ? 'bg-gold text-background'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-light',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Banner List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-20 text-text-secondary border border-border border-dashed rounded-xl">
          <ImageIcon size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">
            No banners for {SECTIONS.find((s) => s.key === activeSection)?.label}
          </p>
          <p className="text-sm mt-1">Add a banner to display in this section's carousel</p>
          <button
            onClick={openCreate}
            className="mt-4 bg-gold hover:bg-gold-light text-background px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={16} className="inline mr-1" />
            Add First Banner
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={banners.map((b) => b._id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {banners.map((banner) => (
                <SortableBannerRow
                  key={banner._id}
                  banner={banner}
                  onEdit={() => openEdit(banner)}
                  onDelete={() => {
                    if (confirm('Delete this banner?')) deleteMutation.mutate(banner._id);
                  }}
                  onToggle={() =>
                    toggleMutation.mutate({ id: banner._id, isActive: !banner.isActive })
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingBanner ? 'Edit Banner' : 'New Banner'}
              </h2>
              <button
                onClick={closeForm}
                className="text-text-secondary hover:text-text-primary"
              >
                <X size={20} />
              </button>
            </div>

            {/* Section selector */}
            <div>
              <label className="block text-sm text-text-secondary mb-1">Section</label>
              <select
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
              >
                {SECTIONS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Banner Type */}
            <div>
              <label className="block text-sm text-text-secondary mb-1">Banner Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
              >
                <option value="hero">Hero (Top Carousel)</option>
                <option value="mid">Mid Banner (Between Sections)</option>
              </select>
              {form.type === 'mid' && (
                <p className="text-xs text-text-muted mt-1">
                  Mid Banner: Single clickable 16:9 banner placed between content sections. No text overlay.
                </p>
              )}
            </div>

            {/* Position (only for mid banners) */}
            {form.type === 'mid' && (
              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  Position (after which section)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) || 2 })}
                  className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
                />
                <p className="text-xs text-text-muted mt-1">
                  e.g. 2 = banner appears after the 2nd section
                </p>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm text-text-secondary mb-1">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-sm text-text-secondary mb-1">Subtitle</label>
              <input
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm text-text-secondary mb-1">Banner Image URL *</label>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
                placeholder="https://example.com/banner.jpg"
              />
            </div>

            {/* Image Preview */}
            {form.imageUrl && form.imageUrl.startsWith('http') && (
              <div className="w-full h-40 bg-border rounded-xl overflow-hidden">
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Content Selection */}
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Linked Content{' '}
                <span className="text-xs text-text-muted">(optional — leave empty for pre-release banners)</span>
              </label>
              {form.contentId ? (
                <div className="flex items-center gap-2 bg-surface-light border border-border rounded-xl px-4 py-2.5">
                  <Film size={14} className="text-gold" />
                  <span className="flex-1 text-sm truncate">
                    {movies.find((m) => m._id === form.contentId)?.title || form.contentId}
                  </span>
                  <button
                    onClick={() => setForm({ ...form, contentId: '' })}
                    className="text-text-muted hover:text-error"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowMovieSearch(true)}
                  className="w-full flex items-center gap-2 bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-muted hover:text-text-secondary text-sm"
                >
                  <Search size={14} />
                  Search & select content (auto-fills title, image, details)...
                </button>
              )}
            </div>

            {/* Movie Search Dropdown */}
            {showMovieSearch && (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="p-2 border-b border-border">
                  <input
                    value={movieSearch}
                    onChange={(e) => setMovieSearch(e.target.value)}
                    className="w-full bg-surface-light rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none"
                    placeholder={`Search ${activeSection === 'home' ? 'all content' : activeSection}...`}
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredMovies.slice(0, 30).map((movie) => (
                    <button
                      key={movie._id}
                      onClick={() => selectMovie(movie)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-light text-left"
                    >
                      {movie.posterUrl ? (
                        <img
                          src={movie.posterUrl}
                          alt=""
                          className="w-8 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-8 h-12 bg-border rounded" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{movie.title}</p>
                        <p className="text-xs text-text-muted">
                          {movie.contentType} {movie.releaseYear && `· ${movie.releaseYear}`}
                        </p>
                      </div>
                    </button>
                  ))}
                  {filteredMovies.length === 0 && (
                    <p className="text-center py-4 text-text-muted text-sm">No movies found</p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={closeForm}
                className="px-4 py-2 rounded-xl border border-border text-text-secondary hover:text-text-primary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  (!form.title && form.type !== 'mid') ||
                  !form.imageUrl
                }
                className="px-4 py-2 rounded-xl bg-gold hover:bg-gold-light text-background text-sm font-semibold disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingBanner
                    ? 'Save Changes'
                    : 'Create Banner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
