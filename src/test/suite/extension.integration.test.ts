import * as assert from 'assert'
import { after } from 'mocha'

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode'
import { activate } from '../../extension';

suite('Integration Tests', () => {
  vscode.window.showInformationMessage('Starting integration tests');

  after(() => {
    vscode.window.showInformationMessage('All tests done!')
  })

  test('Sample test', () => {
    vscode.commands.executeCommand('devcycle-feature-flags.logout')
    // TODO 
  })
})
