/**
 * Редактор блока-картинки.
 * Пользователь вводит URL изображения и подпись.
 * (Загрузка файла на сервер — через /api/upload; тут редактируем поля блока.)
 */

'use client';

import type { Block } from '../../../types/api';

interface ImageBlockProps {
  block: Block;
  onChange: (next: Block) => void;
}

export function ImageBlock({ block, onChange }: ImageBlockProps) {
  function handleChange(patch: Partial<Block>) {
    onChange({ ...block, ...patch });
  }

  return (
    <div className="editor-block">
      <label className="editor-block__label">URL изображения</label>
      <input
        className="editor-block__input"
        type="url"
        value={block.url ?? ''}
        onChange={(e) => handleChange({ url: e.target.value })}
        placeholder="https://... или /uploads/photo.jpg"
      />
      <label className="editor-block__label">Подпись</label>
      <input
        className="editor-block__input"
        type="text"
        value={block.caption ?? ''}
        onChange={(e) => handleChange({ caption: e.target.value })}
        placeholder="Подпись к картинке (необязательно)"
      />
    </div>
  );
}
