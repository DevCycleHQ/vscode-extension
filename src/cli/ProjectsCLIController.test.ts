import * as vscode from 'vscode'
import { assert, expect } from 'chai'
import { describe, it, beforeEach, afterEach } from 'mocha'
import sinon from 'sinon'
import { ProjectsCLIController } from './ProjectsCLIController'
import { StateManager } from '../StateManager'

const mockCachedProjects = {
  'cached-project': {
    _id: '1234',
    key: 'cached-project',
    name: 'Cached Project',
  },
}

const mockCLIProjects = [
  {
    _id: '456',
    key: 'cli-project',
    name: 'CLI Project',
  },
]

const mockSetState = sinon.stub()
const mockGetState = sinon.stub().returns(null)

describe('ProjectsCLIController', () => {
  const folder = { name: 'test-folder', uri: vscode.Uri.parse('file:///test-folder'), index: 0 }
  const projectsCLIController = new ProjectsCLIController(folder)
  let execDvcStub: sinon.SinonStub

  beforeEach(() => {
    StateManager.getFolderState = mockGetState
    StateManager.setFolderState = mockSetState
    mockGetState.returns(null)

    execDvcStub = sinon.stub(projectsCLIController, 'execDvc').resolves({
      code: 0,
      output: JSON.stringify(mockCLIProjects),
      error: null,
    })
  })

  afterEach(() => {
    execDvcStub.restore()
  })

  describe('getAllProjects', () => {
    it('should use cached projects if available', async () => {
      mockGetState.returns(mockCachedProjects)

      const result = await projectsCLIController.getAllProjects()

      expect(result).to.deep.equal(mockCachedProjects)
      sinon.assert.calledWith(mockGetState, 'test-folder', 'projects')
    })

    it('should use CLI to fetch projects if none cached', async () => {
      const result = await projectsCLIController.getAllProjects()

      assert.isTrue(execDvcStub.calledWithExactly('projects get'))
      const expectedCLIResult = {
        'cli-project': mockCLIProjects[0],
      }
      expect(result).to.deep.equal(expectedCLIResult)
    })
  })

  describe('selectProjectFromConfig', () => {
    it('calls cli to select project when it exists in config', async () => {
      mockGetState.returns({ project: 'project-id' })

      const result = await projectsCLIController.selectProjectFromConfig()

      expect(result).to.equal('project-id')
      sinon.assert.calledWith(mockGetState, 'test-folder', 'repo_config')

      assert.isTrue(execDvcStub.calledWithExactly('projects select --project=project-id'))
    })

    it('returns undefined when project is not set in config', async () => {
      mockGetState.returns({})

      const result = await projectsCLIController.selectProjectFromConfig()

      expect(result).to.be.undefined
      sinon.assert.calledWith(mockGetState, 'test-folder', 'repo_config')

      sinon.assert.notCalled(execDvcStub)
    })
  })

  describe('selectProjectFromList', () => {
    it('calls cli to select project when only one in list', async () => {
      const projectKey = 'hello-world'

      const result = await projectsCLIController.selectProjectFromList([projectKey])

      expect(result).to.equal(projectKey)

      assert.isTrue(execDvcStub.calledWithExactly(`projects select --project=${projectKey}`))
    })

    it('calls cli to select project after prompting user to select', async () => {
      const showQuickPickStub = sinon
        .stub(vscode.window, 'showQuickPick')
        .resolves('foo-bar' as unknown as vscode.QuickPickItem)

      const result = await projectsCLIController.selectProjectFromList(['hello-world', 'foo-bar'])

      expect(result).to.equal('foo-bar')

      assert.isTrue(execDvcStub.calledWithExactly(`projects select --project=foo-bar`))
      showQuickPickStub.restore()
    })
  })
})
