import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { PHASE } from '@mafia/shared';
import { loadPersisted, useGameStore } from './store/gameStore';
import { HomePage } from './pages/HomePage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { Header } from './components/Header';
import { ToastHost } from './components/Toast';
import { Backdrop } from './components/Backdrop';
import { MusicController } from './components/MusicController';

function Shell() {
  return (
    <div className="min-h-full flex flex-col relative">
      <Backdrop />
      <MusicController />
      <Header />
      <main className="flex-1 w-full max-w-screen-sm mx-auto px-4 py-6 relative z-10">
        <Outlet />
      </main>
      <ToastHost />
    </div>
  );
}

function LobbyGuard() {
  const lobby = useGameStore((s) => s.lobby);
  const playerId = useGameStore((s) => s.playerId);
  const persisted = loadPersisted();
  // On a fresh page load, playerId isn't in store yet — but if sessionStorage
  // has one, reconnect is in flight. Hold the route and wait.
  if (!playerId && !persisted.playerId) return <Navigate to="/" replace />;
  if (!lobby) {
    return <div className="text-center text-slate-400 py-10">Reconnecting…</div>;
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
