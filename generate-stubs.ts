/**
 * Auto-generates minimal TypeScript stubs for all missing imported files.
 * Scans the src/ directory, finds all local imports that reference non-existent files,
 * and creates stub files that export the required symbols.
 */
import { readdir, readFile, writeFile, mkdir, stat } from 'fs/promises'
import { resolve, dirname, join, relative } from 'path'
import { existsSync } from 'fs'

const SRC = resolve('./src')

async function* walkFiles(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) yield* walkFiles(full)
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) yield full
  }
}

// Resolve a local import path to an actual filesystem path
function resolveImport(fromFile: string, importPath: string): string | null {
  const base = dirname(fromFile)

  // Strip .js extension — TypeScript ESM imports use .js but source is .ts
  const normalized = importPath.replace(/\.js$/, '')
  const abs = resolve(base, normalized)

  // Try extensions in order (prefer .ts over .tsx)
  const candidates = [abs + '.ts', abs + '.tsx', join(abs, 'index.ts'), join(abs, 'index.tsx'), abs]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  // File doesn't exist — return the .ts path so we can create it
  return abs + '.ts'
}

// Extract imported names from an import statement
function extractImportedNames(line: string): string[] {
  const names: string[] = []

  // import type { Foo, Bar } from '...'
  // import { Foo, Bar } from '...'
  const namedMatch = line.match(/import\s+(?:type\s+)?\{([^}]+)\}/)
  if (namedMatch) {
    namedMatch[1].split(',').forEach(n => {
      const trimmed = n.trim().replace(/\s+as\s+\w+/, '').trim()
      if (trimmed && !trimmed.includes(' ')) names.push(trimmed)
    })
  }

  // import DefaultExport from '...'
  const defaultMatch = line.match(/import\s+(?:type\s+)?(\w+)\s+from/)
  if (defaultMatch && defaultMatch[1] !== 'type') {
    names.push('default:' + defaultMatch[1])
  }

  return names
}

// Generate stub content for a missing file based on what's imported from it
function generateStub(filePath: string, importedSymbols: Set<string>): string {
  const lines: string[] = [
    `// Auto-generated stub — this file was not included in the source bundle`,
  ]

  const exports: string[] = []
  let hasDefault = false

  for (const sym of importedSymbols) {
    if (sym.startsWith('default:')) {
      hasDefault = true
    } else if (sym.startsWith('type:')) {
      const typeName = sym.slice(5)
      exports.push(`export type ${typeName} = any`)
    } else if (sym === sym.toUpperCase() && sym.length > 1) {
      // Likely a constant
      exports.push(`export const ${sym} = '' as any`)
    } else if (sym[0] === sym[0].toUpperCase()) {
      // Likely a class, type, or component — export as type and value
      exports.push(`export type ${sym} = any`)
      exports.push(`export const ${sym}: any = null`)
    } else {
      // Likely a function or variable
      exports.push(`export const ${sym}: any = null`)
    }
  }

  if (hasDefault) {
    exports.push(`export default null as any`)
  }

  if (exports.length === 0) {
    // Fallback: export a catch-all
    exports.push(`export default {} as any`)
  }

  lines.push(...exports)
  return lines.join('\n') + '\n'
}

async function main() {
  console.log('Scanning for missing imports...')

  // Map from missing file path → set of imported symbols
  const missing = new Map<string, Set<string>>()

  let fileCount = 0
  for await (const file of walkFiles(SRC)) {
    fileCount++
    const content = await readFile(file, 'utf-8')
    const lines = content.split('\n')

    for (const line of lines) {
      // Only look at import statements with local paths
      if (!line.includes("from '.") && !line.includes('require(\'./') && !line.includes('require("./')) continue

      const importPathMatch = line.match(/from\s+['"](\.[^'"]+)['"]/) ||
                               line.match(/require\(['"](\.[^'"]+)['"]\)/)
      if (!importPathMatch) continue

      const importPath = importPathMatch[1]
      const resolved = resolveImport(file, importPath)
      if (!resolved) continue

      // Check if it exists
      const candidates = [
        resolved,
        resolved.replace(/\.ts$/, '.tsx'),
        resolved.replace(/\.tsx$/, '.ts'),
      ]
      const exists = candidates.some(c => existsSync(c))
      if (exists) continue

      // It's missing — record what's imported from it
      if (!missing.has(resolved)) missing.set(resolved, new Set())

      const names = extractImportedNames(line)
      for (const name of names) missing.get(resolved)!.add(name)
    }
  }

  console.log(`Scanned ${fileCount} files. Found ${missing.size} missing modules.`)

  let created = 0
  for (const [filePath, symbols] of missing) {
    // Skip if it somehow exists now
    if (existsSync(filePath)) continue

    // Create directory if needed
    await mkdir(dirname(filePath), { recursive: true })

    const content = generateStub(filePath, symbols)
    await writeFile(filePath, content)
    console.log(`  Created stub: ${relative(SRC, filePath)} (exports: ${[...symbols].join(', ') || 'default'})`)
    created++
  }

  console.log(`\nDone! Created ${created} stub files.`)
}

main().catch(console.error)
