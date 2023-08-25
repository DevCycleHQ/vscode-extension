import * as vscode from 'vscode'
import { describe, it, afterEach } from 'mocha'
import sinon from 'sinon'
import { AuthCLIController } from '../cli'
import { loginAndRefresh } from './loginAndRefresh'
import { COMMAND_REFRESH_ALL } from '../commands'

describe('loginAndRefresh', () => {
  const folder = { name: 'test-folder', uri: vscode.Uri.parse('file:///test-folder'), index: 0 }
  const folder2 = { name: 'test-folder2', uri: vscode.Uri.parse('file:///test-folder2'), index: 1 }

  afterEach(function() {
    sinon.restore()
  })

  it('calls login for each folder', async () => {
    sinon.stub(vscode.workspace, 'workspaceFolders').value([folder, folder2])
    sinon.stub(vscode.commands, 'executeCommand')
    const mockLogin = sinon.stub(AuthCLIController.prototype, 'login').resolves()

    await loginAndRefresh()

    sinon.assert.calledTwice(mockLogin)
  })

  it('refreshes all folders', async () => {
    sinon.stub(vscode.workspace, 'workspaceFolders').value([folder, folder2])
    const mockExecuteCommand = sinon.stub(vscode.commands, 'executeCommand')
    sinon.stub(AuthCLIController.prototype, 'login').resolves()

    await loginAndRefresh()

    sinon.assert.calledWith(mockExecuteCommand, COMMAND_REFRESH_ALL, { folder: undefined })
  })

  it('sets hasCredentialsAndProject to true', async () => {
    sinon.stub(vscode.workspace, 'workspaceFolders').value([folder, folder2])
    const mockExecuteCommand = sinon.stub(vscode.commands, 'executeCommand')
    sinon.stub(AuthCLIController.prototype, 'login').resolves()

    await loginAndRefresh()

    sinon.assert.calledWith(
      mockExecuteCommand,
      'setContext',
      'devcycle-feature-flags.hasCredentialsAndProject',
      true,
    )
  })

  it('does not set hasCredentialsAndProject if an error is thrown', async () => {
    sinon.stub(vscode.workspace, 'workspaceFolders').value([folder, folder2])
    const mockExecuteCommand = sinon.stub(vscode.commands, 'executeCommand')
    sinon.stub(AuthCLIController.prototype, 'login').throws(new Error('test error'))

    await loginAndRefresh().catch(() => {})

    sinon.assert.notCalled(mockExecuteCommand)
  })
})
