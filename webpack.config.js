//@ts-check

"use strict";

const path = require("path");
const WebpackShellPluginNext = require("webpack-shell-plugin-next");

/**@type {import('webpack').Configuration}*/
const config = {
  target: "node",
  mode: "none",

  entry: "./src/extension.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
  },
  devtool: "nosources-source-map",

  resolve: {
    extensions: [".ts", ".js"],
  },
  watchOptions: {
    ignored: /node_modules/,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [/node_modules/, /scripts/],
        use: [
          {
            loader: "ts-loader",
          },
        ],
      },
    ],
  },
  externals: {
    vscode: "commonjs vscode",
    electron: "commonjs electron",
  },
  plugins: [
    // build the icons before the real build
    new WebpackShellPluginNext({
      onBeforeBuild: {
        scripts: ["npm run compile"],
        blocking: true,
      },
    }),
  ],
};

module.exports = [config];
