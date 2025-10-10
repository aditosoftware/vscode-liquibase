import path from "node:path";
import * as vscode from "vscode";
import { LiquibaseConfigurationData } from "./data/LiquibaseConfigurationData";
import { LiquibaseConfigurationPanel } from "../panels/LiquibaseConfigurationPanel";
import { MessageType } from "./transfer";

/**
 * Chooses a file for a changelog. This result will be given back to the webview.
 *
 * @param data - the data from the message from the webview
 */
export async function chooseFileForChangelog(data: LiquibaseConfigurationData): Promise<void> {
  const result = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    defaultUri: vscode.Uri.file(data.liquibaseSettings.liquibaseDirectoryInProject),
    filters: {
      Changelog: ["json", "sql", "xml", "yml", "yaml"],
      "All Files": ["*"],
    },
  });

  if (result?.[0]) {
    const chosenFile = result[0].fsPath;

    // find out relative path
    let relativePath = path.relative(data.liquibaseSettings.liquibaseDirectoryInProject, chosenFile);

    if (relativePath === chosenFile) {
      // if the path could not be transformed to a relative path, e.g. when on other drive, then add a new element to the classpath and
      // make a relative path from the new classpathElement
      const directoryOfChosenFile = path.dirname(chosenFile);
      relativePath = path.relative(directoryOfChosenFile, chosenFile);
    }

    data.changelogFile = relativePath;
    LiquibaseConfigurationPanel.transferMessage(MessageType.CHOOSE_CHANGELOG_RESULT, data);
  }
}
