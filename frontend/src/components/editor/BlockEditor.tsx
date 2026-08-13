/**
 * Маршрутизация по типу блока: какой компонент-редактор рисовать.
 * Сам Editor обязан передавать это через тип. Никаких any.
 */

'use client';

import type { Block } from '../../types/api';
import { TextBlock } from './blocks/TextBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { QuoteBlock } from './blocks/QuoteBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { FileBlock } from './blocks/FileBlock';

interface BlockEditorProps {
  block: Block;
  onChange: (next: Block) => void;
}

/** Возвращает редактор в зависимости от type блока. */
export function BlockEditor({ block, onChange }: BlockEditorProps) {
  switch (block.type) {
    case 'text':
      return <TextBlock block={block} onChange={onChange} />;
    case 'image':
      return <ImageBlock block={block} onChange={onChange} />;
    case 'quote':
      return <QuoteBlock block={block} onChange={onChange} />;
    case 'code':
      return <CodeBlock block={block} onChange={onChange} />;
    case 'file':
      return <FileBlock block={block} onChange={onChange} />;
    default:
      return null;
  }
}
