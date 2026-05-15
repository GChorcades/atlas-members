import { db } from '@/db';
import { courses } from '@/db/schema';
import { desc } from 'drizzle-orm';
import NewCourseButton from './new-course-button';
import CoursesTable from './courses-table';
import { getCourseStats } from '@/lib/course-stats';

export default async function AdminCoursesPage() {
  const rows = await db.select().from(courses).orderBy(desc(courses.createdAt));
  const stats = await getCourseStats(rows.map((c) => c.id));

  const allCourses = rows.map((c) => ({
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    instructor: c.instructor,
    level: c.level,
    lessonCount: stats.get(c.id)?.lessonCount ?? 0,
    studentCount: stats.get(c.id)?.studentCount ?? 0,
    durationLabel: stats.get(c.id)?.durationLabel ?? '—',
    published: c.published,
    coverBg: c.coverBg,
    coverImage: c.coverImage,
    coverGlyph: c.coverGlyph,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 24, alignItems: 'flex-end' }}>
        <div>
          <h2 className="h2">Cursos</h2>
          <p className="muted mt-4" style={{ fontSize: 13 }}>{allCourses.length} curso{allCourses.length !== 1 ? 's' : ''} cadastrado{allCourses.length !== 1 ? 's' : ''}</p>
        </div>
        <NewCourseButton />
      </div>

      <CoursesTable courses={allCourses} />
    </div>
  );
}
