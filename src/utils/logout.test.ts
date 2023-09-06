import * as vscode from 'vscode'
import { describe, it, afterEach, beforeEach } from 'mocha'
import sinon from 'sinon'
import { AuthCLIController } from '../cli'
import { logout } from './logout'
import { KEYS, StateManager } from '../StateManager'

const mockSetState = sinon.stub()
const mockGetState = sinon.stub()
const mockSetWorkspaceState = sinon.stub()
const mockClearState = sinon.stub()
let mockCLILogout: sinon.SinonStub
let mockExecuteCommand: sinon.SinonStub

describe('logout', () => {
  const folder = { name: 'test-folder', uri: vscode.Uri.parse('file:///test-folder'), index: 0 }
  const folder2 = { name: 'test-folder2', uri: vscode.Uri.parse('file:///test-folder2'), index: 1 }

  beforeEach(() => {
    StateManager.setFolderState = mockSetState
    StateManager.getFolderState = mockGetState
    StateManager.setWorkspaceState = mockSetWorkspaceState
    StateManager.clearState = mockClearState
    sinon.stub(vscode.workspace, 'workspaceFolders').value([folder, folder2])
    mockCLILogout = sinon.stub(AuthCLIController.prototype, 'logout').resolves()
    mockExecuteCommand = sinon.stub(vscode.commands, 'executeCommand')
  })

  afterEach(function() {
    sinon.restore()
    mockClearState.reset()
    mockSetState.reset()
    mockSetWorkspaceState.reset()
    mockCLILogout.reset()
    mockExecuteCommand.reset()
  })

  it('executes logout command for all folders', async () => {
    await logout()
    sinon.assert.calledTwice(mockCLILogout)
  })

  it('clears project and org ID in state for all folders', async () => {
    await logout()

    sinon.assert.calledWith(mockSetState, folder.name, KEYS.PROJECT_ID, undefined)
    sinon.assert.calledWith(mockSetState, folder2.name, KEYS.PROJECT_ID, undefined)
    sinon.assert.calledWith(mockSetState, folder.name, KEYS.ORGANIZATION, undefined)
    sinon.assert.calledWith(mockSetState, folder2.name, KEYS.ORGANIZATION, undefined)
  })

  it('clears workspace userID and calls clearState', async () => {
    await logout()

    sinon.assert.calledWith(mockSetWorkspaceState, KEYS.AUTH0_USER_ID, undefined)
    sinon.assert.calledOnce(mockClearState)
  })

  it('sets hasCredentialsAndProject to false', async () => {
    await logout()

    sinon.assert.calledWith(
      mockExecuteCommand,
      'setContext',
      'devcycle-feature-flags.hasCredentialsAndProject',
      false,
    )
  })
})
