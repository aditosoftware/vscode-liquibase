import path from "path";
import * as vscode from "vscode";

import { Logger } from "@aditosoftware/vscode-logging";

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
