/** Sync with UserContentProgress.status in prisma/schema.prisma */
export type ContentProgressStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'skipped'

export function isLibraryPlaceholderLocalPath(localPath: string): boolean {
  return localPath.includes('.library-placeholder')
}

export function isDoneStatus(status: ContentProgressStatus | string | undefined): boolean {
  return status === 'completed' || status === 'skipped'
}
