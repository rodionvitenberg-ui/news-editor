/**
 * Тулбар редактора: кнопки добавления новых блоков.
 * При нажатии вызывается onAdd(type) — Editor добавляет блок в конец массива.
 */

'use client';

import type { Block } from '../../types/api';

type BlockType = Block['type'];

interface ToolbarProps {
  onAdd: (type: BlockType) => void;
}

const ITEMS: { type: BlockType; label: string }[] = [
  { type: 'text', label: 'Текст' },
  { type: 'image', label: 'Картинка' },
  { type: 'quote', label: 'Цитата' },
  { type: 'code', label: 'Код' },
  { type: 'file', label: 'Файл' },
];

export function Toolbar({ onAdd }: ToolbarProps) {
  return (
    <div className="toolbar">
      <span className="toolbar__title">Добавить блок:</span>
      {ITEMS.map((item) => (
        <button
          key={item.type}
          type="button"
          className="btn btn--secondary"
          onClick={() => onAdd(item.type)}
        >
          + {item.label}
        </button>
      ))}
    </div>
  );
}
