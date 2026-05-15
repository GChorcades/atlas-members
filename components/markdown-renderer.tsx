import { Fragment, type ReactNode } from 'react';
import { CodeBlock } from './code-block';

/**
 * Renderiza markdown como elementos React puros.
 * Suporta: parágrafos, **negrito**, *itálico*, `código inline`, blocos ```código```,
 * listas (- ou 1.), cabeçalhos (# ## ###).
 * Toda saída passa pelo escape automático do React — XSS-safe por construção.
 */

function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let remaining = text;
  let k = 0;

  while (remaining.length > 0) {
    const code = remaining.match(/^([^`*!\[]*)`([^`\n]+)`/);
    if (code) {
      if (code[1]) out.push(<Fragment key={`${keyBase}-${k++}`}>{code[1]}</Fragment>);
      out.push(<code key={`${keyBase}-${k++}`}>{code[2]}</code>);
      remaining = remaining.slice(code[0].length);
      continue;
    }
    // Imagem: ![alt](url)
    const img = remaining.match(/^([^*!\[]*)!\[([^\]\n]*)\]\(([^)\s]+)\)/);
    if (img) {
      if (img[1]) out.push(<Fragment key={`${keyBase}-${k++}`}>{img[1]}</Fragment>);
      if (isSafeUrl(img[3])) {
        out.push(
          <img
            key={`${keyBase}-${k++}`}
            src={img[3]}
            alt={img[2]}
            style={{ maxWidth: '100%', height: 'auto', borderRadius: 8, margin: '0.5em 0' }}
          />,
        );
      } else {
        out.push(<Fragment key={`${keyBase}-${k++}`}>{img[0]}</Fragment>);
      }
      remaining = remaining.slice(img[0].length);
      continue;
    }
    // Link: [texto](url)
    const link = remaining.match(/^([^*!\[]*)\[([^\]\n]+)\]\(([^)\s]+)\)/);
    if (link) {
      if (link[1]) out.push(<Fragment key={`${keyBase}-${k++}`}>{link[1]}</Fragment>);
      if (isSafeUrl(link[3])) {
        out.push(
          <a key={`${keyBase}-${k++}`} href={link[3]} target="_blank" rel="noopener noreferrer">
            {link[2]}
          </a>,
        );
      } else {
        out.push(<Fragment key={`${keyBase}-${k++}`}>{link[0]}</Fragment>);
      }
      remaining = remaining.slice(link[0].length);
      continue;
    }
    const bold = remaining.match(/^([^*]*)\*\*([^*\n]+)\*\*/);
    if (bold) {
      if (bold[1]) out.push(<Fragment key={`${keyBase}-${k++}`}>{bold[1]}</Fragment>);
      out.push(<strong key={`${keyBase}-${k++}`}>{bold[2]}</strong>);
      remaining = remaining.slice(bold[0].length);
      continue;
    }
    const italic = remaining.match(/^([^*]*)\*([^*\n]+)\*/);
    if (italic) {
      if (italic[1]) out.push(<Fragment key={`${keyBase}-${k++}`}>{italic[1]}</Fragment>);
      out.push(<em key={`${keyBase}-${k++}`}>{italic[2]}</em>);
      remaining = remaining.slice(italic[0].length);
      continue;
    }
    out.push(<Fragment key={`${keyBase}-${k++}`}>{remaining}</Fragment>);
    break;
  }
  return out;
}

export function MarkdownRenderer({ source }: { source: string }) {
  if (!source) return null;

  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let listItems: ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let paraLines: string[] = [];

  function flushPara() {
    if (paraLines.length) {
      blocks.push(
        <p key={`p-${blocks.length}`}>{renderInline(paraLines.join(' '), `p-${blocks.length}`)}</p>,
      );
      paraLines = [];
    }
  }
  function flushList() {
    if (listType && listItems.length) {
      const Tag = listType;
      blocks.push(<Tag key={`l-${blocks.length}`}>{listItems}</Tag>);
    }
    listItems = [];
    listType = null;
  }

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      flushPara();
      flushList();
      const lang = line.trim().slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(<CodeBlock key={`c-${blocks.length}`} code={code.join('\n')} lang={lang || undefined} />);
      continue;
    }

    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      flushPara();
      flushList();
      const lvl = h[1].length;
      const inner = renderInline(h[2], `h-${blocks.length}`);
      if (lvl === 1) blocks.push(<h1 key={`h-${blocks.length}`}>{inner}</h1>);
      else if (lvl === 2) blocks.push(<h2 key={`h-${blocks.length}`}>{inner}</h2>);
      else blocks.push(<h3 key={`h-${blocks.length}`}>{inner}</h3>);
      i++;
      continue;
    }

    const ul = line.match(/^\s*[-*]\s+(.+)$/);
    const ol = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ul || ol) {
      flushPara();
      const want: 'ul' | 'ol' = ul ? 'ul' : 'ol';
      if (listType !== want) {
        flushList();
        listType = want;
      }
      const txt = (ul ?? ol)![1];
      listItems.push(
        <li key={`li-${blocks.length}-${listItems.length}`}>
          {renderInline(txt, `li-${blocks.length}-${listItems.length}`)}
        </li>,
      );
      i++;
      continue;
    }

    if (line.trim() === '') {
      flushPara();
      flushList();
      i++;
      continue;
    }

    flushList();
    paraLines.push(line);
    i++;
  }
  flushPara();
  flushList();

  return <>{blocks}</>;
}
