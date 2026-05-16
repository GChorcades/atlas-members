import { readFileSync } from 'fs';
import { join } from 'path';
import { ImageResponse } from 'next/og';
import { auth } from '@/auth';
import { db } from '@/db';
import { courses } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getTenantId } from '@/lib/tenant';
import { getCertificateData } from '@/lib/certificate';

export const runtime = 'nodejs';

const FALLBACK_COLOR = '#6d4aff';

/** Cor segura para o Satori — só aceita hex; qualquer outra coisa cai no fallback. */
function safeColor(input: string | null): string {
  if (input && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(input.trim())) {
    return input.trim();
  }
  return FALLBACK_COLOR;
}

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'curso';
}

function font(file: string): Buffer {
  return readFileSync(join(process.cwd(), 'public/fonts', file));
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return new Response('Não autenticado.', { status: 401 });
  }

  const { id } = await params;
  const tenantId = await getTenantId();

  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.tenantId, tenantId), eq(courses.id, id)))
    .limit(1);
  if (!course) {
    return new Response('Curso não encontrado.', { status: 404 });
  }

  const data = await getCertificateData(tenantId, session.user.id, id);
  if (!data) {
    return new Response('Conclua o curso para gerar o certificado.', { status: 403 });
  }

  const accent = safeColor(data.brandColor);

  const serifRegular = font('PTSerif-Regular.ttf');
  const serifBold = font('PTSerif-Bold.ttf');
  const sansRegular = font('PTSans-Regular.ttf');
  const sansBold = font('PTSans-Bold.ttf');

  const image = new ImageResponse(
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

  const buffer = await image.arrayBuffer();
  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="certificado-${slugify(course.title)}.png"`,
      'Cache-Control': 'no-store',
    },
  });
}
