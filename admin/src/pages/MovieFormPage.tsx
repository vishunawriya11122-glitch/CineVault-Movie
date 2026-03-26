import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, X } from 'lucide-react';
import api from '../lib/api';
import type { Movie, CastMember, StreamingSource } from '../types';
import toast from 'react-hot-toast';

export default function MovieFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: '',
    synopsis: '',
    posterUrl: '',
    backdropUrl: '',
    trailerUrl: '',
    genres: [] as string[],
    contentType: 'movie' as 'movie' | 'series' | 'documentary' | 'anime' | 'web_series' | 'tv_show' | 'short_film',
    contentRating: '',
    releaseYear: new Date().getFullYear(),
    duration: 0,
    status: 'draft' as 'draft' | 'published' | 'archived',
    cast: [] as CastMember[],
    streamingSources: [] as StreamingSource[],
    tags: [] as string[],
  });

  const [genreInput, setGenreInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  const { data: movie } = useQuery<Movie>({
    queryKey: ['movie', id],
    queryFn: async () => {
      const { data } = await api.get(`/movies/${id}`);
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (movie) {
      setForm({
        title: movie.title,
        synopsis: movie.synopsis ?? '',
        posterUrl: movie.posterUrl,
        backdropUrl: movie.backdropUrl ?? '',
        trailerUrl: movie.trailerUrl ?? '',
        genres: movie.genres,
        contentType: movie.contentType,
        contentRating: movie.contentRating ?? '',
        releaseYear: movie.releaseYear,
        duration: movie.duration ?? 0,
        status: movie.status,
        cast: movie.cast,
        streamingSources: movie.streamingSources,
        tags: movie.tags,
      });
    }
  }, [movie]);

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      isEdit ? api.patch(`/movies/${id}`, data) : api.post('/movies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      toast.success(isEdit ? 'Content updated' : 'Content created');
      navigate('/movies');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to save';
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const addGenre = () => {
    if (genreInput.trim() && !form.genres.includes(genreInput.trim())) {
      setForm({ ...form, genres: [...form.genres, genreInput.trim()] });
      setGenreInput('');
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const addCastMember = () => {
    setForm({ ...form, cast: [...form.cast, { name: '', role: '', character: '', photoUrl: '' }] });
  };

  const updateCast = (idx: number, field: string, value: string) => {
    const updated = [...form.cast];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, cast: updated });
  };

  const addStreamingSource = () => {
    setForm({ ...form, streamingSources: [...form.streamingSources, { quality: '1080p', url: '', type: 'hls' }] });
  };

  const updateSource = (idx: number, field: string, value: string) => {
    const updated = [...form.streamingSources];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, streamingSources: updated });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/movies')} className="text-text-secondary hover:text-text-primary">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-semibold">{isEdit ? 'Edit Content' : 'Add New Content'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <section className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-medium">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Content Type *</label>
              <select
                value={form.contentType}
                onChange={(e) => setForm({ ...form, contentType: e.target.value as typeof form.contentType })}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
              >
                <option value="movie">Movie</option>
                <option value="web_series">Web Series</option>
                <option value="tv_show">TV Show</option>
                <option value="documentary">Documentary</option>
                <option value="anime">Anime</option>
                <option value="short_film">Short Film</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Description *</label>
            <textarea
              value={form.synopsis}
              onChange={(e) => setForm({ ...form, synopsis: e.target.value })}
              rows={4}
              className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Release Year</label>
              <input
                type="number"
                value={form.releaseYear}
                onChange={(e) => setForm({ ...form, releaseYear: parseInt(e.target.value) || 0 })}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Duration (min)</label>
              <input
                type="number"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 0 })}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Content Rating</label>
              <select
                value={form.contentRating}
                onChange={(e) => setForm({ ...form, contentRating: e.target.value })}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
              >
                <option value="">None</option>
                <option value="G">G</option>
                <option value="PG">PG</option>
                <option value="PG-13">PG-13</option>
                <option value="R">R</option>
                <option value="NC-17">NC-17</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </section>

        {/* Media URLs */}
        <section className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-medium">Media</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Poster URL *</label>
              <input
                type="url"
                value={form.posterUrl}
                onChange={(e) => setForm({ ...form, posterUrl: e.target.value })}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Backdrop URL</label>
              <input
                type="url"
                value={form.backdropUrl}
                onChange={(e) => setForm({ ...form, backdropUrl: e.target.value })}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Trailer URL</label>
            <input
              type="url"
              value={form.trailerUrl}
              onChange={(e) => setForm({ ...form, trailerUrl: e.target.value })}
              className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
            />
          </div>
        </section>

        {/* Genres & Tags */}
        <section className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-medium">Genres & Tags</h2>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Genres</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {form.genres.map((g) => (
                <span key={g} className="flex items-center gap-1 bg-gold/10 text-gold px-3 py-1 rounded-full text-sm">
                  {g}
                  <button type="button" onClick={() => setForm({ ...form, genres: form.genres.filter((x) => x !== g) })}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={genreInput}
                onChange={(e) => setGenreInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGenre())}
                placeholder="Add genre"
                className="flex-1 bg-surface-light border border-border rounded-xl px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-gold"
              />
              <button type="button" onClick={addGenre} className="px-3 py-2 bg-surface-light border border-border rounded-xl text-sm hover:border-gold transition-colors">
                Add
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Tags</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {form.tags.map((t) => (
                <span key={t} className="flex items-center gap-1 bg-surface-light text-text-secondary px-3 py-1 rounded-full text-sm">
                  {t}
                  <button type="button" onClick={() => setForm({ ...form, tags: form.tags.filter((x) => x !== t) })}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag"
                className="flex-1 bg-surface-light border border-border rounded-xl px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-gold"
              />
              <button type="button" onClick={addTag} className="px-3 py-2 bg-surface-light border border-border rounded-xl text-sm hover:border-gold transition-colors">
                Add
              </button>
            </div>
          </div>
        </section>

        {/* Cast */}
        <section className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Cast</h2>
            <button type="button" onClick={addCastMember} className="flex items-center gap-1 text-sm text-gold hover:text-gold-light">
              <Plus size={16} /> Add Member
            </button>
          </div>
          {form.cast.map((member, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-surface-light rounded-lg">
              <input
                placeholder="Name"
                value={member.name}
                onChange={(e) => updateCast(idx, 'name', e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold"
              />
              <input
                placeholder="Role (Actor, Director...)"
                value={member.role}
                onChange={(e) => updateCast(idx, 'role', e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold"
              />
              <input
                placeholder="Character name"
                value={member.character ?? ''}
                onChange={(e) => updateCast(idx, 'character', e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold"
              />
              <div className="flex gap-2">
                <input
                  placeholder="Photo URL"
                  value={member.photoUrl ?? ''}
                  onChange={(e) => updateCast(idx, 'photoUrl', e.target.value)}
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold"
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, cast: form.cast.filter((_, i) => i !== idx) })}
                  className="text-error hover:text-error/80"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* Streaming Sources */}
        <section className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Streaming Sources</h2>
            <button type="button" onClick={addStreamingSource} className="flex items-center gap-1 text-sm text-gold hover:text-gold-light">
              <Plus size={16} /> Add Source
            </button>
          </div>
          {form.streamingSources.map((src, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-surface-light rounded-lg">
              <select
                value={src.quality}
                onChange={(e) => updateSource(idx, 'quality', e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold"
              >
                <option value="4k">4K</option>
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
              </select>
              <select
                value={src.type}
                onChange={(e) => updateSource(idx, 'type', e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold"
              >
                <option value="hls">HLS</option>
                <option value="dash">DASH</option>
                <option value="mp4">MP4</option>
              </select>
              <input
                placeholder="Stream URL"
                value={src.url}
                onChange={(e) => updateSource(idx, 'url', e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold"
              />
              <button
                type="button"
                onClick={() => setForm({ ...form, streamingSources: form.streamingSources.filter((_, i) => i !== idx) })}
                className="text-error hover:text-error/80 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </section>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate('/movies')}
            className="px-6 py-2.5 rounded-xl border border-border text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-6 py-2.5 rounded-xl bg-gold hover:bg-gold-light text-background font-semibold transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Content' : 'Create Content'}
          </button>
        </div>
      </form>
    </div>
  );
}
