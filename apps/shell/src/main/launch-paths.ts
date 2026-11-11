import { existsSync } from 'node:fs'
import { SOURCE_CODE_EXTS } from '@genoffice/electron-utils'

/** Every extension the suite opens through a tab; also the contract the
 *  packaged file associations must advertise (tests/file-associations.test.ts),
 *  so a file the app accepts is one the OS can send it.
 *
 *  The source-code tail comes from the shared list, which is what the drop
 *  bridge and the open dialog also read — that is how a dropped `.json` stops
 *  being silently swallowed while a double-clicked one opens. */
export const LAUNCHABLE_EXTS = [
  'docx',
  'doc',
  'dot',
  'odt',
  'ott',
  'hwpx',
  'hwp',
  'xlsx',
  'xlsm',
  'xls',
  'csv',
  'tsv',
  'ods',
  'ots',
  'pptx',
  'odp',
  'otp',
  'pdf',
  'html',
  'htm',
  ...SOURCE_CODE_EXTS,
] as const

const SUPPORTED_LAUNCH_RE = new RegExp(`\\.(${LAUNCHABLE_EXTS.join('|')})$`, 'i')
const UNSUPPORTED_LAUNCH_RE = /\.(rtf|ppt|pps|xlsb|pages|key|numbers)$/i

interface LaunchPayload {
  launchPaths?: unknown
  launchPath?: unknown
}

function payloadLaunchPaths(additionalData: unknown): string[] {
  if (!additionalData || typeof additionalData !== 'object') return []
  const data = additionalData as LaunchPayload
  const paths = Array.isArray(data.launchPaths)
    ? data.launchPaths.filter((path): path is string => typeof path === 'string' && path.length > 0)
    : []
  if (typeof data.launchPath === 'string' && data.launchPath.length > 0) paths.push(data.launchPath)
  return paths
}

export function collectLaunchPaths(
  argv: readonly string[],
  additionalData?: unknown,
  exists: (path: string) => boolean = existsSync,
): string[] {
  const supported = argv.filter((path) => SUPPORTED_LAUNCH_RE.test(path) && exists(path))
  const payload = payloadLaunchPaths(additionalData)
  const fallback =
    supported.length === 0 && payload.length === 0
      ? argv.find((path) => UNSUPPORTED_LAUNCH_RE.test(path) && exists(path))
      : undefined
  return [...new Set([...supported, ...payload, ...(fallback ? [fallback] : [])])]
}
