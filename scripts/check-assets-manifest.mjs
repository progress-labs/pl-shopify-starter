/**
 * Fails when a built asset tracked in git is not referenced by the Vite
 * manifest — i.e. a stale artifact from an earlier build survived a merge
 * or an interrupted clean. Run after `vite build` so the manifest is fresh.
 *
 * Background: assets/ holds committed build output alongside hand-authored
 * files, and the clean plugin only deletes files listed in the manifest
 * present at build start — branch merges can orphan hashed files forever.
 */
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const manifest = JSON.parse(readFileSync('assets/.vite/manifest.json', 'utf8'))

const referenced = new Set()
for (const entry of Object.values(manifest)) {
  referenced.add(entry.file.split('/').pop())
  for (const key of ['css', 'assets']) {
    for (const file of entry[key] ?? []) {
      referenced.add(file.split('/').pop())
    }
  }
}

const tracked = execSync('git ls-files -- "assets/*.min.js" "assets/*.min.css"')
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((file) => file.split('/').pop())

const stale = tracked.filter((file) => !referenced.has(file))

if (stale.length > 0) {
  console.error(
    'Stale build artifacts are tracked in git but absent from the Vite manifest:'
  )
  for (const file of stale) console.error(`  assets/${file}`)
  console.error(
    '\nDelete them (git rm) or rebuild and commit the full asset set.'
  )
  process.exit(1)
}

console.log(
  `OK — all ${tracked.length} tracked built assets are in the manifest.`
)
