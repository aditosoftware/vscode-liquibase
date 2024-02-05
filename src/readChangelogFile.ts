import * as vscode from "vscode";
import { QuickPickItem } from "vscode";
import path from "path";
import { getClasspathSeparator } from "./utilities/osUtilities";
import { DialogValues, PROPERTY_FILE } from "./input";
import { readChangelog, readChangelogAndClasspathFile } from "./configuration/data/readFromProperties";
import { getLiquibaseFolder } from "./handleLiquibaseSettings";
import { loadContextsFromChangelogFile } from "./executeJar";

/**
 * Checks if an extra user query (dialog) for the changelog file is needed.
 *
 * @param dialogValues - the current dialog values
 * @returns `true` hwn an extra changelog query is needed, `false` when none is needed
 */
export function isExtraQueryForChangelogNeeded(dialogValues: DialogValues): boolean {
  if (dialogValues.uri) {
    // context menu, no changelog question needed
    return false;
  }

  // otherwise, find out the property-file from the options
  const propertyFile = dialogValues.inputValues.get(PROPERTY_FILE);
  if (propertyFile && propertyFile[0]) {
    const changelog = readChangelog(propertyFile[0]);
    if (changelog) {
      // if there is a changelog in in property-file, no changelog question needed
      return false;
    }
  }

  // in all the other cases, ask for the changelog file
  return true;
}

/**
 * Sets the changelog file from the current dialog correctly as uri (exactly as context menu).
 * This will mimic the behavior from a context menu, which is correct in this case.
 * All the magic for setting the correct changelog-file will then automatically happen.
 *
 * @param dialogValues - the dialog values with the changelog file
 */
export function setExtraChangelogCorrectly(dialogValues: DialogValues): void {
  const fileSelection = dialogValues.inputValues.get("changelog");
  if (fileSelection && fileSelection[0]) {
    dialogValues.uri = vscode.Uri.file(fileSelection[0]);
  }
}

/**
 * Reads context values from a Liquibase XML file and returns them as an array of QuickPickItem objects.
 *
 * @param liquibasePropertiesPath - The path to the Liquibase properties file.
 * @returns A Promise that resolves to an array of QuickPickItem objects representing the context values.
 */
export async function readContextValues(currentResults: DialogValues): Promise<QuickPickItem[]> {
  const liquibasePropertiesPath = currentResults.inputValues.get(PROPERTY_FILE)?.[0];

  if (!liquibasePropertiesPath) {
    return [];
  }

  if (currentResults.uri) {
    // we are in a right click menu, read the contexts from this file
    return await loadContextsFromChangelogFile(currentResults.uri.fsPath);
  }

  // Read Liquibase changelog  and classpath lines from properties file content
  const classpathAndChangelogs = readChangelogAndClasspathFile(liquibasePropertiesPath, getClasspathSeparator());

  const contextValues: QuickPickItem[] = [];

  // Process changelogFileLine if found
  if (classpathAndChangelogs) {
    const changelogFileLine = classpathAndChangelogs.changelog;

    for (const classpath of classpathAndChangelogs.classpath) {
      // Read and parse the specified XML file
      const possibleFile = path.join(classpath, path.normalize(changelogFileLine.trim()));
      const contexts = await loadContextsFromChangelogFile(possibleFile);
      contextValues.push(...contexts);
    }
  }

  // Return an empty array if 'changelogFile:' line is not found
  return contextValues;
}

/**
 * Retrieves the workspace folder for the currently active file in Visual Studio Code.
 *
 * @returns A string representing the normalized path of the workspace folder.
 */
export function getWorkFolder() {
  // First, find out the setting of the work folder of liquibase
  const liquibaseFolder = getLiquibaseFolder();
  if (liquibaseFolder) {
    return path.normalize(liquibaseFolder);
  }

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
