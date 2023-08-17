import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import axios from 'axios'
import tar from 'tar'
import { CLI_VERSION } from '../../constants'
import { showDebugOutput } from '../../utils/showDebugOutput'
import { hideBusyMessage, showBusyMessage } from '../../components/statusBarItem'

const CLI_ARTIFACTS = 'https://github.com/DevCycleHQ/cli/releases/download'
const SUPPORTED_PLATFORMS = [
  'darwin-x64',
  'darwin-arm64',
  'linux-arm',
  'linux-x64',
  'win32-x64',
  'win32-x86'
]
const OUTPUT_DIR = path.join(path.resolve(__dirname), '..')
const CLI_ROOT = path.join(OUTPUT_DIR, 'dvc')
const CLI_EXEC = path.join(CLI_ROOT, 'bin/run')

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
  return (
    fs.existsSync(CLI_EXEC) &&
    fs.existsSync(path.join(CLI_ROOT, 'node_modules/@oclif/core/package.json'))
  )
}

async function downloadCli() {
  const sourceUrl = getTarPath()

  const writeStream = tar.x({ cwd: OUTPUT_DIR })
  const response = await axios.get(sourceUrl, {
    responseType: 'stream',
    headers: { 'accept-encoding': 'gzip' },
  })
  response.data.pipe(writeStream)

  await new Promise<void>((resolve, reject) => {
    writeStream.on('error', (err: Error) => {
      showDebugOutput(`Failed to download ${sourceUrl}: ${err.message}`)
      reject(err)
    })

    writeStream.on('close', () => resolve())
  })
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
