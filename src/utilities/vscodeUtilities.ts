import * as vscode from "vscode";
import * as fs from "fs";

/**
 * Opens a document in VS-Code.
 * @param path - the path of the document that should be opened
 */
export async function openDocument(path: string) {
  if (fs.existsSync(path)) {
    const uri = vscode.Uri.file(path);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
  }
}
