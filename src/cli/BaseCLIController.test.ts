import * as vscode from 'vscode'
import { expect } from 'chai'
import { describe, it, beforeEach, afterEach } from 'mocha'
import sinon from 'sinon'
import { BaseCLIController } from './BaseCLIController'
import { StateManager } from '../StateManager'

const mockSetState = sinon.stub()
const mockGetState = sinon.stub().returns(null)

describe('BaseCLIController', () => {
  const folder = { name: 'test-folder', uri: vscode.Uri.parse('file:///test-folder'), index: 0 }
  const baseCLIController = new BaseCLIController(folder)
  let execDvcStub: sinon.SinonStub
  let execShellStub: sinon.SinonStub

  beforeEach(function() {
    StateManager.getFolderState = mockGetState
    StateManager.setFolderState = mockSetState
    mockGetState.returns(null)
  })

  afterEach(function() {
    execDvcStub.restore()
    execShellStub?.restore()
  })

  describe('status', () => {
    it('gets status using CLI', async () => {
      const mockStatus = { version: '4.3.2' }
      execDvcStub = sinon.stub(baseCLIController, 'execDvc').resolves({
        code: 0,
        output: JSON.stringify(mockStatus),
        error: null,
      })

      const result = await baseCLIController.status()

      sinon.assert.calledWith(execDvcStub, 'status')
      expect(result).to.deep.equal(mockStatus)
    })
  })

  describe('addAlias', () => {
    it('adds an alias using CLI', async () => {
      execDvcStub = sinon.stub(baseCLIController, 'execDvc').resolves({
        code: 0,
        output: JSON.stringify({}),
        error: null,
      })

      await baseCLIController.addAlias('new-alias', 'variable-key')

      sinon.assert.calledWith(execDvcStub, 'alias add --alias=new-alias --variable=variable-key')
    })
  })

  describe('execDvc', () => {
    it('calls CLI with command', async () => {
      execShellStub = sinon.stub(baseCLIController, 'execShell').resolves({
        code: 0,
        output: JSON.stringify({}),
        error: null,
      })
      mockGetState.returns(undefined)

      await baseCLIController.execDvc('some command')

      sinon.assert.calledWith(execShellStub, 'dvc some command --headless --caller vscode_extension')
    })

    it('calls CLI with command including project ID', async () => {
      execShellStub = sinon.stub(baseCLIController, 'execShell').resolves({
        code: 0,
        output: JSON.stringify({}),
        error: null,
      })
      mockGetState.returns('project-id')

      await baseCLIController.execDvc('some command')

      sinon.assert.calledWith(execShellStub, 'dvc some command --headless --caller vscode_extension --project project-id')
    })
  })

  describe('isCliInstalled', () => {
    it('returns true when CLI is installed', async () => {
      execDvcStub = sinon.stub(baseCLIController, 'execDvc').resolves({
        code: 0,
        output: '@devcycle/cli/4.3.2 darwin-arm64 node-v16.17.0',
        error: null,
      })

      const result = await baseCLIController.isCliInstalled()

      sinon.assert.calledWith(execDvcStub, '--version')
      expect(result).to.equal(true)
    })

    it('returns false when CLI returns an error', async () => {
      execDvcStub = sinon.stub(baseCLIController, 'execDvc').resolves({
        code: 0,
        output: 'Error',
        error: new Error(),
      })

      const result = await baseCLIController.isCliInstalled()

      sinon.assert.calledWith(execDvcStub, '--version')
      expect(result).to.equal(false)
    })
  })

  describe('isCliMinVersion', () => {
    it('returns true when CLI is above min version', async () => {
      execDvcStub = sinon.stub(baseCLIController, 'execDvc').resolves({
        code: 0,
        output: '@devcycle/cli/9999.0.0 darwin-arm64 node-v16.17.0',
        error: null,
      })

      const result = await baseCLIController.isCliMinVersion()

      sinon.assert.calledWith(execDvcStub, '--version')
      expect(result).to.equal(true)
    })

    it('returns false when CLI is not above min version', async () => {
      execDvcStub = sinon.stub(baseCLIController, 'execDvc').resolves({
        code: 0,
        output: '@devcycle/cli/0.0.1 darwin-arm64 node-v16.17.0',
        error: null,
      })

      const result = await baseCLIController.isCliMinVersion()

      sinon.assert.calledWith(execDvcStub, '--version')
      expect(result).to.equal(false)
    })

    it('returns false when CLI output is not a semver match', async () => {
      execDvcStub = sinon.stub(baseCLIController, 'execDvc').resolves({
        code: 0,
        output: 'something random',
        error: null,
      })

      const result = await baseCLIController.isCliMinVersion()

      sinon.assert.calledWith(execDvcStub, '--version')
      expect(result).to.equal(false)
    })

    it('returns false when CLI returns an error', async () => {
      execDvcStub = sinon.stub(baseCLIController, 'execDvc').resolves({
        code: 0,
        output: 'Error',
        error: new Error(),
      })

      const result = await baseCLIController.isCliMinVersion()

      sinon.assert.calledWith(execDvcStub, '--version')
      expect(result).to.equal(false)
    })
  })
})
