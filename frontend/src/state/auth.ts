import { create } from 'zustand';
import axios from 'axios';

export interface User { id: string; email: string; displayName?: string; totpEnabled?: boolean }
interface Tokens { access: string; refresh: string }
interface AuthState {
  user?: User;
  tokens?: Tokens;
  login: (user: User, tokens: Tokens) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  login: (user, tokens) => set({ user, tokens }),
  logout: () => set({ user: undefined, tokens: undefined }),
  refresh: async () => {
    const { tokens, user } = get();
    if (!tokens) return;
    try {
      const res = await axios.post('http://localhost:3000/auth/refresh', { refreshToken: tokens.refresh });
      set({ tokens: { access: res.data.tokens.access, refresh: res.data.tokens.refresh }, user });
    } catch {
      set({ user: undefined, tokens: undefined });
    }
  }
}));

// Axios interceptor helper (optional future)
