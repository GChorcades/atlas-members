import { auth } from '@/auth';
import { db } from '@/db';
import { courses, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getTenantId } from '@/lib/tenant';
import { getCertificateData, slugify } from '@/lib/certificate';
import { renderCertificate } from '@/lib/certificate-image';

export const runtime = 'nodejs';

/**
 * Emissão do certificado de um aluno pelo admin.
 * `[id]` = id do aluno; `?courseId=` = curso. Emissão forçada — não exige
 * conclusão de 100%.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return new Response('Acesso negado.', { status: 403 });
  }

  const { id: studentId } = await params;
  const courseId = new URL(req.url).searchParams.get('courseId');
  if (!courseId) {
    return new Response('Parâmetro courseId é obrigatório.', { status: 400 });
  }

  const tenantId = await getTenantId();

  const [student] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.id, studentId)))
    .limit(1);
  if (!student) {
    return new Response('Aluno não encontrado.', { status: 404 });
  }

  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.tenantId, tenantId), eq(courses.id, courseId)))
    .limit(1);
  if (!course) {
    return new Response('Curso não encontrado.', { status: 404 });
  }

  const data = await getCertificateData(tenantId, studentId, courseId, { allowIncomplete: true });
  if (!data) {
    return new Response('Não foi possível gerar o certificado.', { status: 404 });
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
