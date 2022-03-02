(function () {

    const vscode = acquireVsCodeApi();
    const projectId = document.querySelector("#projectId");
    const submitBtn = document.querySelector("#submitBtn");
    let projectIdValue;

    projectId.addEventListener("input", () => {
        console.log("projectId", projectId.value);
        projectIdValue = projectId.value;
    });

    submitBtn.addEventListener("click", () => {
        console.log("SUBMIT");
        console.log(projectIdValue);
        vscode.postMessage({ type:"submitProjectId", projectId: projectIdValue });
    });
})();