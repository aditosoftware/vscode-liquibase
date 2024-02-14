import path from "path";
import { DialogValues, folderSelectionName } from "./input";
import { openDocument } from "./utilities/vscodeUtilities";
import * as vscode from "vscode";
import * as fs from "fs";
import { Logger } from "@aditosoftware/vscode-logging";

/**
 * The name that should be used for any file name input.
 */
export const fileName = "fileName";

/**
 * Generates the command line arguments for an element that needs path from a folder selection and a file name from a text input.
 *
 * **Note:** To work correctly, you should have `folderSelection` and `fileName` as your inputs for folder and file.
 *
 * @param argument - the argument where the generated full path should be connected to
 * @param dialogValues - the dialog values
 * @returns the generated command line arguments
 */
export function generateCommandLineArgs(argument: string, dialogValues: DialogValues) {
  const fullPathToChangelog = generateFilePath(dialogValues);

  if (fullPathToChangelog) {
    return [`--${argument}=${fullPathToChangelog}`];
  }
}

/**
 * Opens the created file after the command was executed.
 * @param dialogValues - the dialog values
 */
export async function openFileAfterCommandExecution(dialogValues: DialogValues) {
  const fullPathToChangelog = generateFilePath(dialogValues);
  if (fullPathToChangelog) {
    await openDocument(fullPathToChangelog);
  }
}

/**
 * Generates the file with the folder selection and the file ending for further commands.
 *
 * **Note:** To work correctly, you should have `folderSelection` and `fileName` as your inputs for folder and file.
 *
 * @param dialogValues - the dialog values
 * @returns the generated file path
 */
function generateFilePath(dialogValues: DialogValues): string | undefined {
  const folder = dialogValues.inputValues.get(folderSelectionName)?.[0];
  const name = dialogValues.inputValues.get(fileName)?.[0];

  if (folder && name) {
    return path.join(folder, name);
  }
}

/**
 * Opens the index.html, when the command was finished.
 * @param dialogValues - the dialog values
 */
export async function openIndexHtmlAfterCommandExecution(dialogValues: DialogValues) {
  const folder = dialogValues.inputValues.get(folderSelectionName)?.[0];

  if (folder) {
    try {
      // try to correctly move the columns folder under the tables folder, so all links resolve
      const columns = path.join(folder, "columns");
      const tables = path.join(folder, "tables");

      if (fs.existsSync(columns) && fs.existsSync(tables)) {
        const filesAndFolders = fs.readdirSync(columns);

        const newColumns = path.join(tables, "columns");
        fs.mkdirSync(newColumns);

        for (const item of filesAndFolders) {
          const sourcePath = path.join(columns, item);
          const destinationPath = path.join(newColumns, item);

          fs.renameSync(sourcePath, destinationPath);
        }
        fs.rmdirSync(columns);
      }
    } catch (error) {
      Logger.getLogger().error("error while trying to move files", error);
    }

    const fullPath = path.join(folder, "index.html");
    const uri = vscode.Uri.file(fullPath);
    await vscode.env.openExternal(uri);
  }
}
