;(function () {
  const vscode = acquireVsCodeApi()
  const loginBtn = document.querySelector('#loginBtn')

  loginBtn?.addEventListener('click', () => {
    vscode.postMessage({
      type: 'login',
    })
  })
})()
