import * as vscode from "vscode";

export default class DevcycleCLIController {
  constructor(workspace: vscode.WorkspaceFolder) {
    this.workingDirectory = workspace.uri
  }

  public async login() {
    vscode.window.showInformationMessage('Logging in to DevCycle using SSO');

    const options: vscode.TerminalOptions = {
      name: "DevCycle CLI",
      cwd: this.workingDirectory
    }

    const terminal = vscode.window.createTerminal(options)
    terminal.show()
    terminal.sendText('dvc login sso')
  }

  public async logout() {
    vscode.window.showInformationMessage('Logging out of DevCycle')

    const options: vscode.TerminalOptions = {
      name: "DevCycle CLI",
      cwd: this.workingDirectory
    }

    const terminal = vscode.window.createTerminal(options)
    terminal.show()
    terminal.sendText('dvc logout')
  }

  private workingDirectory: (vscode.Uri | undefined)
}