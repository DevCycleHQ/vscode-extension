import * as vscode from 'vscode'
import { expect } from 'chai'
import { describe, it, beforeEach, afterEach } from 'mocha'
import sinon from 'sinon'
import { InspectorViewProvider } from './InspectorViewProvider'
import { Feature, FeaturesCLIController, UsagesCLIController, Variable, VariablesCLIController } from '../../cli'
import { KEYS, StateManager } from '../../StateManager'

const mockGetState = sinon.stub()
const mockSetState = sinon.stub()

describe('InspectorViewProvider', () => {
  const folder = { name: 'test-folder', uri: vscode.Uri.parse('file:///test-folder'), index: 0 }
  const folder2 = { name: 'test-folder2', uri: vscode.Uri.parse('file:///test-folder2'), index: 1 }

  const variables: Record<string, Variable> = {
    var1: {
      key: 'var1',
      name: 'var1',
      _id: 'id1',
      _feature: 'feature1',
      status: 'archived',
      createdAt: '',
      updatedAt: ''
    },
    var2: {
      key: 'var2',
      name: 'var2',
      _id: 'id2',
      _feature: 'feature2',
      status: 'active',
      createdAt: '',
      updatedAt: ''
    }
  }

  const features: Record<string, Feature> = {
    feature1: {
      key: 'var1',
      name: 'var1',
      _id: 'id1',
      variations: [],
      variables: []
    }
  }

  const usagesForFolder1: Record<string, boolean> = {
    var1: true
  }

  const usagesForFolder2: Record<string, boolean> = {
    var1: true
  }

  let getAllVariables: sinon.SinonStub
  let getAllFeatures: sinon.SinonStub
  let usagesKeys: sinon.SinonStub

  beforeEach(() => {
    sinon.stub(vscode.workspace, 'workspaceFolders').value([folder, folder2])
    getAllVariables = sinon.stub(VariablesCLIController.prototype, 'getAllVariables').resolves(variables)
    getAllFeatures = sinon.stub(FeaturesCLIController.prototype, 'getAllFeatures').resolves(features)
    usagesKeys = sinon.stub(UsagesCLIController.prototype, 'usagesKeys').resolves(usagesForFolder1)
    StateManager.getFolderState = mockGetState
    StateManager.setFolderState = mockSetState
    mockGetState.returns("test-project-key")
  })

  afterEach(() => {
    getAllVariables.restore()
    getAllFeatures.restore()
    mockGetState.reset()
    sinon.restore()
  })

  describe('refresh', () => {
    it('clears stored variables and features', async () => {
      const inspectorViewProvider = new InspectorViewProvider(vscode.Uri.parse('extensionUri'))
      await inspectorViewProvider.refresh(folder)
      
      sinon.assert.calledWith(mockSetState, folder.name, KEYS.VARIABLES, undefined)
      sinon.assert.calledWith(mockSetState, folder.name, KEYS.FEATURES, undefined)
    })

    it('displays login message if folder is not logged in', async () => {
      mockGetState.returns(false)
      const inspectorViewProvider = new InspectorViewProvider(vscode.Uri.parse('extensionUri'))
      inspectorViewProvider._view = { webview: {} } as any
      await inspectorViewProvider.refreshAll()

      const html = inspectorViewProvider._view?.webview.html || ''
      expect(html).to.contain('Please login to view the inspector')
    })

    it('prompts to select a project if none selected', async () => {
      mockGetState.onFirstCall().returns(true)
      mockGetState.onSecondCall().returns(undefined)
      mockGetState.returns(true)
      const inspectorViewProvider = new InspectorViewProvider(vscode.Uri.parse('extensionUri'))
      inspectorViewProvider._view = { webview: {} } as any
      await inspectorViewProvider.refreshAll()

      const html = inspectorViewProvider._view?.webview.html || ''
      expect(html).to.contain('Please select a project to view the inspector')
    })

    it('shows progress bar on inspector view', async () => {
      const withProgressStub = sinon.stub(vscode.window, 'withProgress')
      mockGetState.returns(true)
      const inspectorViewProvider = new InspectorViewProvider(vscode.Uri.parse('extensionUri'))
      inspectorViewProvider._view = { webview: {} } as any

      await inspectorViewProvider.refresh(folder)

      sinon.assert.calledWith(withProgressStub, { location: { viewId: 'devcycle-inspector' } })
    })

    it('exits early if refresh already in progress', async () => {
      const withProgressStub = sinon.stub(vscode.window, 'withProgress')
      const inspectorViewProvider = new InspectorViewProvider(vscode.Uri.parse('extensionUri'))
      inspectorViewProvider.isRefreshing = true
      inspectorViewProvider._view = { webview: {} } as any

      await inspectorViewProvider.refresh(folder)

      sinon.assert.notCalled(withProgressStub)
    })

    it('isRefreshing is set to false once process is complete', async () => {
      const withProgressStub = sinon.stub(vscode.window, 'withProgress')
      mockGetState.returns(true)
      const inspectorViewProvider = new InspectorViewProvider(vscode.Uri.parse('extensionUri'))
      inspectorViewProvider._view = { webview: {} } as any

      await inspectorViewProvider.refresh(folder)

      sinon.assert.called(withProgressStub)
      expect(inspectorViewProvider.isRefreshing).to.be.false
    })

    it('removing last folder should updated selected folder to be undefined', async () => {
      sinon.stub(vscode.workspace, 'workspaceFolders').value([])
      const inspectorViewProvider = new InspectorViewProvider(vscode.Uri.parse('extensionUri'))
      inspectorViewProvider._view = { webview: {} } as any
      await inspectorViewProvider.refreshAll()

      sinon.assert.match(inspectorViewProvider.selectedFolder, undefined)
    })

    it('refreshing should not update the selectedKey or selectedFolder if they are still valid', async () => {
      const inspectorViewProvider = new InspectorViewProvider(vscode.Uri.parse('extensionUri'))
      const selectedKey = inspectorViewProvider.selectedKey
      const selectedFolder = inspectorViewProvider.selectedFolder
      await inspectorViewProvider.refreshAll()
      sinon.assert.match(inspectorViewProvider.selectedFolder, selectedFolder)
      sinon.assert.match(inspectorViewProvider.selectedKey, selectedKey)
    })
  })
})
