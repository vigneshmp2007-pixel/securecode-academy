import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  const refresh = useCallback(async () => {
    try { setMe(await api('/auth/me')); }
    catch (e) { if (e.status === 401) { setToken(null); setMe(null); } }
  }, []);

  useEffect(() => { if (getToken()) refresh().finally(() => setLoading(false)); }, [refresh]);

  const value = useMemo(() => ({
    me, user: me?.user, loading, refresh,
    async login(email, password) {
      const d = await api('/auth/login', { method: 'POST', body: { email, password } });
      setToken(d.token); setMe({ user: d.user, badges: d.badges, stats: d.stats });
    },
    async register(form) {
      const d = await api('/auth/register', { method: 'POST', body: form });
      setToken(d.token); setMe({ user: d.user, badges: d.badges, stats: d.stats });
    },
    logout() { setToken(null); setMe(null); },
  }), [me, loading, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
