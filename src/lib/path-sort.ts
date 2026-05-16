/** Ordenação “humana” para caminhos/ficheiros: 2 < 10 < 101 (não ordem lexicográfica pura). */
export function compareNaturalPath(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

export function sortByLocalPathNatural<T extends { localPath: string }>(items: T[]): T[] {
  return [...items].sort((x, y) => compareNaturalPath(x.localPath, y.localPath))
}

export function sortLibraryItemsNatural<
  T extends { folderPath: string; localPath: string },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const d = compareNaturalPath(a.folderPath || '', b.folderPath || '')
    if (d !== 0) return d
    return compareNaturalPath(a.localPath, b.localPath)
  })
}
