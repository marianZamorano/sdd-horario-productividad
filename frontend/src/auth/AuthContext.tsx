import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import { api, tokenStorage } from '../api/client';
import type { AuthResponse, UserDto } from '../api/types';

const USER_KEY = 'horario.user';

interface AuthContextValue {
  user: UserDto | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components -- el contexto se consume desde useAuth
export const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): UserDto | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw && tokenStorage.get() ? (JSON.parse(raw) as UserDto) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(readStoredUser);

  const startSession = useCallback((response: AuthResponse) => {
    tokenStorage.set(response.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    setUser(response.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      startSession(await api.post<AuthResponse>('/auth/login', { email, password }));
    },
    [startSession],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      // La zona del navegador define cómo se calculan semanas y rachas (research R4).
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      startSession(
        await api.post<AuthResponse>('/auth/register', { email, password, timezone }),
      );
    },
    [startSession],
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, login, register, logout }),
    [user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
