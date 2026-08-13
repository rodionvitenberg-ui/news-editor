/**
 * Страница отдельной новости.
 * Отображает заголовок, дату и блоки контента (text/image/quote/code/file).
 * Это по сути «предпросмотр» статьи для читателя.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navigation } from '../../../components/Navigation';
import { apiClient } from '../../../api/client';
import type { News, NewsResponse } from '../../../types/api';

/** Рендер одного блока по его типу. */
function renderBlock(block: News['blocks'][number], key: number) {
  switch (block.type) {
    case 'text': {
      // style: paragraph | h1 | h2 | bold | italic
      const style = block.style ?? 'paragraph';
      if (style === 'h1') return <h1 key={key}>{block.text}</h1>;
      if (style === 'h2') return <h2 key={key}>{block.text}</h2>;
      if (style === 'bold') return <p className="block-text block-text--bold" key={key}>{block.text}</p>;
      if (style === 'italic') return <p className="block-text block-text--italic" key={key}>{block.text}</p>;
      return <p className="block-text" key={key}>{block.text}</p>;
    }

    case 'image':
      return (
        <figure key={key} className="block-image">
          <img src={block.url} alt={block.caption || block.name || 'изображение'} />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );

    case 'quote':
      return (
        <blockquote key={key} className="block-quote">
          <p>{block.text}</p>
          {block.author && <cite>{block.author}</cite>}
        </blockquote>
      );

    case 'code':
      return (
        <pre key={key} className="block-code">
          <code>{block.code}</code>
          {block.language && <span className="block-code__lang">{block.language}</span>}
        </pre>
      );

    case 'file':
      return (
        <p key={key} className="block-file">
          📎 <a href={block.url} target="_blank" rel="noreferrer">{block.name || block.url}</a>
        </p>
      );

    default:
      return null;
  }
}

export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [news, setNews] = useState<News | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiClient
      .get<NewsResponse>(`/api/news/${id}`)
      .then(({ data }) => setNews(data.news))
      .catch((err) => {
        const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
        setError(message || 'Новость не найдена');
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <>
      <Navigation />
      <main className="news-detail">
        {loading && <p className="muted-text">Загрузка...</p>}
        {error && <p className="error-text">{error}</p>}

        {news && (
          <article className="news-detail__article">
            <h1 className="news-detail__title">{news.title}</h1>
            <time className="news-detail__date">
              {new Date(news.publishAt).toLocaleDateString('ru-RU')}
            </time>
            {news.blocks.map((block, i) => renderBlock(block, i))}
          </article>
        )}
      </main>
    </>
  );
}
