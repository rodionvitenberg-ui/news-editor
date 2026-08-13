/**
 * Editor — ядро блочного редактора.
 *
 * Что здесь:
 * - массив blocks (состояние) + функции add/update/remove/move;
 * - тулбар добавления блоков;
 * - предпросмотр статьи (переключатель «Редактор / Предпросмотр»);
 * - сохранение (POST /api/news) и публикация (сейчас или по дате).
 *
 * Публикация (см. ADR 0001):
 * - «Опубликовать сейчас» → POST { blocks, publishNow: true };
 * - «Отложить на дату» → POST { blocks, publishAt: 'YYYY-MM-DDTHH:mm' };
 *   бэкенд ставит status: 'draft', но покажет статью после наступления даты.
 */

'use client';

import { FormEvent, useMemo, useState } from 'react';
import { apiClient } from '../../api/client';
import type { Block, News, NewsResponse } from '../../types/api';
import { Toolbar } from './Toolbar';
import { BlockEditor } from './BlockEditor';
import { BlockPreview } from './BlockPreview';
import { UploadButton } from './UploadButton';

interface EditorProps {
  /** Колбэк после успешного сохранения/публикации (id новости). */
  onSaved: (id: string) => void;
  /** Существующая новость — включаем режим редактирования (PUT вместо POST). */
  initialNews?: News;
}

/** Создаёт пустой блок нужного типа с полями по умолчанию. */
function createEmptyBlock(type: Block['type']): Block {
  switch (type) {
    case 'text':
      return { type, text: '', style: 'paragraph' };
    case 'image':
      return { type, url: '', caption: '' };
    case 'quote':
      return { type, text: '', author: '' };
    case 'code':
      return { type, code: '', language: 'js' };
    case 'file':
      return { type, url: '', name: '', size: 0 };
    default:
      return { type };
  }
}

/**
 * Переводит дату (ISO-строка или Date) в формат input[type=datetime-local]
 * 'YYYY-MM-DDTHH:mm' по ЛОКАЛЬНОМУ времени. Если дата невалидна — пустая строка.
 *
 * Почему локальное время: пользователь видит дату в своей таймзоне,
 * а datetime-local хранит именно локальные значения (без буквы Z и смещения).
 */
function toDatetimeLocal(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function Editor({ onSaved, initialNews }: EditorProps) {
  // В режиме редактирования поля сразу заполняются данными существующей новости.
  // initialNews._id используется как id для PUT-запроса при сохранении.
  const [title, setTitle] = useState(initialNews?.title ?? '');
  const [blocks, setBlocks] = useState<Block[]>(initialNews?.blocks ?? []);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [publishAt, setPublishAt] = useState(initialNews ? toDatetimeLocal(initialNews.publishAt) : '');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Предпросмотр — это тот же массив blocks.
  const previewBlocks = useMemo(() => blocks, [blocks]);

  function addBlock(type: Block['type']) {
    setBlocks((prev) => [...prev, createEmptyBlock(type)]);
  }

  function updateBlock(index: number, next: Block) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? next : b)));
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, dir: -1 | 1) {
    setBlocks((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  /** Действие сохранения: черновик (без даты) / отложенная публикация (с датой) / сейчас. */
  type SaveAction = 'draft' | 'schedule' | 'publishNow';

  async function save(action: SaveAction) {
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      // Отложить можно только при указанной дате.
      if (action === 'schedule' && !publishAt) {
        setError('Укажите дату публикации, чтобы отложить новость');
        return;
      }

      const body: Record<string, unknown> = { title, blocks };
      if (action === 'publishNow') {
        body.publishNow = true;
      } else if (action === 'schedule') {
        body.publishAt = publishAt; // 'YYYY-MM-DDTHH:mm' — бэкенд сделает new Date(publishAt)
      }
      // draft: без publishNow/publishAt — чистый черновик (status 'draft').

      const { data } = initialNews
        ? await apiClient.put<NewsResponse>(`/api/news/${initialNews._id}`, body)
        : await apiClient.post<NewsResponse>('/api/news', body);
      onSaved(data.news._id);
      setMessage(
        action === 'publishNow'
          ? 'Новость опубликована!'
          : action === 'schedule'
            ? 'Новость отложена до указанной даты'
            : initialNews
              ? 'Новость сохранена'
              : 'Черновик сохранён'
      );
    } catch (err) {
      const m = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(m || 'Не удалось сохранить новость');
    } finally {
      setSubmitting(false);
    }
  }

  function handleDraft(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    save('draft');
  }

  return (
    <div className="editor">
      <h1 className="editor__title">{initialNews ? 'Редактирование новости' : 'Редактор новости'}</h1>

      <form onSubmit={handleDraft} className="editor__form">
        <label className="field">
          <span className="field__label">Заголовок</span>
          <input
            className="field__input field__input--large"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заголовок статьи..."
            required
          />
        </label>

        <Toolbar onAdd={addBlock} />

        {blocks.length === 0 && (
          <p className="muted-text editor__empty">
            Нажмите «+ ...», чтобы добавить первый блок.
          </p>
        )}

        <div className="editor__mode-toggle">
          <button
            type="button"
            className={`btn ${mode === 'edit' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setMode('edit')}
          >
            Редактор
          </button>
          <button
            type="button"
            className={`btn ${mode === 'preview' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setMode('preview')}
          >
            Предпросмотр
          </button>
        </div>

        {mode === 'edit' ? (
          <div className="editor__blocks">
            {blocks.map((block, index) => (
              <div key={index} className="editor-block">
                <div className="editor-block__move">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={index === 0}
                    onClick={() => moveBlock(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={index === blocks.length - 1}
                    onClick={() => moveBlock(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost editor-block__remove"
                    onClick={() => removeBlock(index)}
                  >
                    ✕
                  </button>
                </div>

                <BlockEditor block={block} onChange={(next) => updateBlock(index, next)} />

                {/* Загрузка файла удобна для image и file-блоков: подставляет url в блок. */}
                {(block.type === 'image' || block.type === 'file') && (
                  <UploadButton onUploaded={(up) => updateBlock(index, { ...block, ...up })} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="editor__preview">
            {title && <h1>{title}</h1>}
            {previewBlocks.map((block, i) => (
              <BlockPreview key={i} block={block} />
            ))}
            {!title && previewBlocks.length === 0 && (
              <p className="muted-text">Пусто — добавьте блоки и заголовок.</p>
            )}
          </div>
        )}

        <div className="editor__publish">
          <label className="field">
            <span className="field__label">Отложить публикацию на дату</span>
            <input
              className="field__input"
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
            />
          </label>

          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}

          <div className="editor__actions">
            <button className="btn btn--secondary" type="submit" disabled={submitting}>
              {submitting ? 'Сохраняем...' : 'Сохранить черновик'}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={submitting}
              onClick={() => save('schedule')}
            >
              {submitting ? 'Откладываем...' : 'Отложить публикацию'}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={submitting}
              onClick={() => save('publishNow')}
            >
              {submitting ? 'Публикуем...' : 'Опубликовать сейчас'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
