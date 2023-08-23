import * as vscode from 'vscode'
import { assert, expect } from 'chai'
import { describe, it, beforeEach, afterEach } from 'mocha'
import sinon from 'sinon'
import { VariablesCLIController } from './VariablesCLIController'
import { StateManager } from '../StateManager'

const mockCachedVariables = {
  'cached-variable': {
    key: 'cached-variable',
    _feature: '123',
    _id: '1234',
    name: 'Cached Variable',
    status: 'active',
  },
}

const mockCLIVariables = [
  {
    key: 'cli-variable',
    _feature: '123',
    _id: '456',
    name: 'CLI Variable',
    status: 'active',
  },
]

const mockSetState = sinon.stub()
const mockGetState = sinon.stub().returns(null)

describe('VariablesCLIController', () => {
  const folder = { name: 'test-folder', uri: vscode.Uri.parse('file:///test-folder'), index: 0 }
  const variablesCLIController = new VariablesCLIController(folder)
  let execDvcStub: sinon.SinonStub

  beforeEach(function() {
    StateManager.getFolderState = mockGetState
    StateManager.setFolderState = mockSetState
    mockGetState.returns(null)

    execDvcStub = sinon.stub(variablesCLIController, 'execDvc').resolves({
      code: 0,
      output: JSON.stringify(mockCLIVariables),
      error: null,
    })
  })

  afterEach(function() {
    execDvcStub.restore()
  })

  describe('getAllVariables', () => {
    it('should use cached variables if available', async () => {
      mockGetState.returns(mockCachedVariables)

      const result = await variablesCLIController.getAllVariables()

      expect(result).to.deep.equal(mockCachedVariables)
      sinon.assert.calledWith(mockGetState, 'test-folder', 'variables')
    })

    it('should use CLI to fetch variables if none cached', async () => {
      const result = await variablesCLIController.getAllVariables()

      assert.isTrue(execDvcStub.calledWithExactly('variables get --per-page 1000'))
      const expectedCLIResult = {
        'cli-variable': mockCLIVariables[0],
      }
      expect(result).to.deep.equal(expectedCLIResult)
    })

    it('returns an empty map when CLI returns an error', async () => {
      execDvcStub.restore()
      execDvcStub = sinon.stub(variablesCLIController, 'execDvc').resolves({
        code: 1,
        output: '',
        error: new Error(),
      })

      const result = await variablesCLIController.getAllVariables()

      assert.isTrue(execDvcStub.calledWithExactly('variables get --per-page 1000'))
      expect(result).to.deep.equal({})
    })
  })

  describe('getVariable', () => {
    it('should use cached variables if available', async () => {
      mockGetState.returns(mockCachedVariables)

      const result = await variablesCLIController.getVariable('cached-variable')

      expect(result).to.deep.equal(mockCachedVariables['cached-variable'])
      sinon.assert.calledWith(mockGetState, 'test-folder', 'variables')
    })

    it('should use CLI to fetch variables if none cached', async () => {    
      const result = await variablesCLIController.getVariable('cli-variables')

      assert.isTrue(execDvcStub.calledWithExactly("variables get --keys='cli-variables'"))
      expect(result).to.deep.equal(mockCLIVariables[0])
    })
  })
})
