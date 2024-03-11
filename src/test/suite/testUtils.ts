import path from "path";
import fs from "fs";
import * as vscode from "vscode";

import { Logger } from "@aditosoftware/vscode-logging";
import { randomUUID } from "crypto";

/**
 * Temporary folder for writing cache files.
 */
const temporaryResourcePath = path.join(process.cwd(), "..", "..", "out", "temp");

/**
 * Creates a temporary folder for tests.
 *
 * This temp folder will be removed when `npm run test-compile` was run.
 *
 * @param folderNames - the name of the folders
 * @returns the full path to the temporary folder.
 */
export function createTempFolderForTests(...folderNames: string[]): string {
  const temporaryPath = path.join(temporaryResourcePath, ...folderNames, randomUUID());
  if (!fs.existsSync(temporaryPath)) {
    fs.mkdirSync(temporaryPath, { recursive: true });
  }

  return temporaryPath;
}

/**
 * Initializes a dummy logger for tests.
 */
export function initLoggerForTests() {
  const context: vscode.ExtensionContext = {
    subscriptions: [],
    logUri: vscode.Uri.file(path.join(process.cwd(), "..", "logging")),
  } as unknown as vscode.ExtensionContext;
  Logger.initializeLogger(context, "Tests");
}
