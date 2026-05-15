import { db } from '@/db';
import { cohorts, cohortCourses, cohortMembers } from '@/db/schema';
import { desc, sql, eq } from 'drizzle-orm';
import { getTenantId } from '@/lib/tenant';
import NewCohortButton from './new-cohort-button';
import CohortsTable from './cohorts-table';

export default async function AdminCohortsPage() {
  const tenantId = await getTenantId();
  const rows = await db.select().from(cohorts)
    .where(eq(cohorts.tenantId, tenantId)).orderBy(desc(cohorts.createdAt));

  const courseCounts = await db
    .select({ cohortId: cohortCourses.cohortId, count: sql<number>`count(*)` })
    .from(cohortCourses)
    .where(eq(cohortCourses.tenantId, tenantId))
    .groupBy(cohortCourses.cohortId);
  const memberCounts = await db
    .select({ cohortId: cohortMembers.cohortId, count: sql<number>`count(*)` })
    .from(cohortMembers)
    .where(eq(cohortMembers.tenantId, tenantId))
    .groupBy(cohortMembers.cohortId);

  const courseCountMap = new Map(courseCounts.map((c) => [c.cohortId, Number(c.count)]));
  const memberCountMap = new Map(memberCounts.map((m) => [m.cohortId, Number(m.count)]));

  const cohortData = rows.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    color: c.color,
    courseCount: courseCountMap.get(c.id) ?? 0,
    memberCount: memberCountMap.get(c.id) ?? 0,
    createdAt: c.createdAt,
  }));

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 24, alignItems: 'flex-end' }}>
        <div>
          <h2 className="h2">Turmas</h2>
          <p className="muted mt-4" style={{ fontSize: 13 }}>
            {cohortData.length} turma{cohortData.length !== 1 ? 's' : ''} — agrupe alunos por turma e dê acesso aos cursos
          </p>
        </div>
        <NewCohortButton />
      </div>

      <CohortsTable cohorts={cohortData} />
    </div>
  );
}
