import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.accessToken, data.refreshToken ?? null, data.user);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-gold text-3xl tracking-[0.3em]">CINEVAULT</h1>
          <p className="text-text-secondary mt-2 text-sm">Admin Portal</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-border rounded-2xl p-8 space-y-5"
        >
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-gold transition-colors"
              placeholder="admin@cinevault.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-gold transition-colors"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold hover:bg-gold-light text-background font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
