import * as vscode from 'vscode'
import { assert, expect } from 'chai'
import { describe, it, beforeEach, afterEach } from 'mocha'
import sinon from 'sinon'
import { UsagesCLIController } from './UsagesCLIController'
import { StateManager } from '../StateManager'

const mockCodeUsages = [
  {
    key: 'cli-variable',
    references: [],
  },
]

const mockSetState = sinon.stub()
const mockGetState = sinon.stub().returns(null)

describe('UsagesCLIController', () => {
  const folder = { name: 'test-folder', uri: vscode.Uri.parse('file:///test-folder'), index: 0 }
  const usagesCLIController = new UsagesCLIController(folder)
  let execDvcStub: sinon.SinonStub

  beforeEach(function() {
    StateManager.getFolderState = mockGetState
    StateManager.setFolderState = mockSetState
    mockGetState.returns(null)

    execDvcStub = sinon.stub(usagesCLIController, 'execDvc').resolves({
      code: 0,
      output: JSON.stringify(mockCodeUsages),
      error: null,
    })
  })

  afterEach(function() {
    execDvcStub.restore()
  })

  describe('usages', () => {
    it('should use CLI to fetch code usages', async () => {
      const result = await usagesCLIController.usages()

      assert.isTrue(execDvcStub.calledWithExactly('usages --format=json'))
      expect(result).to.deep.equal(mockCodeUsages)
      sinon.assert.calledWith(mockSetState, 'test-folder', 'code_usage_keys', { 'cli-variable': true })
    })
  })
})
