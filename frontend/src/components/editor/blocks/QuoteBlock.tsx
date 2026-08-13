/**
 * Редактор блока-цитаты.
 * Поля: text (текст цитаты) и author (автор, необязательно).
 */

'use client';

import type { Block } from '../../../types/api';

interface QuoteBlockProps {
  block: Block;
  onChange: (next: Block) => void;
}

export function QuoteBlock({ block, onChange }: QuoteBlockProps) {
  function handleChange(patch: Partial<Block>) {
    onChange({ ...block, ...patch });
  }

  return (
    <div className="editor-block">
      <label className="editor-block__label">Цитата</label>
      <textarea
        className="editor-block__textarea"
        value={block.text ?? ''}
        onChange={(e) => handleChange({ text: e.target.value })}
        placeholder="Текст цитаты..."
        rows={2}
      />
      <label className="editor-block__label">Автор</label>
      <input
        className="editor-block__input"
        type="text"
        value={block.author ?? ''}
        onChange={(e) => handleChange({ author: e.target.value })}
        placeholder="Автор цитаты (необязательно)"
      />
    </div>
  );
}
