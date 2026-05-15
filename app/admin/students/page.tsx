import { db } from '@/db';
import { users, enrollments } from '@/db/schema';
import { desc, sql } from 'drizzle-orm';
import StudentsTable from './students-table';

export default async function AdminStudentsPage() {
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      level: users.level,
      xp: users.xp,
      streak: users.streak,
      plan: users.plan,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  const enrollmentCounts = await db
    .select({ userId: enrollments.userId, count: sql<number>`count(*)` })
    .from(enrollments)
    .groupBy(enrollments.userId);

  const countMap = new Map(enrollmentCounts.map((e) => [e.userId, Number(e.count)]));

  const students = allUsers.map((u) => ({
    ...u,
    courseCount: countMap.get(u.id) ?? 0,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 24, alignItems: 'flex-end' }}>
        <div>
          <h2 className="h2">Alunos</h2>
          <p className="muted mt-4" style={{ fontSize: 13 }}>{students.length} usuário{students.length !== 1 ? 's' : ''} cadastrado{students.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <StudentsTable students={students} />
    </div>
  );
}
