import * as assert from 'assert'
import { after } from 'mocha'

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode'
import { activate } from '../../extension';
import { expect } from 'chai'

suite('Integration Tests', () => {
  vscode.window.showInformationMessage('Starting integration tests');
  let extension: vscode.Extension<any> =  vscode.extensions.getExtension('Devcycle.devcycle-feature-flags') as vscode.Extension<any>

  after(() => {
    vscode.window.showInformationMessage('All tests done!')
  })

  test('should activate', async () => {
    await extension.activate()
  })
})
