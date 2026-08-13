/**
 * NotificationsProvider — контекст уведомлений (real-time).
 *
 * Назначение:
 * - Подключить ОДИН Socket.io-клиент к нашему бэкенду (фаза 5 на сервере
 *   эмитит news:created / news:updated / news:deleted).
 * - Складывать полученные события в список уведомлений.
 * - Предоставить компонентам useNotifications() для чтения и очистки.
 *
 * ВАЖНО: подключение создаём только в браузере (typeof window !== 'undefined'),
 * чтобы не ломать SSR Next.js.
 */

'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { NewsSocketEvent } from '../../types/api';

/** Базовый URL API (тот же, что у axios). */
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/** Уведомление в колокольчике. */
export interface NotificationItem {
  id: string;
  /** id самой новости — нужен для перехода на страницу новости по клику. */
  newsId: string;
  kind: 'created' | 'updated' | 'deleted';
  title: string;
  at: string; // ISO date
}

interface NotificationsContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  clear: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

/**
 * Провайдер: подключается к сокету один раз и слушает события новостей.
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    // В SSR (серверный рендер) браузерных API нет — пропускаем.
    if (typeof window === 'undefined') return;

    // Socket.io сам переподключается при разрыве — удобно.
    const socket: Socket = io(baseURL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    /** Общий обработчик: добавляет уведомление в начало списка. */
    function pushNotification(kind: NotificationItem['kind'], data: NewsSocketEvent) {
      setNotifications((prev) => [
        {
          id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          newsId: data.id, // id новости из события — по нему переходим по клику
          kind,
          title: data.title,
          at: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 30)); // держим максимум 30 уведомлений в памяти
    }

    socket.on('news:created', (data: NewsSocketEvent) => pushNotification('created', data));
    socket.on('news:updated', (data: NewsSocketEvent) => pushNotification('updated', data));
    socket.on('news:deleted', (data: NewsSocketEvent) => pushNotification('deleted', data));

    // Очистка при размонтировании.
    return () => {
      socket.disconnect();
    };
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  const value = useMemo<NotificationsContextValue>(
    () => ({ notifications, unreadCount: notifications.length, clear }),
    [notifications, clear]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

/** Хук для чтения уведомлений из любого компонента. */
export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications должен использоваться внутри <NotificationsProvider>');
  }
  return ctx;
}
