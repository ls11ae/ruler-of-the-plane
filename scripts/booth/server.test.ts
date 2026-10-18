import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { checkContract, findPowerShell, makeFixture, startServer, type RunningServer } from './server-harness'

// CI's Ubuntu runners come with PowerShell 7; cloud sessions may set PWSH to a pwsh they unpacked.
const shell = findPowerShell()

describe.skipIf(!shell)('booth server (server.ps1 under PowerShell)', () => {
  const fixture = makeFixture()
  let server: RunningServer

  beforeAll(async () => {
    server = await startServer(shell!, fixture.root)
  }, 40_000)

  afterAll(async () => {
    await server?.stop()
  })

  it('serves files with their MIME types, no listings, nothing outside the root', async () => {
    expect(await checkContract(server.base, fixture.files)).toEqual([])
  }, 60_000)

  it('ends when the stop file appears', async () => {
    const other = await startServer(shell!, fixture.root)
    expect(await other.stop()).toBe(0)
  }, 40_000)
})
