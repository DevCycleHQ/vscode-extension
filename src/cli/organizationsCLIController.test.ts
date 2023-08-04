import * as vscode from 'vscode'
import { assert, expect } from 'chai'
import { describe, it, beforeEach, afterEach } from 'mocha'
import sinon from 'sinon'
import { StateManager } from '../StateManager'
import { selectOrganizationFromConfig, selectOrganizationFromList } from './organizationsCLIController'
import * as projectsCLIController from './projectsCLIController'
import * as baseCLIController from './baseCLIController'

const mockSetState = sinon.stub()
const mockGetState = sinon.stub().returns(null)

describe('organizationsCLIController', () => {
  let execDvcStub: sinon.SinonStub
  let selectProjectFromConfigStub: sinon.SinonStub
  let selectProjectFromListStub: sinon.SinonStub

  beforeEach(() => {
    StateManager.getState = mockGetState
    StateManager.setState = mockSetState
    mockGetState.returns(null)

    execDvcStub = sinon.stub(baseCLIController, 'execDvc').resolves({
      code: 0,
      output: '[]',
      error: null,
    })
    selectProjectFromConfigStub = sinon.stub(projectsCLIController, 'selectProjectFromConfig')
    selectProjectFromListStub = sinon.stub(projectsCLIController, 'selectProjectFromList')
  })

  afterEach(() => {
    execDvcStub.restore()
    selectProjectFromConfigStub.restore()
    selectProjectFromListStub.restore()
  })

  describe('selectOrganizationFromConfig', () => {
    it('calls cli to login again when org exists in config', async () => {
      const orgFromConfig = { id: '123' }
      mockGetState.returns({ org: orgFromConfig })

      const result = await selectOrganizationFromConfig()

      expect(result).to.equal(orgFromConfig)
      sinon.assert.calledWith(mockGetState, 'repo_config')

      assert.isTrue(execDvcStub.calledWithExactly('login again'))
    })

    it('does not prompt for project from list if it exists in the config', async () => {
      const project = 'project-id'
      mockGetState.returns({ org: { id: '123' }, project })
      selectProjectFromConfigStub.resolves(project)

      await selectOrganizationFromConfig()

      sinon.assert.called(selectProjectFromConfigStub)
      sinon.assert.notCalled(selectProjectFromListStub)
    })

    it('prompts for project from list if it does not exist in the config', async () => {
      mockGetState.returns({ org: { id: '123' } })
      selectProjectFromConfigStub.resolves(undefined)

      await selectOrganizationFromConfig()

      sinon.assert.called(selectProjectFromConfigStub)
      sinon.assert.called(selectProjectFromListStub)
    })

    it('returns undefined when org is not set in config', async () => {
      mockGetState.returns({})

      const result = await selectOrganizationFromConfig()

      expect(result).to.be.undefined
      sinon.assert.calledWith(mockGetState, 'repo_config')

      sinon.assert.notCalled(execDvcStub)
    })
  })

  describe('selectOrganizationFromList', () => {
    it('calls cli to select organization when only one in list', async () => {
      const org = { id: '123', name: 'org_123', display_name: 'Org 123' }

      const result = await selectOrganizationFromList([org])

      expect(result).to.equal(org)

      assert.isTrue(execDvcStub.calledWithExactly(`organizations select --org=${org.name}`))
    })

    it('calls cli to select organization after prompting user to select', async () => {
      const org1 = { id: '123', name: 'org_123', display_name: 'Org 123' }
      const org2 = { id: 'anc', name: 'org_abc', display_name: 'Org ABC' }
      const showQuickPickStub = sinon
        .stub(vscode.window, 'showQuickPick')
        .resolves({ label: org2.display_name, value: org2 } as vscode.QuickPickItem)

      const result = await selectOrganizationFromList([org1, org2])

      expect(result).to.equal(org2)

      assert.isTrue(execDvcStub.calledWithExactly(`organizations select --org=${org2.name}`))
      showQuickPickStub.restore()
    })
  })
})
