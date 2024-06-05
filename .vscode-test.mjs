import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: ["out/test/suite/**/*.test.js"],
  version: "insiders",
  workspaceFolder: "./out/temp/workspace",
  launchArgs: ["--disable-extensions", "--profile-temp"],
  mocha: {
    ui: "tdd",
    retries: 3,
  },
});
