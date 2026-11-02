import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { User } from '../db/types';

interface ProfileContextValue {
  user: User | null;
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const profile = useLiveQuery(
    async () => (await db.users.orderBy('createdAt').first()) ?? null,
    [],
    undefined,
  );
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    if (profile !== undefined && !loadedOnce) setLoadedOnce(true);
  }, [profile, loadedOnce]);

  const value = useMemo(
    () => ({
      user: profile ?? null,
      loading: profile === undefined || !loadedOnce,
    }),
    [profile, loadedOnce],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within ProfileProvider');
  return context;
}
