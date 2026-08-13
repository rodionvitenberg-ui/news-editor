/**
 * axios-клиент: центральная точка всех запросов к бэкенду.
 *
 * Что делает:
 * 1. База URL берётся из NEXT_PUBLIC_API_URL (файл .env.local).
 *    В dev — http://localhost:5000 (наш Express API).
 * 2. Перед каждым запросом (interceptor) добавляет заголовок
 *    Authorization: Bearer <jwt>, если токен есть в localStorage.
 *
 * NEXT_PUBLIC_* — переменные Next.js, доступные и на клиенте,
 * и на сервере (префикс публичности обязателен).
 */

import axios from 'axios';

/** Базовый URL API (из .env.local, по умолчанию локальный backend). */
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/** Единственный общий экземпляр axios для всего приложения. */
export const apiClient = axios.create({ baseURL });

// Перехватчик запросов: до отправки на сервер добавляем токен.
apiClient.interceptors.request.use((config) => {
  // Токен храним в localStorage (в браузере). Next.js рендерит и на сервере,
  // поэтому guard'ом проверяем наличие window (иначе упадёт при SSR).
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('winbd_token');
    if (token) {
      // Authorization — стандартный заголовок «Bearer <токен>»,
      // именно его проверяет наш authMiddleware на бэкенде.
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
