import * as fs from "fs";
import * as xml2js from "xml2js";
import * as vscode from "vscode";
import { QuickPickItem } from "vscode";
import path from "path";
import { isWindows } from "./utilities/osUtilities";
import { DialogValues, PROPERTY_FILE } from "./input";
import { readChangelogAndClasspathFile } from "./configuration/data/readFromProperties";

/**
 * Reads context values from a Liquibase XML file and returns them as an array of QuickPickItem objects.
 *
 * @param liquibasePropertiesPath - The path to the Liquibase properties file.
 * @returns A Promise that resolves to an array of QuickPickItem objects representing the context values.
 */
export async function readContextValues(currentResults: DialogValues): Promise<QuickPickItem[]> {
  let liquibasePropertiesPath = currentResults.inputValues.get(PROPERTY_FILE)?.[0];

  if (!liquibasePropertiesPath) {
    return [];
  }

  if (currentResults.uri) {
    // we are in a right click menu, read the contexts from this file
    return await readValuesFromFile(currentResults.uri.fsPath);
  }

  // Read Liquibase changelog  and classpath lines from properties file content
  const classpathAndChangelogs = readChangelogAndClasspathFile(liquibasePropertiesPath, isWindows());

  const contextValues: QuickPickItem[] = [];

  // Process changelogFileLine if found
  if (classpathAndChangelogs) {
    const changelogFileLine = classpathAndChangelogs.changelog;

    for (const classpath of classpathAndChangelogs.classpath) {
      // Read and parse the specified XML file
      const possibleFile = path.join(classpath, path.normalize(changelogFileLine.trim()));
      const contexts = await readValuesFromFile(possibleFile);
      contexts.forEach((pContext) => contextValues.push(pContext));
    }
  }

  // Return an empty array if 'changelogFile:' line is not found
  return contextValues;
}

/**
 * Reads the values from a file
 * @param possibleFile - the possible file which should be read
 * @returns all the quick pick items that contains contexts of the changelog file
 */
async function readValuesFromFile(possibleFile: string): Promise<vscode.QuickPickItem[]> {
  const contextValues: QuickPickItem[] = [];

  if (fs.existsSync(possibleFile)) {
    const xmlData: string = fs.readFileSync(possibleFile, "utf-8");
    const parser = new xml2js.Parser({ explicitArray: false });
    const parsedData = await parser.parseStringPromise(xmlData);

    // Extract context values from parsed XML
    const includes = parsedData.databaseChangeLog.include;

    if (Array.isArray(includes)) {
      for (const include of includes) {
        if (include.$.context) {
          contextValues.push({ label: include.$.context });
        }
      }
    } else if (includes && includes.$.context) {
      contextValues.push({ label: includes.$.context });
    }
  }

  return contextValues;
}

/**
 * Retrieves the workspace folder for the currently active file in Visual Studio Code.
 *
 * @returns A string representing the normalized path of the workspace folder.
 */
export function getWorkFolder() {
  // TODO hier liquibase-Ordner aus den Settings heranziehen? Benötigt? export notwendig?
  const activeTextEditor = vscode.window.activeTextEditor;

  if (activeTextEditor) {
    // If a file is open, use its workspace folder
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeTextEditor.document.uri);

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
