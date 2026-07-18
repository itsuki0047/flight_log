// iCloud退避からの復旧時に再作成した最小構成。
// next build には影響しない（lint は `npm run lint` 時のみ）。
import next from 'eslint-config-next'

export default [
  ...(Array.isArray(next) ? next : [next]),
  { ignores: ['.next/**', 'out/**', 'node_modules/**', 'archive/**'] },
]
