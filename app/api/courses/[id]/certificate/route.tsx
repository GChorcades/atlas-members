import { auth } from '@/auth';
import { db } from '@/db';
import { courses } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getTenantId } from '@/lib/tenant';
import { getCertificateData, slugify } from '@/lib/certificate';
import { renderCertificate } from '@/lib/certificate-image';

export const runtime = 'nodejs';

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

  const image = renderCertificate(data);
  const buffer = await image.arrayBuffer();
  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="certificado-${slugify(course.title)}.png"`,
      'Cache-Control': 'no-store',
    },
  });
}
