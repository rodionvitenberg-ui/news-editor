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
  // Ленивая инициализация из localStorage — чтение во время рендера,
  // а не синхронный setState внутри эффекта (правило set-state-in-effect).
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  });

  const [user, setUser] = useState<User | null>(null);

  // loading=true только если есть токен, который нужно проверить на бэкенде.
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem(TOKEN_KEY));
  });

  // При монтировании (в браузере): если токен есть — проверяем его на бэкенде.
  // Все setState находятся внутри колбэков промиса — синхронного вызова
  // прямо в теле эффекта нет (соответствует react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    // axios-интерцептор сам добавит Authorization: Bearer <token>.
    apiClient
      .get<MeResponse>('/api/auth/me')
      .then(({ data }) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        // Токен невалиден/истёк — стираем его.
        if (cancelled) return;
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

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
