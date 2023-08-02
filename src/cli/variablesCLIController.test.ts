import { assert, expect } from 'chai'
import { describe, it, beforeEach } from 'mocha'
import sinon from 'sinon'
import { getAllVariables, getVariable } from './variablesCLIController'
import { StateManager } from '../StateManager'
import * as baseCLIController from './baseCLIController'

const mockCachedVariables = {
  test: {
    key: 'varkey',
    _feature: '123',
    _id: '1234',
    name: 'var name',
    status: 'active',
  },
}

const mockCLIVariables = [
  {
    key: 'varkey',
    _feature: '123',
    _id: '1234',
    name: 'var name',
    status: 'active',
  },
]

const mockSetState = sinon.stub()
const mockGetState = sinon.stub().returns(null)

const execDvcStub = sinon.stub(baseCLIController, 'execDvc').resolves({
    code: 0,
    output: JSON.stringify(mockCLIVariables),
    error: null,
})

describe('variablesCLIController', () => {
  beforeEach(() => {
    StateManager.getState = mockGetState
    StateManager.setState = mockSetState
    mockGetState.returns(null)
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
        varkey: mockCLIVariables[0],
      }
      expect(result).to.deep.equal(expectedCLIResult)
    })
  })

    describe('getVariable', () => {
      it('should use cached variables if available', async () => {
        mockGetState.returns(mockCachedVariables)

        const result = await getVariable('test')

        expect(result).to.deep.equal(mockCachedVariables.test)
        sinon.assert.calledWith(mockGetState, 'variables')
      })

      it('should use CLI to fetch variables if none cached', async () => {    
        const result = await getVariable('varkey')

        assert.isTrue(execDvcStub.calledWithExactly("variables get --keys='varkey'"))
        expect(result).to.deep.equal(mockCLIVariables[0])
      })
    })
})
