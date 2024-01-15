import * as fs from "fs";
import * as xml2js from "xml2js";
import * as vscode from "vscode";
import { QuickPickItem } from "vscode";
import path from "path";

/**
 * Reads context values from a Liquibase XML file and returns them as an array of QuickPickItem objects.
 *
 * @param xmlFilePath - The path to the Liquibase XML file.
 * @returns A Promise that resolves to an array of QuickPickItem objects representing the context values.
 */
export async function readContextValues(
  xmlFilePath: string
): Promise<QuickPickItem[]> {
  // Initialize variables
  let workFolder: string;

  // Read Liquibase XML file content
  const liquibaseFile: string = fs.readFileSync(
    path.normalize(xmlFilePath),
    "utf-8"
  );
  const lines = liquibaseFile.split("\n");

  // Find the line containing 'changelogFile:'
  const changelogFileLine = lines.find((line) =>
    line.trim().startsWith("changelogFile:")
  );

  // Get the workspace folder
  workFolder = getWorkFolder();

  // Process changelogFileLine if found
  if (changelogFileLine) {
    const [, changelogFileValue] = changelogFileLine
      .split(":")
      .map((part) => part.trim());

    // Read and parse the specified XML file
    const xmlData: string = fs.readFileSync(
      path.join(workFolder, path.normalize(changelogFileValue)),
      "utf-8"
    );
    const parser = new xml2js.Parser({ explicitArray: false });
    const parsedData = await parser.parseStringPromise(xmlData);

    // Extract context values from parsed XML
    const includes = parsedData.databaseChangeLog.include;
    const contextValues: QuickPickItem[] = [];

    if (Array.isArray(includes)) {
      for (const include of includes) {
        if (include.$.context) {
          contextValues.push({ label: include.$.context });
        }
      }
    } else if (includes && includes.$.context) {
      contextValues.push({ label: includes.$.context });
    }

    return contextValues;
  }

  // Return an empty array if 'changelogFile:' line is not found
  return [];
}

/**
 * Retrieves the workspace folder for the currently active file in Visual Studio Code.
 *
 * @returns A string representing the normalized path of the workspace folder.
 */
export function getWorkFolder() {
  const activeTextEditor = vscode.window.activeTextEditor;

  if (activeTextEditor) {
    // If a file is open, use its workspace folder
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
      activeTextEditor.document.uri
    );

    if (workspaceFolder) {
      return path.normalize(workspaceFolder.uri.fsPath);
    }
  } else if (vscode.workspace.workspaceFolders) {
    // If no file is open, use the first workspace folder
    return path.normalize(vscode.workspace.workspaceFolders[0].uri.fsPath);
  }

  // Return an empty string if no workspace folder is found
  return "";
}
