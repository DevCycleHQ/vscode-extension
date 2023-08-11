;(function () {
    const vscode = acquireVsCodeApi()
    const cliBtn = document.querySelector('#installedCli')
    const openFolderBtn = document.querySelector('#openFolder')

    cliBtn?.addEventListener('click', () => {
        vscode.postMessage({
            btnType: 'installedCli'
        })
    })

    openFolderBtn?.addEventListener('click', () => {
        vscode.postMessage({
            btnType: 'openFolder'
        })
    })

})()
