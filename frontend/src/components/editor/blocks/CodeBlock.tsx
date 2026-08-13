/**
 * Редактор блока кода (⭐ из ТЗ).
 * Поля: code (текст кода) и language (язык для подсветки/аннотации).
 */

'use client';

import type { Block } from '../../../types/api';

interface CodeBlockProps {
  block: Block;
  onChange: (next: Block) => void;
}

const LANGUAGES = [
  'js',
  'ts',
  'python',
  'java',
  'c',
  'cpp',
  'html',
  'css',
  'json',
  'bash',
  'sql',
  'text',
];

export function CodeBlock({ block, onChange }: CodeBlockProps) {
  function handleChange(patch: Partial<Block>) {
    onChange({ ...block, ...patch });
  }

  return (
    <div className="editor-block">
      <div className="editor-block__controls">
        <label className="editor-block__label">Язык</label>
        <select
          className="editor-block__select"
          value={block.language ?? 'text'}
          onChange={(e) => handleChange({ language: e.target.value })}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>
      <textarea
        className="editor-block__textarea editor-block__textarea--code"
        value={block.code ?? ''}
        onChange={(e) => handleChange({ code: e.target.value })}
        placeholder="Вставьте код..."
        rows={6}
        spellCheck={false}
      />
    </div>
  );
}
