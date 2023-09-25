import * as vscode from 'vscode'
import { describe, it, afterEach } from 'mocha'
import sinon from 'sinon'
import { AuthCLIController } from '../cli'
import { loginAndRefreshAll } from './loginAndRefresh'
import { COMMAND_REFRESH_ALL } from '../commands'

describe('loginAndRefreshAll', () => {
  const folder = {
    name: 'test-folder',
    uri: vscode.Uri.parse('file:///test-folder'),
    index: 0,
  }
  const folder2 = {
    name: 'test-folder2',
    uri: vscode.Uri.parse('file:///test-folder2'),
    index: 1,
  }

  afterEach(function () {
    sinon.restore()
  })

  it('calls login for each folder', async () => {
    sinon.stub(vscode.workspace, 'workspaceFolders').value([folder, folder2])
    sinon.stub(vscode.commands, 'executeCommand')
    const mockLogin = sinon
      .stub(AuthCLIController.prototype, 'login')
      .resolves()

    await loginAndRefreshAll()

    sinon.assert.calledTwice(mockLogin)
  })

  it('calls refresh for each folder', async () => {
    sinon.stub(vscode.workspace, 'workspaceFolders').value([folder, folder2])
    const mockExecuteCommand = sinon.stub(vscode.commands, 'executeCommand')
    sinon.stub(AuthCLIController.prototype, 'login').resolves()

    await loginAndRefreshAll()

    sinon.assert.calledWith(mockExecuteCommand, COMMAND_REFRESH_ALL, { folder })
    sinon.assert.calledWith(mockExecuteCommand, COMMAND_REFRESH_ALL, {
      folder: folder2,
    })
  })

  it('sets hasCredentialsAndProject to true', async () => {
    sinon.stub(vscode.workspace, 'workspaceFolders').value([folder, folder2])
    const mockExecuteCommand = sinon.stub(vscode.commands, 'executeCommand')
    sinon.stub(AuthCLIController.prototype, 'login').resolves()

    await loginAndRefreshAll()

    sinon.assert.calledWith(
      mockExecuteCommand,
      'setContext',
      'devcycle-feature-flags.hasCredentialsAndProject',
      true,
    )
  })

  it('sets hasCredentialsAndProject to false if an error is thrown', async () => {
    sinon.stub(vscode.workspace, 'workspaceFolders').value([folder, folder2])
    const mockExecuteCommand = sinon.stub(vscode.commands, 'executeCommand')
    sinon
      .stub(AuthCLIController.prototype, 'login')
      .throws(new Error('test error'))

    await loginAndRefreshAll().catch(() => {})

    sinon.assert.calledWith(
      mockExecuteCommand,
      'setContext',
      'devcycle-feature-flags.hasCredentialsAndProject',
      false,
    )
  })
})
