/**
 * Кнопка загрузки файла на сервер (POST /api/upload, multipart/form-data).
 * После успеха вызывает onUploaded({ url, name, size, mimetype }) —
 * Editor сможет подставить результат в блок image или file.
 */

'use client';

import { useRef, useState } from 'react';
import { apiClient } from '../../api/client';
import type { UploadResponse } from '../../types/api';

interface UploadButtonProps {
  label?: string;
  onUploaded: (upload: UploadResponse) => void;
}

export function UploadButton({ label = 'Загрузить файл', onUploaded }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  /** Пользователь выбрал файл — отправляем через axios FormData. */
  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError('');

    try {
      const form = new FormData();
      form.append('file', file);
      // НЕ задаём 'Content-Type' вручную: если указать 'multipart/form-data' без
      // boundary, multer на сервере не распарсит файл (запрос вернёт ошибку).
      // Axios сам проставит корректный 'Content-Type: multipart/form-data; boundary=...'.
      const { data } = await apiClient.post<UploadResponse>('/api/upload', form);
      onUploaded(data);
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message || 'Ошибка загрузки файла');
    } finally {
      setUploading(false);
      // Позволяет выбрать тот же файл повторно.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="upload-area">
      <button
        type="button"
        className="btn btn--secondary"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'Загружаем...' : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="upload-area__input"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
