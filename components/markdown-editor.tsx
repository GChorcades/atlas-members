'use client';

import { useRef, useState } from 'react';
import { MarkdownRenderer } from './markdown-renderer';

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
};

export function MarkdownEditor({ value, onChange, placeholder, minHeight = 320 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  function insertAtCursor(text: string) {
    const ta = ref.current;
    if (!ta) {
      onChange((value ? `${value}\n` : '') + text);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  async function uploadImage(file: File) {
    setUploadError('');
    setUploading(true);
    const placeholder = `![carregando-${Date.now()}](enviando)`;
    insertAtCursor(`\n${placeholder}\n`);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload-inline', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? 'Falha no upload');
        onChange(valueRef.current.replace(`\n${placeholder}\n`, ''));
      } else {
        const alt = file.name.replace(/\.[^.]+$/, '').slice(0, 60);
        const md = `![${alt}](${data.url})`;
        onChange(valueRef.current.replace(placeholder, md));
      }
    } catch {
      setUploadError('Erro de rede');
      onChange(valueRef.current.replace(`\n${placeholder}\n`, ''));
    } finally {
      setUploading(false);
    }
  }

  function handlePickImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) uploadImage(f);
    };
    input.click();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          uploadImage(file);
          return;
        }
      }
    }
  }

  function wrap(prefix: string, suffix: string = prefix, placeholderText = '') {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || placeholderText;
    const next = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  }

  function prefixLine(prefix: string) {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
        <ToolbarBtn label="B" title="Negrito (Ctrl+B)" weight={700} onClick={() => wrap('**', '**', 'texto em negrito')} />
        <ToolbarBtn label="I" title="Itálico (Ctrl+I)" italic onClick={() => wrap('*', '*', 'texto em itálico')} />
        <ToolbarBtn label="</>" title="Código inline" mono onClick={() => wrap('`', '`', 'código')} />
        <ToolbarBtn label="{ }" title="Bloco de código" mono onClick={() => wrap('\n```\n', '\n```\n', 'seu código aqui')} />
        <span style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '0 4px' }} />
        <ToolbarBtn label="H2" title="Título" weight={700} onClick={() => prefixLine('## ')} />
        <ToolbarBtn label="•" title="Lista" onClick={() => prefixLine('- ')} />
        <ToolbarBtn label="1." title="Lista numerada" onClick={() => prefixLine('1. ')} />
        <span style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '0 4px' }} />
        <ToolbarBtn
          label={uploading ? '↑…' : '🖼'}
          title="Inserir imagem (ou Ctrl+V para colar)"
          onClick={handlePickImage}
        />
        <div style={{ flex: 1 }} />
        {uploadError && (
          <span style={{ fontSize: 11.5, color: 'var(--danger, #dc2626)', alignSelf: 'center' }}>{uploadError}</span>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setShowPreview((v) => !v)}
          style={{ fontSize: 12 }}
        >
          {showPreview ? 'Editar' : 'Pré-visualizar'}
        </button>
      </div>

      {showPreview ? (
        <div
          className="prose-content"
          style={{
            minHeight,
            padding: '14px 16px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--bg-elevated)',
            fontSize: 14.5,
            lineHeight: 1.7,
          }}
        >
          {value.trim() ? (
            <MarkdownRenderer source={value} />
          ) : (
            <p style={{ color: 'var(--text-faint)' }}>Nada ainda…</p>
          )}
        </div>
      ) : (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder ?? 'Escreva o material didático em markdown. **negrito**, *itálico*, `código`, ou cole uma imagem com Ctrl+V…'}
          className="input-field"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
              e.preventDefault();
              wrap('**', '**', 'texto em negrito');
            } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
              e.preventDefault();
              wrap('*', '*', 'texto em itálico');
            }
          }}
          style={{ minHeight, resize: 'vertical', fontFamily: 'ui-monospace, monospace', fontSize: 13.5, lineHeight: 1.65 }}
        />
      )}
    </div>
  );
}

function ToolbarBtn({
  label,
  title,
  onClick,
  italic,
  weight,
  mono,
}: {
  label: string;
  title: string;
  onClick: () => void;
  italic?: boolean;
  weight?: number;
  mono?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        minWidth: 32,
        height: 32,
        padding: '0 8px',
        border: '1px solid var(--border)',
        borderRadius: 6,
        background: 'var(--bg-elevated)',
        color: 'var(--text)',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: weight ?? 500,
        fontStyle: italic ? 'italic' : 'normal',
        fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
      }}
    >
      {label}
    </button>
  );
}
