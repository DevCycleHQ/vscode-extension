(function () {
  
    const vscode = acquireVsCodeApi();
    const clientId = document.querySelector("#clientId");
    const secret = document.querySelector("#clientSecret");
    const loginBtn = document.querySelector("#loginBtn");
    let clientIdValue;
    let secretValue;
    
    clientId.addEventListener("input", () => {
      console.log("clientId", clientId.value);
      clientIdValue = clientId.value;
    });

    secret.addEventListener("input", () => {
      console.log("secret", secret.value);
      secretValue = secret.value;
    });

    loginBtn.addEventListener("click", () => {
      console.log("LOGIN");
      console.log(clientIdValue);
      vscode.postMessage({ clientId: clientIdValue, secret: secretValue});
    });


  })();
  