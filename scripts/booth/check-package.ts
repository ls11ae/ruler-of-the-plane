/**
 * Checks an assembled booth package with its own server.ps1 (as shipped: CRLF, byte order mark):
 * the server's contract on a fixture, then every file below web/ as the booth serves it (status,
 * size, MIME type). Run by the booth workflow on Ubuntu (pwsh) and on Windows (Windows PowerShell 5.1).
 *
 *   npx tsx scripts/booth/check-package.ts --package build/Stand [--shell pwsh|powershell]
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { checkContract, EXPECTED_TYPES, extension, makeFixture, startServer } from './server-harness'

async function main() {
  const { values } = parseArgs({
    options: {
      package: { type: 'string', default: 'build/Stand' },
      shell: { type: 'string', default: 'pwsh' },
    },
  })
  const dir = values.package!
  const script = join(dir, 'scripts', 'server.ps1')
  const failures: string[] = []

  const fixture = makeFixture()
  const contract = await startServer(values.shell!, fixture.root, { script })
  failures.push(...(await checkContract(contract.base, fixture.files)).map((f) => `contract: ${f}`))
  const code = await contract.stop()
  if (code !== 0) failures.push(`contract: the server did not end on its stop file (exit ${code})`)

  const server = await startServer(values.shell!, join(dir, 'web'), { script })
  const listed = readFileSync(join(dir, 'scripts', 'files.txt'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [size, path] = line.split('\t') as [string, string]
      return { size: Number(size), path }
    })
  const web = listed.filter((f) => f.path.startsWith('web/'))
  for (let i = 0; i < web.length; i += 16) {
    await Promise.all(
      web.slice(i, i + 16).map(async ({ size, path }) => {
        const url = server.base + '/' + path.slice(4).split('/').map(encodeURIComponent).join('/')
        const res = await fetch(url)
        const body = await res.arrayBuffer()
        if (res.status !== 200) failures.push(`${path}: HTTP ${res.status}`)
        else if (body.byteLength !== size)
          failures.push(`${path}: ${body.byteLength} bytes instead of ${size}`)
        const type = EXPECTED_TYPES[extension(path)]
        if (type && !type.test(res.headers.get('content-type') ?? '')) {
          failures.push(`${path}: served as ${res.headers.get('content-type')}`)
        }
      }),
    )
  }
  for (const page of ['/ruler-of-the-plane/?kiosk', '/tsp-boards/']) {
    const res = await fetch(server.base + page)
    if (res.status !== 200 || !/^text\/html/.test(res.headers.get('content-type') ?? '')) {
      failures.push(`${page}: HTTP ${res.status} ${res.headers.get('content-type')}`)
    }
  }
  await server.stop()

  if (failures.length) {
    console.error(`The booth package fails ${failures.length} checks:`)
    for (const f of failures) console.error(`  ${f}`)
    process.exit(1)
  }
  console.log(`OK: server contract, and ${web.length} files served as listed (${values.shell})`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
