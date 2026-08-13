import type { NextConfig } from "next";

/**
 * Базовый адрес backend-API (для прокси статики).
 * NEXT_PUBLIC_API_URL задан в frontend/.env.local (=http://localhost:5000 в dev).
 * Фолбэк — локальный backend, чтобы приложение работало и без .env.
 */
const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const nextConfig: NextConfig = {
  /**
   * Проксирование загруженных файлов.
   *
   * Проблема: загруженные файлы физически лежат на backend (порт 5000),
   * а браузер открывает фронтенд на порту 3000. В блоках новостей url файла
   * хранится как относительный путь `/uploads/...`. Без прокси браузер
   * запросит `/uploads/...` у Next.js (:3000) и получит 404.
   *
   * Решение: `rewrites()` — любой запрос `/uploads/:path*` Next.js прозрачно
   * перенаправляет на backend (`<backendUrl>/uploads/:path*`). Для браузера
   * файл выглядит так, будто лежит на том же домене, что и фронтенд.
   */
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
