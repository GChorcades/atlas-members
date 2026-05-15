import OpenAI from 'openai';
import { toFile } from 'openai';
import { auth } from '@/auth';
import { db } from '@/db';
import { lessons } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';

export const maxDuration = 300;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MAX_BYTES = 25 * 1024 * 1024; // limite da API de transcrição da OpenAI

function lowestResolution(available: string | undefined): string {
  const list = (available ?? '')
    .split(',')
    .map((r) => parseInt(r, 10))
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  return `${list[0] ?? 360}p`;
}

/** Extrai o áudio do vídeo (mono, 16kHz, Opus ~24kbps) — arquivo bem menor que o vídeo. */
function extractAudio(inputUrl: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('ffmpeg não disponível.'));
      return;
    }
    const proc = spawn(ffmpegPath, [
      '-i', inputUrl,
      '-vn',                 // descarta vídeo
      '-ac', '1',            // mono
      '-ar', '16000',        // 16 kHz (suficiente para fala)
      '-c:a', 'libopus',
      '-b:a', '24k',
      '-y',
      outputPath,
    ]);
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg falhou (código ${code}): ${stderr.slice(-400)}`));
    });
  });
}

export async function POST(_req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { lessonId } = await params;
  const [lesson] = await db
    .select({ id: lessons.id, bunnyVideoId: lessons.bunnyVideoId })
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);
  if (!lesson) return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 });
  if (!lesson.bunnyVideoId) {
    return NextResponse.json({ error: 'Esta aula não tem vídeo da BunnyNet.' }, { status: 400 });
  }

  const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;
  const apiKey = process.env.BUNNY_API_KEY;
  const cdnHostname = process.env.BUNNY_CDN_HOSTNAME;
  if (!libraryId || !apiKey || !cdnHostname) {
    return NextResponse.json({ error: 'BunnyNet não configurado.' }, { status: 500 });
  }

  // Metadados do vídeo na Bunny (resoluções disponíveis)
  const metaRes = await fetch(
    `https://video.bunnycdn.com/library/${libraryId}/videos/${lesson.bunnyVideoId}`,
    { headers: { AccessKey: apiKey } },
  );
  if (!metaRes.ok) {
    return NextResponse.json({ error: 'Não foi possível obter o vídeo na BunnyNet.' }, { status: 502 });
  }
  const meta = await metaRes.json();
  const resolution = lowestResolution(meta.availableResolutions);
  const mp4Url = `https://${cdnHostname}/${lesson.bunnyVideoId}/play_${resolution}.mp4`;

  const audioPath = join(tmpdir(), `lesson-${lessonId}-${Date.now()}.ogg`);

  try {
    // ffmpeg lê o MP4 direto da URL (streaming) e grava só o áudio comprimido
    await extractAudio(mp4Url, audioPath);

    const audio = await readFile(audioPath);
    if (audio.byteLength > MAX_BYTES) {
      const mb = (audio.byteLength / 1024 / 1024).toFixed(1);
      return NextResponse.json(
        { error: `Mesmo só com o áudio o arquivo ficou em ${mb} MB — acima do limite de 25 MB. O vídeo é muito longo; transcreva manualmente ou divida em partes.` },
        { status: 413 },
      );
    }

    const file = await toFile(audio, `lesson-${lessonId}.ogg`, { type: 'audio/ogg' });
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'gpt-4o-transcribe',
      response_format: 'text',
      language: 'pt',
    });
    const text = typeof transcription === 'string'
      ? transcription
      : (transcription as { text?: string }).text ?? '';
    return NextResponse.json({ transcript: text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[transcribe]', msg);
    const friendly = msg.includes('ffmpeg falhou')
      ? 'Não foi possível processar o vídeo. Verifique se o "MP4 Fallback" está ativado na biblioteca BunnyNet.'
      : `Falha na transcrição: ${msg}`;
    return NextResponse.json({ error: friendly }, { status: 500 });
  } finally {
    await unlink(audioPath).catch(() => {});
  }
}
