import fs from 'fs'
import path from 'path'

export interface ScannedFile {
  name: string
  path: string
  extension: string
  size: number
  type: 'video' | 'audio' | 'pdf' | 'text' | 'image' | 'html' | 'unknown'
  suggestedLevel?: string
  suggestedModule?: string
}

export interface ScanResult {
  files: ScannedFile[]
  levels: string[]
  totalFiles: number
  totalSize: number
}

const CONTENT_DIR = path.join(process.cwd(), 'content')

const extensionToType: Record<string, ScannedFile['type']> = {
  '.mp4': 'video',
  '.webm': 'video',
  '.mkv': 'video',
  '.avi': 'video',
  '.mp3': 'audio',
  '.wav': 'audio',
  '.ogg': 'audio',
  '.m4a': 'audio',
  '.pdf': 'pdf',
  '.html': 'html',
  '.htm': 'html',
  '.txt': 'text',
  '.md': 'text',
  '.doc': 'text',
  '.docx': 'text',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.gif': 'image',
  '.webp': 'image',
}

const levelPatterns = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export function scanContentDirectory(dir?: string): ScanResult {
  const rootDir = dir || CONTENT_DIR
  const files: ScannedFile[] = []
  const foundLevels = new Set<string>()
  let totalSize = 0

  if (!fs.existsSync(rootDir)) {
    console.log(`Content directory does not exist: ${rootDir}`)
    return { files: [], levels: [], totalFiles: 0, totalSize: 0 }
  }

  function scanDirectory(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        // Check if directory name matches a level
        const upperName = entry.name.toUpperCase()
        if (levelPatterns.some(l => upperName.includes(l))) {
          foundLevels.add(entry.name)
        }
        scanDirectory(fullPath)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        const type = extensionToType[ext] || 'unknown'
        const stats = fs.statSync(fullPath)
        
        // Detect level from path
        let suggestedLevel: string | undefined
        for (const level of levelPatterns) {
          if (fullPath.toUpperCase().includes(level)) {
            suggestedLevel = level
            break
          }
        }

        // Detect module from parent folder
        let suggestedModule: string | undefined
        const parentDir = path.basename(path.dirname(fullPath))
        if (!levelPatterns.includes(parentDir.toUpperCase())) {
          suggestedModule = parentDir
        }

        const scannedFile: ScannedFile = {
          name: entry.name,
          path: fullPath,
          extension: ext,
          size: stats.size,
          type,
          suggestedLevel,
          suggestedModule,
        }

        files.push(scannedFile)
        totalSize += stats.size
      }
    }
  }

  scanDirectory(rootDir)

  return {
    files,
    levels: Array.from(foundLevels),
    totalFiles: files.length,
    totalSize,
  }
}

export function getContentDir(): string {
  return CONTENT_DIR
}

export function contentDirExists(): boolean {
  return fs.existsSync(CONTENT_DIR)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getPublicUrl(filePath: string): string {
  // Convert absolute path to public URL
  // Example: /project/content/A1/audio.mp3 -> /content/A1/audio.mp3
  const relativePath = filePath.replace(process.cwd(), '')
  return relativePath.replace(/^\//, '/')
}