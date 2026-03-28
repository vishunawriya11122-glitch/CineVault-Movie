import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, GripVertical, X, Edit2, Search, MinusCircle, Zap } from 'lucide-react';
import api from '../lib/api';
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

interface HomeSection {
  _id: string;
  title: string;
  type: 'standard' | 'large_card' | 'mid_banner' | 'trending';
  displayOrder: number;
  isVisible: boolean;
  isSystemManaged?: boolean;
  cardSize: 'small' | 'medium' | 'large';
  showViewMore: boolean;
  viewMoreText: string;
  showTrendingNumbers: boolean;
  bannerImageUrl?: string;
  contentIds: string[];
  contentTypes?: string[];
  maxItems: number;
  section?: string;
  slug?: string;
}

interface MovieItem {
  _id: string;
  title: string;
  posterUrl?: string;
  contentType: string;
  status: string;
  releaseYear?: number;
  genres?: string[];
}

// ── Sortable Section Row ──
function SortableSectionRow({
  section,
  onEdit,
  onDelete,
  onToggle,
  onManageContent,
}: {
  section: HomeSection;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onManageContent: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section._id,
  });

  const isSystem = !!section.isSystemManaged;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'bg-surface border rounded-xl p-4 flex items-center gap-4',
        isSystem ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border',
        isDragging && 'shadow-xl ring-2 ring-gold/30'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-surface-light touch-none"
      >
        <GripVertical size={18} className="text-text-muted" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-medium">{section.title}</h3>
          {isSystem ? (
            <span className="flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
              <Zap size={10} /> Auto
            </span>
          ) : (
            <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded">
              {section.type === 'standard' && 'Standard'}
              {section.type === 'large_card' && 'Large Cards'}
              {section.type === 'trending' && 'Trending'}
              {section.type === 'mid_banner' && 'Featured Banner'}
            </span>
          )}
        </div>
        {isSystem ? (
          <p className="text-xs text-emerald-400/80 mt-0.5">
            Auto-populated • newest first • up to {section.maxItems} items
            {section.contentTypes && section.contentTypes.length > 0
              ? ` • ${section.contentTypes.join(', ')}`
              : ' • all content types'}
          </p>
        ) : (
          <p className="text-xs text-text-secondary mt-0.5">
            {section.contentIds?.length || 0} items • Order: {section.displayOrder}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={section.isVisible}
            onChange={onToggle}
            className="sr-only peer"
          />
          <div
            className={clsx(
              'w-10 h-5 rounded-full transition-colors relative',
              section.isVisible ? 'bg-success' : 'bg-border'
            )}
          >
            <div
              className={clsx(
                'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                section.isVisible ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </div>
        </label>

        {/* Manage Content — hidden for system sections (auto-managed) */}
        {!isSystem && (
          <button
            onClick={onManageContent}
            className="p-2 rounded-lg hover:bg-gold/10 text-text-secondary hover:text-gold transition-colors"
            title="Manage Content"
          >
            <Plus size={16} />
          </button>
        )}

        {/* Edit — hidden for system sections */}
        {!isSystem && (
          <button
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-gold/10 text-text-secondary hover:text-gold transition-colors"
            title="Edit Section"
          >
            <Edit2 size={16} />
          </button>
        )}

        {/* Delete — disabled for system sections */}
        {isSystem ? (
          <div
            className="p-2 rounded-lg text-text-muted cursor-not-allowed"
            title="System section — cannot be deleted"
          >
            <Trash2 size={16} className="opacity-30" />
          </div>
        ) : (
          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
            title="Delete Section"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Add Content Modal ──
function AddContentModal({
  section,
  onClose,
}: {
  section: HomeSection;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Fetch all movies
  const { data: moviesData } = useQuery<{ movies: MovieItem[] }>({
    queryKey: ['allMoviesForSection'],
    queryFn: async () => {
      const { data } = await api.get('/movies', { params: { limit: 200 } });
      return data;
    },
  });

  // Fetch section content details
  const { data: sectionContent = [] } = useQuery<MovieItem[]>({
    queryKey: ['sectionContent', section._id],
    queryFn: async () => {
      if (!section.contentIds?.length) return [];
      const ids = section.contentIds;
      const results: MovieItem[] = [];
      // Fetch in batches
      for (const id of ids) {
        try {
          const { data } = await api.get(`/movies/${id}`);
          results.push(data);
        } catch {
          // Movie may have been deleted
        }
      }
      return results;
    },
  });

  const addMutation = useMutation({
    mutationFn: (movieIds: string[]) =>
      api.post(`/home/sections/${section._id}/add-content`, { movieIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeSections'] });
      queryClient.invalidateQueries({ queryKey: ['sectionContent', section._id] });
      toast.success('Content added');
    },
    onError: () => toast.error('Failed to add content'),
  });

  const removeMutation = useMutation({
    mutationFn: (movieIds: string[]) =>
      api.post(`/home/sections/${section._id}/remove-content`, { movieIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeSections'] });
      queryClient.invalidateQueries({ queryKey: ['sectionContent', section._id] });
      toast.success('Content removed');
    },
    onError: () => toast.error('Failed to remove content'),
  });

  const allMovies = moviesData?.movies || [];
  const existingIds = new Set(section.contentIds || []);

  const filteredMovies = useMemo(() => {
    if (!search.trim()) return allMovies;
    const q = search.toLowerCase();
    return allMovies.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.contentType?.toLowerCase().includes(q) ||
        m.genres?.some((g) => g.toLowerCase().includes(q))
    );
  }, [allMovies, search]);

  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      movie: 'Movie',
      web_series: 'Web Series',
      tv_show: 'TV Show',
      documentary: 'Documentary',
      short_film: 'Short Film',
      anime: 'Anime',
    };
    return map[t] || t;
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Manage Content</h2>
            <p className="text-sm text-text-secondary">{section.title}</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        {/* Current Content */}
        {sectionContent.length > 0 && (
          <div className="px-5 pt-4 pb-2 border-b border-border shrink-0">
            <h3 className="text-sm font-semibold text-text-secondary mb-2">
              Current Content ({sectionContent.length})
            </h3>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {sectionContent.map((movie) => (
                <div
                  key={movie._id}
                  className="flex items-center gap-2 bg-surface-light border border-border rounded-lg px-3 py-1.5 text-sm group"
                >
                  {movie.posterUrl && (
                    <img
                      src={movie.posterUrl}
                      alt=""
                      className="w-6 h-8 object-cover rounded"
                    />
                  )}
                  <span className="text-text-primary truncate max-w-[150px]">{movie.title}</span>
                  <button
                    onClick={() => removeMutation.mutate([movie._id])}
                    className="text-text-muted hover:text-error transition-colors shrink-0"
                    title="Remove from section"
                  >
                    <MinusCircle size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-5 pt-4 pb-3 shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search movies, shows, anime..."
              className="w-full bg-surface-light border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold"
              autoFocus
            />
          </div>
        </div>

        {/* Movie List */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          <div className="space-y-1.5">
            {filteredMovies.map((movie) => {
              const isAdded = existingIds.has(movie._id);
              return (
                <div
                  key={movie._id}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors',
                    isAdded
                      ? 'bg-gold/5 border-gold/20'
                      : 'bg-surface-light border-border hover:border-gold/30'
                  )}
                >
                  {movie.posterUrl ? (
                    <img
                      src={movie.posterUrl}
                      alt=""
                      className="w-10 h-14 object-cover rounded-lg shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-border rounded-lg shrink-0 flex items-center justify-center text-text-muted text-xs">
                      N/A
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-text-primary truncate">{movie.title}</p>
                    <p className="text-xs text-text-secondary">
                      {typeLabel(movie.contentType)}
                      {movie.releaseYear ? ` • ${movie.releaseYear}` : ''}
                      {movie.status === 'draft' ? ' • Draft' : ''}
                    </p>
                  </div>

                  {isAdded ? (
                    <button
                      onClick={() => removeMutation.mutate([movie._id])}
                      disabled={removeMutation.isPending}
                      className="shrink-0 p-2 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors"
                      title="Remove from section"
                    >
                      <MinusCircle size={18} />
                    </button>
                  ) : (
                    <button
                      onClick={() => addMutation.mutate([movie._id])}
                      disabled={addMutation.isPending}
                      className="shrink-0 p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
                      title="Add to section"
                    >
                      <Plus size={18} />
                    </button>
                  )}
                </div>
              );
            })}
            {filteredMovies.length === 0 && (
              <div className="text-center py-10 text-text-secondary text-sm">
                {search ? 'No content matches your search' : 'No content uploaded yet'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
export default function HomeSectionsPage() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<SectionKey>('home');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [managingSectionId, setManagingSectionId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    type: 'standard' as const,
    cardSize: 'small' as const,
    maxItems: 20,
    showViewMore: true,
    viewMoreText: 'View More',
    showTrendingNumbers: false,
    bannerImageUrl: '',
    section: 'home' as string,
  });

  const { data: sections = [], isLoading } = useQuery<HomeSection[]>({
    queryKey: ['homeSections', activeSection],
    queryFn: async () => {
      const { data } = await api.get(`/home/sections?section=${activeSection}`);
      return data;
    },
  });

  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => a.displayOrder - b.displayOrder),
    [sections]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      editingId
        ? api.patch(`/home/sections/${editingId}`, data)
        : api.post('/home/sections', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeSections', activeSection] });
      toast.success(editingId ? 'Section updated' : 'Section created');
      setShowForm(false);
      setEditingId(null);
      resetForm();
    },
    onError: () => toast.error('Failed to save section'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/home/sections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeSections', activeSection] });
      toast.success('Section deleted');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isVisible }: { id: string; isVisible: boolean }) =>
      api.patch(`/home/sections/${id}`, { isVisible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeSections', activeSection] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.post('/home/sections/reorder', { orderedIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeSections', activeSection] });
      toast.success('Sections reordered');
    },
    onError: () => toast.error('Failed to reorder'),
  });

  const resetForm = () => {
    setForm({
      title: '',
      type: 'standard' as const,
      cardSize: 'small' as const,
      maxItems: 20,
      showViewMore: true,
      viewMoreText: 'View More',
      showTrendingNumbers: false,
      bannerImageUrl: '',
      section: activeSection,
    });
  };

  const handleEdit = (section: HomeSection) => {
    setForm({
      title: section.title,
      type: section.type as any,
      cardSize: section.cardSize as any,
      maxItems: section.maxItems,
      showViewMore: section.showViewMore,
      viewMoreText: section.viewMoreText,
      showTrendingNumbers: section.showTrendingNumbers,
      bannerImageUrl: section.bannerImageUrl || '',
      section: section.section || activeSection,
    });
    setEditingId(section._id);
    setShowForm(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedSections.findIndex((s) => s._id === active.id);
    const newIndex = sortedSections.findIndex((s) => s._id === over.id);
    const reordered = arrayMove(sortedSections, oldIndex, newIndex);
    reorderMutation.mutate(reordered.map((s) => s._id));
  };

  const managingSection = sections.find((s) => s._id === managingSectionId);

  // Auto-seed default "Recently Added" sections on first load (idempotent — safe to call repeatedly)
  const seedMutation = useMutation({
    mutationFn: () => api.post('/home/sections/seed-defaults'),
    onSuccess: (res) => {
      if (res.data?.created > 0) {
        queryClient.invalidateQueries({ queryKey: ['homeSections'] });
        toast.success(`${res.data.created} default "Recently Added" section(s) initialized`);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to initialize default sections');
    },
  });

  useEffect(() => {
    seedMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Section Manager</h1>
          <p className="text-sm text-text-secondary mt-1">
            Drag to reorder • Click + to manage content • Changes reflect in the app instantly
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-gold hover:bg-gold-light text-background px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus size={18} />
          Add Section
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

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between sticky top-0 bg-surface pb-4">
              <h2 className="text-lg font-semibold">
                {editingId ? 'Edit Section' : 'New Section'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  resetForm();
                }}
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

            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Section Title *
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
                placeholder="e.g., Popular Movies, Trending, Marvel Universe"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Section Type *
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
              >
                <option value="standard">Standard (Square Cards)</option>
                <option value="large_card">Large Cards (Bigger Posters)</option>
                <option value="trending">Trending (Top 10 with Numbers)</option>
                <option value="mid_banner">Mid Banner (Featured Section)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Card Size
              </label>
              <select
                value={form.cardSize}
                onChange={(e) => setForm({ ...form, cardSize: e.target.value as any })}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
              >
                <option value="small">Small (130px)</option>
                <option value="medium">Medium (160px)</option>
                <option value="large">Large (180px+)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Max Items to show
              </label>
              <input
                type="number"
                value={form.maxItems}
                onChange={(e) => setForm({ ...form, maxItems: parseInt(e.target.value) })}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
                min="1"
                max="100"
              />
            </div>

            {(form.type as any) === 'mid_banner' && (
              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  Banner Image URL
                </label>
                <input
                  type="url"
                  value={form.bannerImageUrl}
                  onChange={(e) => setForm({ ...form, bannerImageUrl: e.target.value })}
                  className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
                  placeholder="https://example.com/banner.jpg"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showViewMore"
                checked={form.showViewMore}
                onChange={(e) => setForm({ ...form, showViewMore: e.target.checked })}
                className="rounded border-border"
              />
              <label htmlFor="showViewMore" className="text-sm text-text-secondary">
                Show "View More" button
              </label>
            </div>

            {form.showViewMore && (
              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  "View More" Button Text
                </label>
                <input
                  value={form.viewMoreText}
                  onChange={(e) => setForm({ ...form, viewMoreText: e.target.value })}
                  className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
                  placeholder="View More"
                />
              </div>
            )}

            {(form.type as any) === 'trending' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showNumbers"
                  checked={form.showTrendingNumbers}
                  onChange={(e) => setForm({ ...form, showTrendingNumbers: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor="showNumbers" className="text-sm text-text-secondary">
                  Show ranking numbers (1, 2, 3...)
                </label>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="px-4 py-2 rounded-xl border border-border text-text-secondary hover:text-text-primary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.title}
                className="px-4 py-2 rounded-xl bg-gold hover:bg-gold-light text-background text-sm font-semibold disabled:opacity-50"
              >
                {createMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Content Modal */}
      {managingSection && (
        <AddContentModal
          section={managingSection}
          onClose={() => setManagingSectionId(null)}
        />
      )}

      {/* Sections List with Drag & Drop */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : sections.length === 0 ? (
        <div className="text-center py-20 text-text-secondary border border-border border-dashed rounded-xl">
          <Zap size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No sections for {SECTIONS.find((s) => s.key === activeSection)?.label}</p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            Default "Recently Added" sections are being initialized. Refresh if they don't appear.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Zap size={14} className="inline mr-1" />
              {seedMutation.isPending ? 'Initializing...' : 'Initialize Defaults'}
            </button>
            <button
              onClick={() => {
                setEditingId(null);
                resetForm();
                setShowForm(true);
              }}
              className="bg-gold hover:bg-gold-light text-background px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus size={14} className="inline mr-1" />
              Add Section
            </button>
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedSections.map((s) => s._id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {sortedSections.map((section) => (
                <SortableSectionRow
                  key={section._id}
                  section={section}
                  onEdit={() => handleEdit(section)}
                  onDelete={() => {
                    if (confirm('Delete this section? This cannot be undone.')) {
                      deleteMutation.mutate(section._id);
                    }
                  }}
                  onToggle={() =>
                    toggleMutation.mutate({ id: section._id, isVisible: !section.isVisible })
                  }
                  onManageContent={() => setManagingSectionId(section._id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {sections.length > 0 && (
        <div className="text-xs text-text-muted bg-surface-light p-3 rounded-lg">
          <p className="font-semibold mb-2">💡 Tips</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Drag the ⠿ handle to reorder sections — order syncs to the app</li>
            <li>Sections marked <span className="text-emerald-400 font-semibold">Auto</span> are system-managed: they auto-populate with the 20 newest items of each type</li>
            <li>Click + to add or remove content from manual (non-auto) sections</li>
            <li>Toggle the switch to hide a section without deleting it</li>
          </ul>
        </div>
      )}
    </div>
  );
}
