import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

// 個人ログを Apple Numbers 形式(紙の航空日誌レイアウト)で出力する。
// 生成は scripts/export_numbers.py (numbers-parser) に委譲する。
export async function POST(request: Request) {
  const payload = await request.json()
  const dir = await mkdtemp(path.join(tmpdir(), 'flightlog-numbers-'))
  const out = path.join(dir, 'logbook.numbers')
  const script = path.join(process.cwd(), 'scripts', 'export_numbers.py')

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('python3', [script, out])
      let stderr = ''
      proc.stderr.on('data', d => { stderr += d })
      proc.on('error', reject)
      proc.on('close', code =>
        code === 0 ? resolve() : reject(new Error(stderr || `python exited with ${code}`)),
      )
      proc.stdin.write(JSON.stringify(payload))
      proc.stdin.end()
    })

    const buf = await readFile(out)
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '')
    const filename = encodeURIComponent(`グライダー飛行記録簿_${date}.numbers`)
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.apple.numbers',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
