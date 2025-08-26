import React, { useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../state/auth';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | undefined>();
  const login = useAuthStore(s => s.login);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const endpoint = mode === 'login' ? 'login' : 'register';
      const payload: any = { email, password };
      if (mode === 'register') payload.displayName = displayName;
      const res = await axios.post(`http://localhost:3000/auth/${endpoint}`, payload);
      login(res.data.user, res.data.tokens);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Login failed');
    }
  }

  return (
    <div className="space-y-4 max-w-sm">
      <div className="flex space-x-2 text-sm">
        <button type="button" onClick={() => setMode('login')} className={`px-2 py-1 rounded ${mode==='login'?'bg-blue-600':'bg-gray-700'}`}>Login</button>
        <button type="button" onClick={() => setMode('register')} className={`px-2 py-1 rounded ${mode==='register'?'bg-blue-600':'bg-gray-700'}`}>Register</button>
      </div>
      <form onSubmit={submit} className="space-y-2">
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full p-2 bg-gray-800 rounded" />
        {mode==='register' && <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display Name" className="w-full p-2 bg-gray-800 rounded" />}
        <input value={password} type="password" onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full p-2 bg-gray-800 rounded" />
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <button className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded">{mode==='login'?'Login':'Create Account'}</button>
      </form>
    </div>
  );
}
