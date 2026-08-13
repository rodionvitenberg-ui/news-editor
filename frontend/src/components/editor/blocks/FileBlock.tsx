/**
 * Редактор блока-файла.
 * Поля: url (ссылка на файл, обычно /uploads/…), name (отображаемое имя), size.
 */

'use client';

import type { Block } from '../../../types/api';

interface FileBlockProps {
  block: Block;
  onChange: (next: Block) => void;
}

export function FileBlock({ block, onChange }: FileBlockProps) {
  function handleChange(patch: Partial<Block>) {
    onChange({ ...block, ...patch });
  }

  return (
    <div className="editor-block">
      <label className="editor-block__label">URL файла</label>
      {/* type="text", а не "url": загруженные файлы имеют относительный путь
          /uploads/... который браузер отклоняет в type="url" («Please enter a URL»). */}
      <input
        className="editor-block__input"
        type="text"
        value={block.url ?? ''}
        onChange={(e) => handleChange({ url: e.target.value })}
        placeholder="/uploads/document.pdf"
      />
      <label className="editor-block__label">Имя файла</label>
      <input
        className="editor-block__input"
        type="text"
        value={block.name ?? ''}
        onChange={(e) => handleChange({ name: e.target.value })}
        placeholder="document.pdf"
      />
      <label className="editor-block__label">Размер (байт)</label>
      <input
        className="editor-block__input"
        type="number"
        value={block.size ?? 0}
        onChange={(e) => handleChange({ size: Number(e.target.value) })}
        placeholder="0"
        min={0}
      />
    </div>
  );
}
