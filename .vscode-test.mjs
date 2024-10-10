import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: ["out/test/suite/**/*.test.js"],
  version: "insiders",
  workspaceFolder: "./out/temp/workspace",
  launchArgs: ["--disable-extensions", "--profile-temp"],
  mocha: {
    ui: "tdd",
    retries: 5,
  },
  coverage: {
    // coverage exclusion currently does not work: https://github.com/microsoft/vscode-test-cli/issues/40
    exclude: ["dist", "**/dist/**", /dist/],
  },
});
