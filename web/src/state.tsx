import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, type Me } from './api';
import { cacheMe, clearDeviceData, flushNotes, getCachedMe } from './offline';

interface MeState {
  me: Me | null;
  loading: boolean;
  offline: boolean;
  clubId: string | null;
  setClubId: (id: string) => void;
  reload: () => Promise<Me | null>;
  logout: () => Promise<void>;
}

const MeContext = createContext<MeState | null>(null);
const CLUB_KEY = 'ht.currentClub';

export function MeProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [clubId, setClubIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CLUB_KEY);
    } catch {
      return null;
    }
  });

  const reload = useCallback(async () => {
    try {
      const data = await api.get<Me>('/me');
      setMe(data);
      setOffline(false);
      cacheMe(data);
      void flushNotes();
      return data;
    } catch (err) {
      if (err instanceof ApiError && err.offline) {
        // No network at the rink: keep working from what is cached on the phone.
        const cached = getCachedMe();
        setMe(cached);
        setOffline(true);
        return cached;
      }
      setMe(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const onOnline = () => {
      setOffline(false);
      void flushNotes();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [reload]);

  const setClubId = useCallback((id: string) => {
    setClubIdState(id);
    try {
      localStorage.setItem(CLUB_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined);
    await clearDeviceData();
    setMe(null);
  }, []);

  // Fall back to the first club if the stored one is no longer valid.
  const validClubId = me?.clubs.some((c) => c.id === clubId) ? clubId : (me?.clubs[0]?.id ?? null);

  return (
    <MeContext.Provider value={{ me, loading, offline, clubId: validClubId, setClubId, reload, logout }}>
      {children}
    </MeContext.Provider>
  );
}

export function useMe(): MeState {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error('useMe outside MeProvider');
  return ctx;
}

/** Small data-loading hook: returns data, error and a reload function. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [loading, setLoading] = useState(true);
  const run = useCallback(async () => {
    setLoading(true);
    try {
      setData(await load());
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    void run();
  }, [run]);
  return { data, setData, error, loading, reload: run };
}
