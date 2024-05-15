import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as tar from 'tar'
import * as stream from 'stream'
import { finished } from 'stream/promises'
import { CLI_VERSION } from '../../constants'
import { showDebugOutput } from '../../utils/showDebugOutput'
import {
  hideBusyMessage,
  showBusyMessage,
} from '../../components/statusBarItem'

const CLI_ARTIFACTS = 'https://github.com/DevCycleHQ/cli/releases/download'
const SUPPORTED_PLATFORMS = [
  'darwin-x64',
  'darwin-arm64',
  'linux-arm',
  'linux-x64',
  'win32-x64',
  'win32-x86',
]
const OUTPUT_DIR = path.join(path.resolve(__dirname), '..')
const CLI_ROOT = path.join(OUTPUT_DIR, 'dvc')
const CLI_EXEC = path.join(CLI_ROOT, 'bin/dvc')

function getArtifactName() {
  const platform = `${process.platform}-${process.arch}`

  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    throw new Error(`Unsupported platform: ${platform}`)
  }

  return `dvc-v${CLI_VERSION}-${platform}.tar.gz`
}

function getTarPath() {
  return `${CLI_ARTIFACTS}/v${CLI_VERSION}/${getArtifactName()}`
}

function isCliLoaded() {
  try {
    const manifestPath = path.join(CLI_ROOT, 'oclif.manifest.json')
    return (
      fs.existsSync(CLI_EXEC) &&
      fs.existsSync(
        path.join(CLI_ROOT, 'node_modules/@oclif/core/package.json'),
      ) &&
      fs.existsSync(manifestPath) &&
      JSON.parse(fs.readFileSync(manifestPath, 'utf8')).version === CLI_VERSION
    )
  } catch (err) {
    return false
  }
}

async function downloadCli() {
  const sourceUrl = getTarPath()

  showDebugOutput('Attempting to download DevCycle CLI...')

  const writeStream = tar.x({ cwd: OUTPUT_DIR })
  const response = await fetch(sourceUrl, {
    headers: { 'accept-encoding': 'gzip' },
  })

  try {
    await finished(
      stream.Readable.fromWeb(response.body as any).pipe(writeStream),
    )
  } catch (e) {
    if (e instanceof Error) {
      showDebugOutput(`Failed to download ${sourceUrl}: ${e.message}`)
    }
    throw e
  }
  showDebugOutput('DevCycle CLI download complete!')
}

export async function loadCli() {
  try {
    if (!isCliLoaded()) {
      showBusyMessage('Loading DevCycle CLI')
      await downloadCli()
    }
  } catch (err) {
    vscode.window.showErrorMessage('Error downloading DevCycle CLI')
    throw err
  } finally {
    hideBusyMessage()
  }
  return CLI_EXEC
}

export async function getCliExec() {
  return new Promise((resolve) => {
    if (isCliLoaded()) {
      resolve(CLI_EXEC)
    } else {
      setTimeout(() => resolve(getCliExec()), 500)
    }
  })
}
