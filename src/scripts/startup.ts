;(function () {
    const vscode = acquireVsCodeApi()
    const openFolderBtn = document.querySelector('#openFolder')

    openFolderBtn?.addEventListener('click', () => {
        vscode.postMessage({
            btnType: 'openFolder'
        })
    })

})()
