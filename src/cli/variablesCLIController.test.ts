import { assert, expect } from 'chai'
import { describe, it, beforeEach, afterEach } from 'mocha'
import sinon from 'sinon'
import { getAllVariables, getVariable } from './variablesCLIController'
import { StateManager } from '../StateManager'
import * as baseCLIController from './baseCLIController'

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

describe('variablesCLIController', () => {
  let execDvcStub: sinon.SinonStub

  beforeEach(function() {
    StateManager.getState = mockGetState
    StateManager.setState = mockSetState
    mockGetState.returns(null)

    execDvcStub = sinon.stub(baseCLIController, 'execDvc').resolves({
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

      const result = await getAllVariables()

      expect(result).to.deep.equal(mockCachedVariables)
      sinon.assert.calledWith(mockGetState, 'variables')
    })

    it('should use CLI to fetch variables if none cached', async () => {
      const result = await getAllVariables()

      assert.isTrue(execDvcStub.calledWithExactly('variables get'))
      const expectedCLIResult = {
        'cli-variable': mockCLIVariables[0],
      }
      expect(result).to.deep.equal(expectedCLIResult)
    })
  })

  describe('getVariable', () => {
    it('should use cached variables if available', async () => {
      mockGetState.returns(mockCachedVariables)

      const result = await getVariable('cached-variable')

      expect(result).to.deep.equal(mockCachedVariables['cached-variable'])
      sinon.assert.calledWith(mockGetState, 'variables')
    })

    it('should use CLI to fetch variables if none cached', async () => {    
      const result = await getVariable('cli-variables')

      assert.isTrue(execDvcStub.calledWithExactly("variables get --keys='cli-variables'"))
      expect(result).to.deep.equal(mockCLIVariables[0])
    })
  })
})
