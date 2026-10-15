import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './styles.css';
import { router } from './router';
import { initSocket } from './lib/socketWire';

initSocket();

const el = document.getElementById('root');
if (!el) throw new Error('#root not found');
createRoot(el).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
