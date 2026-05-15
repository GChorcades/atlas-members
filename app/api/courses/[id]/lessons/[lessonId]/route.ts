import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { courses, modules, lessons, enrollments, lessonProgress, notes as notesTable, comments as commentsTable, users, settings } from '@/db/schema';
import { eq, and, asc, inArray } from 'drizzle-orm';

export async function GET(req: Request, { params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: courseId, lessonId } = await params;

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [mod] = await db.select().from(modules).where(eq(modules.id, lesson.moduleId)).limit(1);
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);

  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, session.user.id), eq(enrollments.courseId, courseId)))
    .limit(1);

  if (!enrollment && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [progress] = await db
    .select()
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, session.user.id), eq(lessonProgress.lessonId, lessonId)))
    .limit(1);

  // Build outline
  const courseModules = await db.select().from(modules).where(eq(modules.courseId, courseId)).orderBy(asc(modules.position));
  const allLessons = await db
    .select()
    .from(lessons)
    .where(inArray(lessons.moduleId, courseModules.map((m) => m.id)))
    .orderBy(asc(lessons.position));

  const allProgress = await db
    .select()
    .from(lessonProgress)
    .where(eq(lessonProgress.userId, session.user.id));

  const doneSet = new Set(allProgress.filter((p) => p.done).map((p) => p.lessonId));

  // Flat list for prev/next — sort by (module order, lesson position).
  // The DB-level orderBy(lessons.position) interleaves lessons across modules
  // (a module-1 lesson at position 1 lands before a module-0 lesson at position 2),
  // which broke the prev/next chain.
  const moduleOrder = new Map(courseModules.map((m, i) => [m.id, i]));
  const flat = [...allLessons].sort((a, b) => {
    const aMod = moduleOrder.get(a.moduleId) ?? 0;
    const bMod = moduleOrder.get(b.moduleId) ?? 0;
    if (aMod !== bMod) return aMod - bMod;
    return a.position - b.position;
  });
  const curIdx = flat.findIndex((l) => l.id === lessonId);
  const prevLessonId = curIdx > 0 ? flat[curIdx - 1].id : null;
  const nextLessonId = curIdx < flat.length - 1 ? flat[curIdx + 1].id : null;

  const outline = courseModules.map((m) => ({
    ...m,
    lessons: allLessons
      .filter((l) => l.moduleId === m.id)
      .map((l) => ({ id: l.id, title: l.title, duration: l.duration, type: l.type, done: doneSet.has(l.id) })),
  }));

  const [pandaSetting] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, 'panda_player_id')).limit(1);

  // Notes
  const userNotes = await db
    .select()
    .from(notesTable)
    .where(and(eq(notesTable.userId, session.user.id), eq(notesTable.lessonId, lessonId)))
    .orderBy(asc(notesTable.createdAt));

  // Comments
  const rawComments = await db
    .select({ comment: commentsTable, user: users })
    .from(commentsTable)
    .innerJoin(users, eq(commentsTable.userId, users.id))
    .where(and(eq(commentsTable.lessonId, lessonId), eq(commentsTable.status, 'approved')))
    .orderBy(asc(commentsTable.createdAt));

  return NextResponse.json({
    lesson: {
      ...lesson,
      done: !!progress?.done,
      watchedSeconds: progress?.watchedSeconds ?? 0,
      pandaPlayerId: pandaSetting?.value ?? null,
    },
    module: mod,
    course: {
      id: course.id,
      title: course.title,
      coverBg: course.coverBg,
      coverImage: course.coverImage,
      coverGlyph: course.coverGlyph,
      instructor: course.instructor,
      progress: enrollment?.progress ?? 0,
      lessonCount: course.lessonCount,
    },
    prevLessonId,
    nextLessonId,
    outline,
    notes: userNotes,
    comments: rawComments.map(({ comment, user }) => ({
      id: comment.id,
      parentId: comment.parentId,
      text: comment.text,
      imageUrl: comment.imageUrl,
      author: user.name,
      avatar: user.name[0],
      isInstructor: user.role === 'admin',
      isOwn: user.id === session.user.id,
      createdAt: comment.createdAt,
      likes: comment.likes,
    })),
  });
}
