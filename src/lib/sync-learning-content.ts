import path from 'path'
import { prisma } from './db'
import { scanContentDirectory } from './content-scanner'
import { folderPathFromLocalPath } from './content-path'

/**
 * Upsert scanned files into LearningContent. Run after adding files under /content.
 */
export async function syncLearningContentFromDisk(): Promise<{ upserted: number }> {
  const scan = scanContentDirectory()
  let upserted = 0

  const levels = await prisma.level.findMany()
  const byCode = Object.fromEntries(levels.map((l) => [l.code, l.id])) as Record<
    string,
    string
  >

  for (const file of scan.files) {
    if (file.type === 'unknown' && !file.name.startsWith('.')) continue

    const localPath = path
      .relative(process.cwd(), file.path)
      .replace(/\\/g, '/')

    const folderPath = folderPathFromLocalPath(localPath)
    const cefrId = file.suggestedLevel ? byCode[file.suggestedLevel] : undefined

    const fileType =
      file.type === 'image'
        ? 'image'
        : file.type === 'pdf'
          ? 'pdf'
          : file.type

    await prisma.learningContent.upsert({
      where: { localPath },
      create: {
        title: file.name,
        type: fileType,
        localPath,
        folderPath,
        cefrLevelId: cefrId,
        skillType: 'mixed',
        topic:
          file.suggestedModule ??
          (folderPath.split('/').filter(Boolean)[0] || 'scanned'),
        source: 'local_scan',
        sourceType: 'filesystem',
        tags: '[]',
        estimatedMinutes: Math.max(5, Math.round(file.size / 500_000)),
      },
      update: {
        title: file.name,
        folderPath,
        cefrLevelId: cefrId ?? undefined,
        type: fileType,
      },
    })
    upserted++
  }

  return { upserted }
}
