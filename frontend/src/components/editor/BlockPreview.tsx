/**
 * Предпросмотр одного блока (для редактора).
 * Дублирует рендер из news/[id] — здесь это предпросмотр ДО публикации.
 */

'use client';

import type { Block } from '../../types/api';

interface BlockPreviewProps {
  block: Block;
}

export function BlockPreview({ block }: BlockPreviewProps) {
  switch (block.type) {
    case 'text': {
      const style = block.style ?? 'paragraph';
      if (style === 'h1') return <h1 className="preview-block">{block.text}</h1>;
      if (style === 'h2') return <h2 className="preview-block">{block.text}</h2>;
      if (style === 'bold') return <p className="preview-block preview-block--bold">{block.text}</p>;
      if (style === 'italic') return <p className="preview-block preview-block--italic">{block.text}</p>;
      return <p className="preview-block">{block.text}</p>;
    }

    case 'image':
      return (
        <figure className="preview-block preview-image">
          <img src={block.url} alt={block.caption || 'изображение'} />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );

    case 'quote':
      return (
        <blockquote className="preview-block preview-quote">
          <p>{block.text}</p>
          {block.author && <cite>{block.author}</cite>}
        </blockquote>
      );

    case 'code':
      return (
        <pre className="preview-block preview-code">
          <code>{block.code}</code>
          {block.language && <span className="preview-code__lang">{block.language}</span>}
        </pre>
      );

    case 'file':
      return (
        <p className="preview-block preview-file">
          📎 <a href={block.url} target="_blank" rel="noreferrer">{block.name || block.url}</a>
        </p>
      );

    default:
      return null;
  }
}
