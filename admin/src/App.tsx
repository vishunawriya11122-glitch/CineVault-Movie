import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MoviesPage from './pages/MoviesPage';
import MovieFormPage from './pages/MovieFormPage';
import MovieDetailsPage from './pages/MovieDetailsPage';
import SeriesPage from './pages/SeriesPage';
import AnimePage from './pages/AnimePage';
import UsersPage from './pages/UsersPage';
import BannersPage from './pages/BannersPage';
import HomeSectionsPage from './pages/HomeSectionsPage';
import MeSectionsPage from './pages/MeSectionsPage';
import ReviewsPage from './pages/ReviewsPage';
import NotificationsPage from './pages/NotificationsPage';
import AppUpdatePage from './pages/AppUpdatePage';
import TmdbImportPage from './pages/TmdbImportPage';
import StoragePage from './pages/StoragePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="movies" element={<MoviesPage />} />
        <Route path="movies/new" element={<MovieFormPage />} />
        <Route path="movies/:id" element={<MovieDetailsPage />} />
        <Route path="movies/:id/edit" element={<MovieFormPage />} />
        <Route path="series" element={<SeriesPage />} />
        <Route path="anime" element={<AnimePage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="banners" element={<BannersPage />} />
        <Route path="home-sections" element={<HomeSectionsPage />} />
        <Route path="me-sections" element={<MeSectionsPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="app-update" element={<AppUpdatePage />} />
        <Route path="tmdb-import" element={<TmdbImportPage />} />
        <Route path="storage" element={<StoragePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
