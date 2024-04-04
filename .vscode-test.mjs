import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: ["out/test/**/*.test.js"],
  version: "insiders",
  workspaceFolder: "./out/temp/workspace",
  launchArgs: ["--disable-extensions", "--profile-temp"],
});
