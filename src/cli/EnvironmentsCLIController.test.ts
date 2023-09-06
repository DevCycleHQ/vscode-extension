import * as vscode from 'vscode'
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import utils from '../utils'
import { StateManager } from '../StateManager'
import { Organization } from './OrganizationsCLIController'
import { EnvironmentsCLIController } from './EnvironmentsCLIController'

const mockSetState = sinon.stub()
const mockGetState = sinon.stub()
const mockSetWorksplaceState = sinon.stub()

describe('EnvironmentsCLIController', () => {
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
      .stub(EnvironmentsCLIController.prototype, 'execDvc')
      .resolves({ output: '[]', error: null, code: 0 })
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('getEnvironments', () => {
    it('calls cli with specified environment', async () => {
      mockGetState.returns(null)

      const envId = 'environment-id'
      const cli = new EnvironmentsCLIController(folder)
      await cli.getEnvironment(envId)

      sinon.assert.calledWith(execDvcStub, `environments get --keys='${envId}'`)
    })

    it('doesnt call cli if found in cache', async () => {
        const envId = 'environment-id'
        const environments = {
            [envId]: {}
        }
        mockGetState.returns(environments)

        const cli = new EnvironmentsCLIController(folder)
        await cli.getEnvironment(envId)
  
        sinon.assert.notCalled(execDvcStub)
      })
  })

  describe('getAllEnvironments', () => {
    it('calls cli to get environments', async () => {
        mockGetState.returns(null)
  
        const cli = new EnvironmentsCLIController(folder)
        await cli.getAllEnvironments()
  
        sinon.assert.calledWith(execDvcStub, 'environments get')
      })
  
      it('doesnt call cli if found in cache', async () => {
          const envId = 'environment-id'
          const environments = {
              [envId]: {}
          }
          mockGetState.returns(environments)
  
          const cli = new EnvironmentsCLIController(folder)
          await cli.getAllEnvironments()
    
          sinon.assert.notCalled(execDvcStub)
        })
  })
})
