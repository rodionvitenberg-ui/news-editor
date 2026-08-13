/**
 * Редактор текстового блока.
 * Пользователь вводит текст и выбирает стиль: paragraph, h1, h2, bold, italic.
 *
 * Props:
 * - block — текущий блок { type: 'text', text, style };
 * - onChange — вызывается при любом изменении (редактирование текста или стиля).
 */

'use client';

import type { Block } from '../../../types/api';

interface TextBlockProps {
  block: Block;
  onChange: (next: Block) => void;
}

const STYLES: { value: string; label: string }[] = [
  { value: 'paragraph', label: 'Абзац' },
  { value: 'h1', label: 'Заголовок 1' },
  { value: 'h2', label: 'Заголовок 2' },
  { value: 'bold', label: 'Жирный' },
  { value: 'italic', label: 'Курсив' },
];

/**
 * Изменение текста: сохраняем в поле text блока.
 */
export function TextBlock({ block, onChange }: TextBlockProps) {
  function handleTextChange(value: string) {
    onChange({ ...block, text: value });
  }

  function handleStyleChange(value: string) {
    onChange({ ...block, style: value });
  }

  return (
    <div className="editor-block">
      <textarea
        className="editor-block__textarea"
        value={block.text ?? ''}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="Введите текст..."
        rows={3}
      />
      <div className="editor-block__controls">
        <label className="editor-block__label">Стиль:</label>
        <select
          className="editor-block__select"
          value={block.style ?? 'paragraph'}
          onChange={(e) => handleStyleChange(e.target.value)}
        >
          {STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
