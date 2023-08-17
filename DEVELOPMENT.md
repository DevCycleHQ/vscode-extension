# DevCycle VSCode Extension

## TLDR (Quick Start)

1. Run `yarn` to install packages
2. Install [webpack matcher](https://marketplace.visualstudio.com/items?itemName=eamodio.tsl-problem-matcher) for VSCode
3. Press `F5`(Run > Start Debugging) to run the extension in the new window
4. Follow the login steps from the side bar (EXPLORER > DEVCYCLE) in the extension window
5. After the login steps, you should see your feature flags info on the side bar
6. You can check the `commands` in `package.json` and run from the command palette by pressing (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac) and type the commands with `DevCycle` prefix

## What's in the folder

- This folder contains all of the files necessary for your extension.
- `package.json` - this is the manifest file in which you declare your extension and command.
  - The sample plugin registers a command and defines its title and command name. With this information VS Code can show the command in the command palette. It doesn’t yet need to load the plugin.
- `src/extension.ts` - this is the main file where you will provide the implementation of your command.
  - The file exports one function, `activate`, which is called the very first time your extension is activated (in this case by executing the command). Inside the `activate` function we call `registerCommand`.
  - We pass the function containing the implementation of the command as the second parameter to `registerCommand`.

## Get up and running straight away

- To get the development environment to build locally properly, you must install a problem matcher for webpack, e.g. [this one](https://marketplace.visualstudio.com/items?itemName=eamodio.tsl-problem-matcher).
- Press `F5` to open a new window with your extension loaded.
- Run your command from the command palette by pressing (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac) and typing `Hello World`.
- Set breakpoints in your code inside `src/extension.ts` to debug your extension.
- Find output from your extension in the debug console.

## Make changes

- You can relaunch the extension from the debug toolbar after changing code in `src/extension.ts`.
- You can also reload (`Ctrl+R` or `Cmd+R` on Mac) the VS Code window with your extension to load your changes.

## Explore the API

- You can open the full set of our API when you open the file `node_modules/@types/vscode/index.d.ts`.

## Run tests

- Open the debug viewlet (`Ctrl+Shift+D` or `Cmd+Shift+D` on Mac) and from the launch configuration dropdown pick `Extension Tests`.
- Press `F5` to run the tests in a new window with your extension loaded.
- See the output of the test result in the debug console.
- Make changes to `src/test/suite/extension.test.ts` or create new test files inside the `test/suite` folder.
  - The provided test runner will only consider files matching the name pattern `**.test.ts`.
  - You can create folders inside the `test` folder to structure your tests any way you want.

## Go further

- Reduce the extension size and improve the startup time by [bundling your extension](https://code.visualstudio.com/api/working-with-extensions/bundling-extension).
- [Publish your extension](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) on the VSCode extension marketplace.
- Automate builds by setting up [Continuous Integration](https://code.visualstudio.com/api/working-with-extensions/continuous-integration).

## [Internal] RudderStack setup

- In order to track events during development, you will need to get an authorization token from RudderStack.

1. Go to [RudderStack](https://app.rudderstack.com/) and login with the credentials stored in 1Password
2. Go to `Sources` and select the `VS Code Extension` source
3. On the `Setup` tab, copy the `Write Key`
4. Go to a [Basic Authentication Header Generator
](https://www.blitter.se/utils/basic-authentication-header-generator/) to generate a token.
5. Use the `Write Key` as the username and leave the password blank
6. Copy the generated token and paste it in `src/analytics.ts`(if this file does not exist, run the extension and it should be automatically generated for you) as the value of the `RUDDERSTACK_KEY` variable

## CLI Version

- If a change is made that requires updating the minimum required devcycle CLI version, be sure to update the `CLI_VERSION` variable in the `constants.ts` file.