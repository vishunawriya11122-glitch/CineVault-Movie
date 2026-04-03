import { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../lib/api';

interface AppSettings {
  tmdbAccessToken: string;
}

export default function SettingsPage() {
  const [form, setForm] = useState<AppSettings>({ tmdbAccessToken: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    api.get('/settings')
      .then((res) => setForm(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.put('/settings', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings. Check your permissions.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-text-secondary">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Settings</h1>
      <p className="text-text-secondary mb-6 text-sm">
        Configure API keys and integrations used by the platform.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TMDB */}
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-400 font-bold text-xs">TMDB</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">TMDB Integration</h2>
              <p className="text-sm text-text-secondary mt-0.5">
                Required for importing movies &amp; TV shows from The Movie Database.
                Get your token at{' '}
                <a
                  href="https://www.themoviedb.org/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  themoviedb.org/settings/api
                </a>
                {' '}→ <strong>API Read Access Token</strong> (starts with eyJ...)
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              API Read Access Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={form.tmdbAccessToken}
                onChange={(e) => setForm({ ...form, tmdbAccessToken: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 pr-10 text-text-primary font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent placeholder-text-muted"
                placeholder="eyJhbGciOiJSUzI1NiJ9..."
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              >
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.tmdbAccessToken && (
              <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                <CheckCircle size={12} />
                Token configured
              </p>
            )}
            {!form.tmdbAccessToken && (
              <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                Token not set — TMDB Import will not work
              </p>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-gold text-black font-semibold rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-green-400 text-sm">
              <CheckCircle size={16} />
              Saved successfully
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1.5 text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
