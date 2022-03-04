(function () {
  
    const vscode = acquireVsCodeApi();
    const clientId = document.querySelector("#clientId");
    const secret = document.querySelector("#clientSecret");
    const loginBtn = document.querySelector("#loginBtn");
    let clientIdValue;
    let secretValue;
    
    clientId.addEventListener("input", () => {
      clientIdValue = clientId.value;
    });

    secret.addEventListener("input", () => {
      secretValue = secret.value;
    });

    loginBtn.addEventListener("click", () => {
      vscode.postMessage({ type:"login", clientId: clientIdValue, secret: secretValue});
    });


  })();
  