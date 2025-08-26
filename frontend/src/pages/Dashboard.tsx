import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../state/auth';

interface Vuln { id: string; title: string; severity: string; status: string; createdAt: string }

export function Dashboard() {
  const { user, tokens, logout, refresh } = useAuthStore();
  const [vulns, setVulns] = useState<Vuln[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => { load(); }, []);

  // simple periodic access token refresh (every 8 min if present)
  useEffect(() => {
    if (!tokens) return;
    const interval = setInterval(() => { refresh().catch(()=>{}); }, 8 * 60 * 1000);
    return () => clearInterval(interval);
  }, [tokens, refresh]);

  async function load() {
    if (!tokens) return;
    const res = await axios.get('http://localhost:3000/vulnerabilities', { headers: { Authorization: `Bearer ${tokens.access}` } });
    setVulns(res.data.vulnerabilities);
  }

  async function createVuln(e: React.FormEvent) {
    e.preventDefault();
    if (!tokens) return;
    await axios.post('http://localhost:3000/vulnerabilities', { title, description, severity: 'MEDIUM' }, { headers: { Authorization: `Bearer ${tokens.access}` } });
    setTitle(''); setDescription('');
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">Welcome {user?.displayName || user?.email}</h2>
        <div className="space-x-2 text-sm">
          <button onClick={() => enrollTotp()} className="bg-purple-600 hover:bg-purple-500 px-2 py-1 rounded">TOTP</button>
          <button onClick={() => logout()} className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">Logout</button>
        </div>
      </div>
      <form onSubmit={createVuln} className="space-y-2 mb-4">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full p-2 bg-gray-800 rounded" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="w-full p-2 bg-gray-800 rounded" />
        <button className="bg-green-600 hover:bg-green-500 px-3 py-2 rounded">Add Vulnerability</button>
      </form>
      <ul className="space-y-1">
        {vulns.map(v => <li key={v.id} className="p-2 bg-gray-800 rounded"><span className="font-medium">{v.title}</span> <span className="text-xs text-gray-400">{v.severity} · {v.status}</span></li>)}
      </ul>
    </div>
  );
}

async function enrollTotp() {
  const { tokens } = useAuthStore.getState();
  if (!tokens) return;
  const res = await axios.post('http://localhost:3000/auth/totp/enroll', {}, { headers: { Authorization: `Bearer ${tokens.access}` } });
  const otpauth = res.data.otpauth;
  alert('Scan this TOTP URI in your authenticator app:\n' + otpauth);
  const code = prompt('Enter the current 6-digit code to verify');
  if (code) {
    try {
      await axios.post('http://localhost:3000/auth/totp/verify', { code }, { headers: { Authorization: `Bearer ${tokens.access}` } });
      alert('TOTP enabled');
    } catch { alert('Verification failed'); }
  }
}
