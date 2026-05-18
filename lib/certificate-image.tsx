import { readFileSync } from 'fs';
import { join } from 'path';
import { ImageResponse } from 'next/og';
import type { CertificateData } from '@/lib/certificate';

/**
 * Renderização compartilhada do PNG do certificado de conclusão.
 * Usado tanto pela rota do aluno quanto pela rota admin.
 */

const FALLBACK_COLOR = '#6d4aff';

/** Cor segura para o Satori — só aceita hex; qualquer outra coisa cai no fallback. */
export function safeColor(input: string | null): string {
  if (input && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(input.trim())) {
    return input.trim();
  }
  return FALLBACK_COLOR;
}

function font(file: string): Buffer {
  return readFileSync(join(process.cwd(), 'public/fonts', file));
}

/**
 * Gera o `ImageResponse` (PNG 1200×850) do certificado a partir dos dados.
 * Mantém exatamente o layout B — moderno minimalista.
 */
export function renderCertificate(data: CertificateData): ImageResponse {
  const accent = safeColor(data.brandColor);

  const serifRegular = font('PTSerif-Regular.ttf');
  const serifBold = font('PTSerif-Bold.ttf');
  const sansRegular = font('PTSans-Regular.ttf');
  const sansBold = font('PTSans-Bold.ttf');

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '850px',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          fontFamily: 'PT Sans',
        }}
      >
        {/* Faixa fina superior na cor da marca */}
        <div style={{ display: 'flex', height: '10px', background: accent }} />

        {/* Corpo */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '78px 96px 56px 96px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '20px',
              letterSpacing: '6px',
              fontWeight: 700,
              color: accent,
            }}
          >
            CERTIFICADO DE CONCLUSÃO
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: '64px',
              fontSize: '24px',
              color: '#71717a',
            }}
          >
            Certificamos que
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: '14px',
              fontSize: '74px',
              fontFamily: 'PT Serif',
              fontWeight: 700,
              color: '#18181b',
              lineHeight: 1.05,
            }}
          >
            {data.studentName}
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: '40px',
              fontSize: '24px',
              color: '#71717a',
            }}
          >
            concluiu o curso
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: '14px',
              fontSize: '46px',
              fontFamily: 'PT Serif',
              color: '#18181b',
              lineHeight: 1.15,
            }}
          >
            {data.courseTitle}
          </div>

          {/* Rodapé */}
          <div
            style={{
              display: 'flex',
              marginTop: 'auto',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '17px',
                color: '#71717a',
                maxWidth: '700px',
              }}
            >
              {`Carga horária: ${data.durationLabel} · Concluído em ${data.completedAtLabel} · Instrutor: ${data.instructor}`}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
              }}
            >
              {data.brandLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.brandLogoUrl}
                  alt={data.brandName}
                  height={44}
                  style={{ maxHeight: '44px', objectFit: 'contain' }}
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    fontSize: '22px',
                    fontFamily: 'PT Serif',
                    fontWeight: 700,
                    color: '#18181b',
                  }}
                >
                  {data.brandName}
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  marginTop: '8px',
                  fontSize: '15px',
                  letterSpacing: '2px',
                  color: '#a1a1aa',
                }}
              >
                {data.code}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 850,
      fonts: [
        { name: 'PT Serif', data: serifRegular, weight: 400, style: 'normal' },
        { name: 'PT Serif', data: serifBold, weight: 700, style: 'normal' },
        { name: 'PT Sans', data: sansRegular, weight: 400, style: 'normal' },
        { name: 'PT Sans', data: sansBold, weight: 700, style: 'normal' },
      ],
    },
  );
}
