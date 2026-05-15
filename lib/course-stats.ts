import { db } from '@/db';
import { modules, lessons, enrollments } from '@/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';

export type CourseStats = {
  lessonCount: number;
  totalSeconds: number;
  durationLabel: string;
  studentCount: number;
};

export function parseDurationToSeconds(input: string | null | undefined): number {
  if (!input) return 0;
  const s = input.trim();
  if (!s) return 0;

  // HH:MM:SS or MM:SS
  const colon = s.match(/^(\d{1,3}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colon) {
    const a = parseInt(colon[1], 10);
    const b = parseInt(colon[2], 10);
    const c = colon[3] !== undefined ? parseInt(colon[3], 10) : null;
    return c !== null ? a * 3600 + b * 60 + c : a * 60 + b;
  }

  // "Xh Ymin" / "Xh Ym" / "Xh"
  let total = 0;
  const h = s.match(/(\d+)\s*h(?!\d)/i);
  if (h) total += parseInt(h[1], 10) * 3600;
  const m = s.match(/(\d+)\s*m(?:in)?\b/i);
  if (m) total += parseInt(m[1], 10) * 60;
  if (total > 0) return total;

  // bare number = minutes
  const n = s.match(/^(\d+)$/);
  if (n) return parseInt(n[1], 10) * 60;

  return 0;
}

export function formatDurationFromSeconds(total: number): string {
  if (!total || total <= 0) return '—';
  const hours = Math.floor(total / 3600);
  const minutes = Math.round((total % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  return `${Math.max(minutes, 1)}min`;
}

export async function getCourseStats(courseIds: string[]): Promise<Map<string, CourseStats>> {
  const result = new Map<string, CourseStats>();
  if (courseIds.length === 0) return result;

  const lessonRows = await db
    .select({
      courseId: modules.courseId,
      duration: lessons.duration,
    })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(inArray(modules.courseId, courseIds));

  const studentRows = await db
    .select({
      courseId: enrollments.courseId,
      count: sql<number>`count(*)::int`,
    })
    .from(enrollments)
    .where(inArray(enrollments.courseId, courseIds))
    .groupBy(enrollments.courseId);

  const studentMap = new Map(studentRows.map((r) => [r.courseId, Number(r.count)]));

  for (const id of courseIds) {
    result.set(id, { lessonCount: 0, totalSeconds: 0, durationLabel: '—', studentCount: studentMap.get(id) ?? 0 });
  }

  for (const row of lessonRows) {
    const stats = result.get(row.courseId);
    if (!stats) continue;
    stats.lessonCount += 1;
    stats.totalSeconds += parseDurationToSeconds(row.duration);
  }

  for (const stats of result.values()) {
    stats.durationLabel = formatDurationFromSeconds(stats.totalSeconds);
  }

  return result;
}
