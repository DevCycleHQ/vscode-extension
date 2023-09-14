import * as vscode from 'vscode'
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import { AuthCLIController } from './AuthCLIController'
import utils from '../utils'
import { StateManager } from '../StateManager'
import { Organization, OrganizationsCLIController } from './OrganizationsCLIController'

const mockSetState = sinon.stub()
const mockGetState = sinon.stub()
const mockSetWorksplaceState = sinon.stub()

describe('AuthCLIController', () => {
  const folder = { name: 'test-folder', uri: vscode.Uri.parse('file:///test-folder'), index: 0 }
  let mockLoadRepoConfig: sinon.SinonStub
  let execDvcStub: sinon.SinonStub
  let selectOrganizationFromConfigStub: sinon.SinonStub
  let selectOrganizationFromListStub: sinon.SinonStub

  beforeEach(function() {
    StateManager.getFolderState = mockGetState
    StateManager.setFolderState = mockSetState
    StateManager.setWorkspaceState = mockSetWorksplaceState
    mockLoadRepoConfig = sinon.stub(utils, 'loadRepoConfig').resolves({})
    execDvcStub = sinon
      .stub(AuthCLIController.prototype, 'execDvc')
      .resolves({ output: '[]', error: null, code: 0 })
    selectOrganizationFromConfigStub = sinon.stub(OrganizationsCLIController.prototype, 'selectOrganizationFromConfig')
    selectOrganizationFromListStub = sinon.stub(OrganizationsCLIController.prototype, 'selectOrganizationFromList')
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('init', () => {
    it('calls cli with specified org', async () => {
      mockGetState.returns(null)

      const org = { id: 'org_123', name: 'org123' } as Organization
      const cli = new AuthCLIController(folder)
      await cli.init(org)

      sinon.assert.calledWith(execDvcStub, 'repo init --org=org_123')
    })
  })

  describe('login', () => {
    it('loads repo config for the current folder', async () => {
      const cli = new AuthCLIController(folder)
      await cli.login()

      sinon.assert.calledWith(mockLoadRepoConfig, folder)
    })

    it('does not trigger org selection if user is already logged in', async () => {
      sinon.stub(AuthCLIController.prototype, 'isLoggedIn').resolves(true)

      const cli = new AuthCLIController(folder)
      await cli.login()

      sinon.assert.notCalled(selectOrganizationFromConfigStub)
      sinon.assert.notCalled(selectOrganizationFromListStub)
    })

    it('does not trigger org list selection if headlessLogin is true', async () => {
      sinon.stub(AuthCLIController.prototype, 'isLoggedIn').resolves(false)
      selectOrganizationFromConfigStub.resolves(false)
      let errorThrown = false

      try {
        const cli = new AuthCLIController(folder, true)
        await cli.login()
      } catch (e) {
        expect(e).to.haveOwnProperty('message', 'No organization found in config, skipping auto-login')
        errorThrown = true
      }
      expect(errorThrown).to.be.true
      sinon.assert.notCalled(selectOrganizationFromListStub)
    })

    it('prompts user to select an org from list if an org is not set in the repo config', async () => {
      sinon.stub(AuthCLIController.prototype, 'isLoggedIn').resolves(false)
      selectOrganizationFromConfigStub.resolves(null)

      execDvcStub.restore()
      execDvcStub = sinon
        .stub(AuthCLIController.prototype, 'execDvc')
        .resolves({ output: '[{ "name": "org-1" }]', error: null, code: 0 })

      const cli = new AuthCLIController(folder)
      await cli.login()

      sinon.assert.calledWith(execDvcStub, 'organizations get')
      sinon.assert.calledWith(selectOrganizationFromListStub, [{ name: 'org-1' }])
    })

    it('does not prompt user to select an org from list if an org exists in the repo config', async () => {
      sinon.stub(AuthCLIController.prototype, 'isLoggedIn').resolves(false)
      selectOrganizationFromConfigStub.resolves({ name: 'org-config' })

      const cli = new AuthCLIController(folder)
      await cli.login()

      sinon.assert.notCalled(selectOrganizationFromListStub)
    })

    it('initializes repo if a config does not exist', async () => {
      sinon.stub(AuthCLIController.prototype, 'isLoggedIn').resolves(true)
      sinon.stub(AuthCLIController.prototype, 'status').resolves({ repoConfigExists: false } as any)
      const initStub = sinon.stub(AuthCLIController.prototype, 'init')
      sinon.stub(vscode.workspace, 'getConfiguration').returns({
        'get': () => true // devcycle-feature-flags.initRepoOnLogin
      } as any)

      const storedOrg = { name: 'org123' } as Organization
      mockGetState.returns(storedOrg)

      const cli = new AuthCLIController(folder)
      await cli.login()

      sinon.assert.calledWith(initStub, storedOrg)
    })

    it('does not initialize repo if a config already exist', async () => {
      sinon.stub(AuthCLIController.prototype, 'isLoggedIn').resolves(true)
      sinon.stub(AuthCLIController.prototype, 'status').resolves({ repoConfigExists: true } as any)
      const initStub = sinon.stub(AuthCLIController.prototype, 'init')
      sinon.stub(vscode.workspace, 'getConfiguration').returns({
        'get': () => true // devcycle-feature-flags.initRepoOnLogin
      } as any)

      const cli = new AuthCLIController(folder)
      await cli.login()

      sinon.assert.notCalled(initStub)
    })

    it('does not initialize repo if initRepoOnLogin is disabled', async () => {
      sinon.stub(AuthCLIController.prototype, 'isLoggedIn').resolves(true)
      sinon.stub(AuthCLIController.prototype, 'status').resolves({ repoConfigExists: false } as any)
      const initStub = sinon.stub(AuthCLIController.prototype, 'init')
      sinon.stub(vscode.workspace, 'getConfiguration').returns({
        'get': () => false // devcycle-feature-flags.initRepoOnLogin
      } as any)

      const cli = new AuthCLIController(folder)
      await cli.login()

      sinon.assert.notCalled(initStub)
    })
  })

  describe('isLoggedIn', () => {
    it('returns false if organization or project is not set', async () => {
      mockGetState.returns(null)

      const cli = new AuthCLIController(folder)
      const result = await cli.isLoggedIn()

      expect(result).to.be.false
    })

    it('returns false if cli does not have an access token', async () => {
      mockGetState.returns('value')
      sinon.stub(AuthCLIController.prototype, 'status').resolves({ hasAccessToken: false } as any)

      const cli = new AuthCLIController(folder)
      const result = await cli.isLoggedIn()

      expect(result).to.be.false
    })

    it('returns true if organization, project, and access token are set', async () => {
      mockGetState.returns('value')
      sinon.stub(AuthCLIController.prototype, 'status').resolves({ hasAccessToken: true } as any)

      const cli = new AuthCLIController(folder)
      const result = await cli.isLoggedIn()

      expect(result).to.be.true
    })
  })
})
