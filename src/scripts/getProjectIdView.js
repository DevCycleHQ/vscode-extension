(function () {

    const vscode = acquireVsCodeApi();
    const projectId = document.querySelector("#projectId");
    const submitBtn = document.querySelector("#submitBtn");
    let projectIdValue;

    projectId.addEventListener("input", () => {
        projectIdValue = projectId.value;
    });

    submitBtn.addEventListener("click", () => {
        vscode.postMessage({ type:"submitProjectId", projectId: projectIdValue });
    });
})();