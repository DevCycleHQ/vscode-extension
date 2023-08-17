import * as cp from 'child_process'
import { showDebugOutput } from '../../utils/showDebugOutput'

type CommandResponse = {
  output: string
  error: Error | null
  code: number
}

export function execShell(cmd: string, cwd: string) {
  showDebugOutput(`Executing shell command ${cmd}`)
  return new Promise<CommandResponse>((resolve, reject) => {
    const cpOptions: cp.ExecOptions = { cwd }
    cp.exec(cmd, cpOptions, (err, out) => {
      if (err) {
        resolve({
          output: out,
          error: err,
          code: err.code || 0,
        })
      }
      resolve({
        output: out,
        error: null,
        code: 0,
      })
      return
    })
  })
}