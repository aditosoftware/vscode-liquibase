import * as vscode from "vscode";
import * as fs from "node:fs";
import { Logger } from "@aditosoftware/vscode-logging";

/**
 * Opens a document in VS-Code.
 *
 * @param path - the path of the document that should be opened
 */
export async function openDocument(path: string): Promise<void> {
  if (fs.existsSync(path)) {
    const uri = vscode.Uri.file(path);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
  } else {
    Logger.getLogger().info({
      message: `File ${path} could not be opened, because it does not exist.`,
      notifyUser: true,
    });
  }
}

/**
 * Opens the link to the liquibase documentation.
 *
 * @param url - that url that should be opened
 */
export function openLiquibaseDocumentation(url: string): void {
  const uri = vscode.Uri.parse(url);
  vscode.env.openExternal(uri).then(
    () => {},
    (error) => {
      Logger.getLogger().error({
        message: "Error opening the documentation to include-objects",
        error,
        notifyUser: true,
      });
    }
  );
}
