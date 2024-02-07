import * as vscode from "vscode";
import * as fs from "fs";
import { Logger } from "../logging/Logger";

/**
 * Opens a document in VS-Code.
 * @param path - the path of the document that should be opened
 */
export async function openDocument(path: string) {
  if (fs.existsSync(path)) {
    const uri = vscode.Uri.file(path);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
  } else {
    Logger.getLogger().info(`File ${path} could not be opened, because it does not exist.`, true);
  }
}
