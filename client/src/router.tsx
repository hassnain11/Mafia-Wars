import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useGameStore } from './store/gameStore';
import { HomePage } from './pages/HomePage';
import { LobbyPage } from './pages/LobbyPage';
import { Header } from './components/Header';
import { ToastHost } from './components/Toast';

function Shell() {
  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-screen-sm mx-auto px-4 py-6">
        <Outlet />
      </main>
      <ToastHost />
    </div>
  );
}

function LobbyGuard() {
  const lobby = useGameStore((s) => s.lobby);
  const playerId = useGameStore((s) => s.playerId);
  if (!lobby || !playerId) return <Navigate to="/" replace />;
  return <LobbyPage />;
}

export const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/lobby/:code', element: <LobbyGuard /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
