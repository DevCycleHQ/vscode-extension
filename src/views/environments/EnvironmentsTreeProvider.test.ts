import * as vscode from 'vscode'
import { expect } from 'chai'
import { describe, it, beforeEach, afterEach } from 'mocha'
import sinon from 'sinon'
import { EnvironmentsTreeProvider } from './EnvironmentsTreeProvider'
import { Environment, EnvironmentsCLIController } from '../../cli'
import { EnvironmentNode, KeyListNode, KeyNode, LinkNode } from './nodes'
import { FolderNode } from '../utils/tree/FolderNode'
import { StateManager } from '../../StateManager'

const mockGetState = sinon.stub().returns(true)

describe('EnvironmentsTreeProvider', () => {
  const folder = { name: 'test-folder', uri: vscode.Uri.parse('file:///test-folder'), index: 0 }
  const folder2 = { name: 'test-folder2', uri: vscode.Uri.parse('file:///test-folder2'), index: 1 }
  const environment: Environment = {
    _id: '123',
    name: 'Development',
    key: 'development',
    type: 'development',
    sdkKeys: {
      mobile: [
        { key: 'mobile-66610b47-4c1e-0b52-4f38-9f8e37c197b2', createdAt: '2021-01-01T12:00:00.000Z', compromised: false },
      ],
      client: [
        { key: 'client-ec2ddb10-336b-dcb5-359a-4e6c59a2b587', createdAt: '2021-01-01T12:00:00.000Z', compromised: false },
      ],
      server: [
        { key: 'server-c9217c43-1dd6-2869-da5a-68a6adf10bef', createdAt: '2021-01-01T12:00:00.000Z', compromised: false },
      ],
    },
  }
  let getAllEnvironmentsStub: sinon.SinonStub

  beforeEach(() => {
    getAllEnvironmentsStub = sinon.stub(EnvironmentsCLIController.prototype, 'getAllEnvironments').resolves({
      'development': environment
    })
    StateManager.getFolderState = mockGetState
  })

  afterEach(() => {
    getAllEnvironmentsStub.restore()
    sinon.restore()
  })

  describe('refreshAll', () => {
    it('calls refresh for each workspace folder', async () => {
      sinon.stub(vscode.workspace, 'workspaceFolders').value([folder, folder2])
      const treeProvder = new EnvironmentsTreeProvider()
      const refreshStub = sinon.stub(treeProvder, 'refresh')

      await treeProvder.refreshAll()

      sinon.assert.calledTwice(refreshStub)
      sinon.assert.calledWith(refreshStub, folder)
      sinon.assert.calledWith(refreshStub, folder2)
    })

    it('does not call refresh when no workspace folders exist', async () => {
      sinon.stub(vscode.workspace, 'workspaceFolders').value([])
      const treeProvder = new EnvironmentsTreeProvider()
      const refreshStub = sinon.stub(treeProvder, 'refresh')

      await treeProvder.refreshAll()

      sinon.assert.notCalled(refreshStub)
    })
  })

  describe('refresh', () => {
    it('shows progress bar on environments view', async () => {
      const withProgressStub = sinon.stub(vscode.window, 'withProgress')
      const treeProvder = new EnvironmentsTreeProvider()

      await treeProvder.refresh(folder)

      sinon.assert.calledWith(withProgressStub, { location: { viewId: 'devcycle-environments' } })
    })

    it('exits early if refresh already in progress', async () => {
      const withProgressStub = sinon.stub(vscode.window, 'withProgress')
      const treeProvder = new EnvironmentsTreeProvider()
      treeProvder.isRefreshing[folder.name] = true

      await treeProvder.refresh(folder)

      sinon.assert.notCalled(withProgressStub)
    })

    it('isRefreshing is set to false once process is complete', async () => {
      const withProgressStub = sinon.stub(vscode.window, 'withProgress')
      const treeProvder = new EnvironmentsTreeProvider()

      await treeProvder.refresh(folder)

      sinon.assert.called(withProgressStub)
      expect(treeProvder.isRefreshing[folder.name]).to.be.false
    })

    it('maps environments to EnvironmentNodes', async () => {
      const treeProvder = new EnvironmentsTreeProvider()

      await treeProvder.refresh(folder)

      sinon.assert.called(getAllEnvironmentsStub)
      const envs = treeProvder.envsByFolder[folder.name]
      expect(envs).to.have.length(1)
      const node = envs?.[0]
      expect(node).to.be.instanceOf(EnvironmentNode)
      expect(node).to.have.property('label', environment.name)
      expect(node).to.have.property('type', environment.type)
      expect(node).to.have.property('link')
      expect(node).to.have.property('keys')
    })

    it('sorts environments by type', async () => {
      const treeProvder = new EnvironmentsTreeProvider()

      getAllEnvironmentsStub.restore()
      getAllEnvironmentsStub = sinon.stub(EnvironmentsCLIController.prototype, 'getAllEnvironments').resolves({
        'env1': Object.assign({}, environment, { type: 'development' }),
        'env2': Object.assign({}, environment, { type: 'production' }),
        'env3': Object.assign({}, environment, { type: 'disaster_recovery' }),
        'env4': Object.assign({}, environment, { type: 'staging' }),
      })

      await treeProvder.refresh(folder)

      sinon.assert.called(getAllEnvironmentsStub)
      const envs = treeProvder.envsByFolder[folder.name]
      expect(envs).to.have.length(4)
      const [node1, node2, node3, node4] = envs || []
      expect(node1).to.have.property('type', 'development')
      expect(node2).to.have.property('type', 'staging')
      expect(node3).to.have.property('type', 'production')
      expect(node4).to.have.property('type', 'disaster_recovery')
    })
  })

  describe('getChildren', () => {
    it('returns FolderNodes when more than one workspace folder exists', async () => {
      sinon.stub(vscode.workspace, 'workspaceFolders').value([folder, folder2])
      const treeProvder = new EnvironmentsTreeProvider()

      const children = await treeProvder.getChildren()

      expect(children).to.have.length(2)
      const node = children?.[0]
      expect(node).to.be.instanceOf(FolderNode)
      expect(node).to.have.property('label', folder.name)
    })

    it('returns EnvironmentNode when only one workspace folder exists', async () => {
      sinon.stub(vscode.workspace, 'workspaceFolders').value([folder])
      const treeProvder = new EnvironmentsTreeProvider()
      sinon.stub(treeProvder, 'envsByFolder').value({ [folder.name]: [new EnvironmentNode(folder, environment)] })

      const children = await treeProvder.getChildren()

      expect(children).to.have.length(1)
      const node = children?.[0]
      expect(node).to.be.instanceOf(EnvironmentNode)
      expect(node).to.have.property('label', environment.name)
    })

    it('returns EnvironmentNode when parent is a FolderNode', async () => {
      const treeProvder = new EnvironmentsTreeProvider()
      sinon.stub(treeProvder, 'envsByFolder').value({ [folder.name]: [new EnvironmentNode(folder, environment)] })
      const folderNode = new FolderNode(folder)

      const children = await treeProvder.getChildren(folderNode)

      expect(children).to.have.length(1)
      const node = children?.[0]
      expect(node).to.be.instanceOf(EnvironmentNode)
      expect(node).to.have.property('label', environment.name)
    })

    it('returns KeyListNode and LinkNode when parent is an EnvironmentNode', async () => {
      const treeProvder = new EnvironmentsTreeProvider()
      const environmentNode = new EnvironmentNode(folder, environment)

      const children = await treeProvder.getChildren(environmentNode)

      expect(children).to.have.length(2)

      const keyListNode = children?.[0]
      expect(keyListNode).to.be.instanceOf(KeyListNode)
      expect(keyListNode).to.have.property('label', 'SDK Keys')

      const linkNode = children?.[1]
      expect(linkNode).to.be.instanceOf(LinkNode)
      expect(linkNode).to.have.property('label', 'View in Dashboard')
    })

    it('returns KeyNode when parent is a KeyListNode', async () => {
      const treeProvder = new EnvironmentsTreeProvider()
      const keyListNode = new KeyListNode(environment)

      const children = await treeProvder.getChildren(keyListNode)

      expect(children).to.have.length(3)

      const [mobileKeyNode, clientKeyNode, serverKeyNode] = children || []
      expect(mobileKeyNode).to.be.instanceOf(KeyNode)
      expect(mobileKeyNode).to.have.property('label', 'Mobile: mobile-666******7b2')
      expect(mobileKeyNode).to.have.property('value', 'mobile-66610b47-4c1e-0b52-4f38-9f8e37c197b2')

      expect(clientKeyNode).to.be.instanceOf(KeyNode)
      expect(clientKeyNode).to.have.property('label', 'Client: client-ec2******587')
      expect(clientKeyNode).to.have.property('value', 'client-ec2ddb10-336b-dcb5-359a-4e6c59a2b587')

      expect(serverKeyNode).to.be.instanceOf(KeyNode)
      expect(serverKeyNode).to.have.property('label', 'Server: server-c92******bef')
      expect(serverKeyNode).to.have.property('value', 'server-c9217c43-1dd6-2869-da5a-68a6adf10bef')
    })

    it('adds date to label if multiple keys exist for a platform', async () => {
      const treeProvder = new EnvironmentsTreeProvider()
      const multiKeyEnv = Object.assign({}, environment)
      multiKeyEnv.sdkKeys.mobile.push(
        { key: 'mobile-8553493c-8c4c-ba16-e9aa-742ae744e4ea', createdAt: '2022-01-01T12:00:00.000Z', compromised: false }
      )
      const keyListNode = new KeyListNode(multiKeyEnv)

      const children = await treeProvder.getChildren(keyListNode)

      expect(children).to.have.length(4)

      const [mobileKeyNode1, mobileKeyNode2] = children || []
      expect(mobileKeyNode1).to.be.instanceOf(KeyNode)
      expect(mobileKeyNode1).to.have.property('label', 'Mobile: mobile-666******7b2 01/01/21')
      expect(mobileKeyNode1).to.have.property('value', 'mobile-66610b47-4c1e-0b52-4f38-9f8e37c197b2')

      expect(mobileKeyNode2).to.be.instanceOf(KeyNode)
      expect(mobileKeyNode2).to.have.property('label', 'Mobile: mobile-855******4ea 01/01/22')
      expect(mobileKeyNode2).to.have.property('value', 'mobile-8553493c-8c4c-ba16-e9aa-742ae744e4ea')
    })
  })
})
