import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Users, Film, Eye, TrendingUp, Tv, PlayCircle, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [resetting, setResetting] = useState(false);

  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/dashboard');
      return data;
    },
  });

  const { data: signupData } = useQuery<any[]>({
    queryKey: ['signups'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/signups?days=30');
      return data.map((d: any) => ({ date: d._id, count: d.count }));
    },
  });

  const { data: viewAnalytics } = useQuery<any>({
    queryKey: ['viewAnalytics'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/views');
      return data;
    },
  });

  const { data: topSeries } = useQuery<any[]>({
    queryKey: ['topSeries'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/top-series?limit=10');
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-5 animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  const handleResetViews = async () => {
    if (!confirm('Reset ALL view counts to zero? This cannot be undone.')) return;
    setResetting(true);
    try {
      const { data } = await api.post('/analytics/reset-views');
      toast.success(`Reset done: ${data.moviesReset} movies, ${data.episodesReset} episodes, ${data.viewsDeleted} view records cleared`);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['viewAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['topSeries'] });
    } catch {
      toast.error('Failed to reset views');
    } finally {
      setResetting(false);
    }
  };

  const statCards = [
    { label: 'Total Users', value: stats?.users?.total ?? 0, icon: Users, color: 'text-blue-400' },
    { label: 'Total Content', value: stats?.content?.total ?? 0, icon: Film, color: 'text-gold' },
    { label: 'Unique Views', value: viewAnalytics?.totalUniqueViews ?? 0, icon: Eye, color: 'text-green-400' },
    { label: 'Active Today', value: stats?.users?.dau ?? 0, icon: TrendingUp, color: 'text-purple-400' },
    { label: 'Movie Views', value: viewAnalytics?.movieViews ?? 0, icon: PlayCircle, color: 'text-red-400' },
    { label: 'Episode Views', value: viewAnalytics?.episodeViews ?? 0, icon: Tv, color: 'text-cyan-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <button
          onClick={handleResetViews}
          disabled={resetting}
          className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30 transition-colors disabled:opacity-50 text-sm"
        >
          <RotateCcw size={16} />
          {resetting ? 'Resetting...' : 'Reset All Views'}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4"
          >
            <div className={`p-2.5 rounded-lg bg-surface-light ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stat.value.toLocaleString()}</p>
              <p className="text-sm text-text-secondary">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signups chart */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-lg font-medium mb-4">User Signups</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={signupData ?? []}>
              <defs>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F5A623" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F5A623" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#6B6B6B', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6B6B6B', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: '#1E1E1E',
                  border: '1px solid #2A2A2A',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                }}
              />
              <Area type="monotone" dataKey="count" stroke="#F5A623" fill="url(#goldGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top watched */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-lg font-medium mb-4">Most Watched</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats?.topWatched ?? []} layout="vertical">
              <XAxis type="number" tick={{ fill: '#6B6B6B', fontSize: 12 }} />
              <YAxis type="category" dataKey="title" width={120} tick={{ fill: '#A0A0A0', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: '#1E1E1E',
                  border: '1px solid #2A2A2A',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                }}
              />
              <Bar dataKey="viewCount" fill="#F5A623" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Series by Episode Views */}
      {topSeries && topSeries.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-lg font-medium mb-4">Top Series by Episode Views</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topSeries} layout="vertical">
              <XAxis type="number" tick={{ fill: '#6B6B6B', fontSize: 12 }} />
              <YAxis type="category" dataKey="title" width={150} tick={{ fill: '#A0A0A0', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: '#1E1E1E',
                  border: '1px solid #2A2A2A',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                }}
              />
              <Bar dataKey="totalEpisodeViews" fill="#22d3ee" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* View analytics summary */}
      {viewAnalytics && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-lg font-medium mb-4">View Tracking Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400">{(viewAnalytics.totalUniqueViews ?? 0).toLocaleString()}</p>
              <p className="text-sm text-text-secondary">Total Unique Views</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-400">{(viewAnalytics.movieViews ?? 0).toLocaleString()}</p>
              <p className="text-sm text-text-secondary">Movie Views</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-cyan-400">{(viewAnalytics.episodeViews ?? 0).toLocaleString()}</p>
              <p className="text-sm text-text-secondary">Episode Views</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-400">{(viewAnalytics.recentViews ?? 0).toLocaleString()}</p>
              <p className="text-sm text-text-secondary">Views (Last 7 Days)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
