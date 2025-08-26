import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './state/auth';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';

const qc = new QueryClient();

function App() {
  const user = useAuthStore(s => s.user);
  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Bug Bounty Tracker</h1>
      {user ? <Dashboard /> : <Login />}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
