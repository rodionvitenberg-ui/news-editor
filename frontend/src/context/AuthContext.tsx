/**
 * AuthContext — глобальное состояние авторизации.
 *
 * С помощью Context API (useContext) ЛЮБОЙ компонент приложения может
 * получить текущего пользователя, токен и функции login/register/logout —
 * без передачи через props (prop drilling).
 *
 * Поскольку Next.js может рендерить на сервере, а localStorage доступен
 * только в браузере, используем флаг hydration (typeof window).
 */

'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import type { AuthResponse, MeResponse, User } from '../types/api';

/** Ключ, под которым храним JWT в localStorage. */
const TOKEN_KEY = 'winbd_token';

/** Интерфейс значения контекста. */
interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

/** Контекст с «пустым» значением по умолчанию (тип говорит, что может быть undefined). */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Провайдер: оборачивает приложение и предоставляет состояние авторизации.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // При монтировании (в браузере) пробуем восстановить сессию из localStorage.
  useEffect(() => {
    // Если localStorage недоступен (SSR) — просто выходим.
    if (typeof window === 'undefined') return;

    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setLoading(false);
      return;
    }

    // Токен есть — проверяем его на бэкенде: GET /api/auth/me.
    // (axios-интерцептор сам добавит Authorization: Bearer <savedToken>.)
    setToken(savedToken);
    apiClient
      .get<MeResponse>('/api/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => {
        // Токен невалиден/истёк — стираем его.
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Сохраняем и токен, и пользователя после успешной авторизации.
  const setAuthData = useCallback((data: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  /** POST /api/auth/login. */
  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post<AuthResponse>('/api/auth/login', { email, password });
    setAuthData(data);
  }, [setAuthData]);

  /** POST /api/auth/register. */
  const register = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post<AuthResponse>('/api/auth/register', { email, password });
    setAuthData(data);
  }, [setAuthData]);

  /** Выход: стираем токен и пользователя. */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Мемоизируем значение, чтобы контекст не пересоздавался на каждый рендер.
  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Хук-«обёртка» над useContext: компонентам удобнее писать useAuth(),
 * а не проверять undefined на каждом шагу.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth должен использоваться внутри <AuthProvider>');
  }
  return ctx;
}
