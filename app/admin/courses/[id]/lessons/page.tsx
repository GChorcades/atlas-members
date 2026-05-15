import { redirect } from 'next/navigation';

export default async function RedirectToCourseEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/courses/${id}/edit`);
}
