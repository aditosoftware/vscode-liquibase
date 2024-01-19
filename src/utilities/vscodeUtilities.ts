import * as vscode from 'vscode';

/**
 * Opens a document in VS-Code.
 * @param path - the path of the document that should be opened
 */
export async function openDocument(path: string) {
    // TODO check if path exists
    const uri = vscode.Uri.file(path);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
}
