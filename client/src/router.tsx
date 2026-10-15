import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { PHASE } from '@mafia/shared';
import { useGameStore } from './store/gameStore';
import { HomePage } from './pages/HomePage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
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
  if (!playerId) return <Navigate to="/" replace />;
  if (!lobby) {
    return <div className="text-center text-slate-400 py-10">Joining lobby…</div>;
  }
  return lobby.phase === PHASE.LOBBY ? <LobbyPage /> : <GamePage />;
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
