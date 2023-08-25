const path = require('path')

/** @type WebpackConfig */
const baseConfig = {
    target: 'node',
    externals: {
        vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded.
        // Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
        // modules added here also need to be added in the .vscodeignore file
    },
    resolve: {
        mainFields: ['browser', 'module', 'main'],
        extensions: ['.ts', '.js'],
        fallback: {
            child_process: false
        }
    },
    devtool: "nosources-source-map",
    infrastructureLogging: {
        level: "log", // enables logging required for problem matchers
    },
    module: {
        rules: [
            {
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [{ loader: "ts-loader" }],
            },
        ],
    },
  };

// Config for extension source code (to be run in a Node-based context)
/** @type WebpackConfig */
const extensionConfig = {
    ...baseConfig,
    target: "node",
    entry: "./src/extension.ts",
    externals: ["vscode"],
    output: {
        path: path.resolve(__dirname, "out"),
        filename: "extension.js",
        libraryTarget: "commonjs2",
        devtoolModuleFilenameTemplate: '../[resource-path]'
    },
};

// Config for webview source code (to be run in a web-based context)
/** @type WebpackConfig */
const webviewConfig = {
    ...baseConfig,
    target: ["web", "es2020"],
    entry: {
        homeView: "./src/webview/homeView.ts",
        inspectorView: "./src/webview/inspectorView.ts"
    },
    experiments: { outputModule: true },
    output: {
        path: path.resolve(__dirname, "out"),
        filename: "[name].js",
        libraryTarget: "module",
        chunkFormat: "module",
    },
};

module.exports = [extensionConfig, webviewConfig];
