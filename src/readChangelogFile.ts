import * as vscode from "vscode";
import path from "path";
import { DialogValues, OpenDialog, QuickPick } from "@aditosoftware/vscode-input";
import { readChangelog } from "./configuration/data/readFromProperties";
import { getLiquibaseFolder } from "./handleLiquibaseSettings";
import { PROPERTY_FILE } from "./input/ConnectionType";
import * as fs from "fs";
import { cacheHandler } from "./extension";
import { Logger } from "@aditosoftware/vscode-logging";
import { PickPanelConfig } from "./registerLiquibaseCommand";

// TODO TSDOC
export class ReadChangelogFile {
  /**
   * The name of the changelog selection in the quick pick.
   */
  static CHANGELOG_QUICK_PICK_NAME = "changelogQuickPick";

  /**
   * The name of the changelog selection in the open dialog.
   */
  static CHANGELOG_OPEN_DIALOG_NAME = "changelogOpenDialog";

  /**
   * Name of the option to choose a custom changelog
   */
  static CHOOSE_CHANGELOG_OPTION = "Choose Changelog...";

  // TODO TSDOC
  static generateChangelogInputs(): PickPanelConfig[] {
    return [
      {
        input: new QuickPick({
          name: this.CHANGELOG_QUICK_PICK_NAME,
          placeholder: "Select one changelog",
          title: "Select the changelog file for the command",
          generateItems: this.generateItemsForChangelogSelection,
          onBeforeInput: this.isExtraQueryForChangelogNeeded,
          onAfterInput: (dialogValues) => this.setExtraChangelogCorrectly(dialogValues, this.CHANGELOG_QUICK_PICK_NAME),
        }),
      },
      // and add the open dialog for selecting a specific element
      {
        input: new OpenDialog({
          name: this.CHANGELOG_OPEN_DIALOG_NAME,
          openDialogOptions: {
            defaultUri: vscode.Uri.file(getWorkFolder()),
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
              Changelog: ["xml", "json", "yaml", "yml", "sql"],
            },
          },
          onBeforeInput: this.isExtraQueryForChangelogNeeded,
          onAfterInput: (dialogValues) =>
            this.setExtraChangelogCorrectly(dialogValues, this.CHANGELOG_OPEN_DIALOG_NAME),
        }),
      },
    ];
  }

  /**
   * Checks if an extra user query (dialog) for the changelog file is needed.
   *
   * @param dialogValues - the current dialog values
   * @returns `true` hwn an extra changelog query is needed, `false` when none is needed
   */
  private static isExtraQueryForChangelogNeeded(dialogValues: DialogValues): boolean {
    if (dialogValues.uri) {
      // context menu, no changelog question needed
      return false;
    }

    // in all the other cases, ask for the changelog file
    return true;
  }

  /**
   * Gets the changelog file from the property file.
   * @param dialogValues - the current dialog values
   * @returns the value of the `changelogFile` in the properties
   */
  private static getChangelogFileFromProperties(dialogValues: DialogValues): string | undefined {
    const propertyFile = dialogValues.inputValues.get(PROPERTY_FILE);
    if (propertyFile && propertyFile[0]) {
      const changelog = readChangelog(propertyFile[0]);
      if (changelog) {
        // if there is a changelog in in property-file, give it back, so we can show it in the dialog
        return changelog;
      }
    }
  }

  /**
   * Checks if the changelog needs to be put into by an extra open dialog.
   * @param dialogValues - the current dialog values
   * @returns `true` if an OpenDialog is needed for selecting the changelog
   */
  private static isChangelogFromOpenDialogNeeded(dialogValues: DialogValues): boolean {
    if (this.isExtraQueryForChangelogNeeded(dialogValues)) {
      const changelogPreSelection = dialogValues.inputValues.get(this.CHANGELOG_QUICK_PICK_NAME);
      if (changelogPreSelection && changelogPreSelection[0]) {
        // check, if the correct option was selected
        return changelogPreSelection[0] === this.CHOOSE_CHANGELOG_OPTION;
      }
    }

    return false;
  }

  /**
   * Sets the changelog file from the current dialog correctly as uri (exactly as context menu).
   * This will mimic the behavior from a context menu, which is correct in this case.
   * All the magic for setting the correct changelog-file will then automatically happen.
   *
   * @param dialogValues - the dialog values with the changelog file
   * @param nameOfInput - the name of the current input that was used
   */
  private static setExtraChangelogCorrectly(dialogValues: DialogValues, nameOfInput: string): void {
    const fileSelection = dialogValues.inputValues.get(nameOfInput);

    let changelogPath: string | undefined;

    if (fileSelection && fileSelection[0]) {
      if (fileSelection[0] === this.CHOOSE_CHANGELOG_OPTION) {
        // we are not having a correct values selected, but instead a dialog progression value
        // => we do not need to save anything
        return;
      }

      if (fs.existsSync(fileSelection[0])) {
        changelogPath = fileSelection[0];
      } else {
        // in the quick pick, we could have a relative path, therefore try to transform it into absolute path again
        const combinedPath = path.join(getWorkFolder(), fileSelection[0]);
        if (fs.existsSync(combinedPath)) {
          changelogPath = combinedPath;
        }
      }
    }

    if (changelogPath) {
      // set the uri as the changelog file
      dialogValues.uri = vscode.Uri.file(changelogPath);

      // and save to cache
      const propertyFile = dialogValues.inputValues.get(PROPERTY_FILE)?.[0];
      if (propertyFile) {
        cacheHandler.saveChangelog(propertyFile, changelogPath);
      }
    } else {
      Logger.getLogger().error({ message: `Error getting a changelog path from ${fileSelection}`, notifyUser: true });
    }
  }

  // TODO TSDOC
  private static generateItemsForChangelogSelection(dialogValues: DialogValues): vscode.QuickPickItem[] {
    const items: vscode.QuickPickItem[] = [];

    // add the existing changelog to the items
    const existingChangelog = this.getChangelogFileFromProperties(dialogValues);
    if (existingChangelog) {
      items.push({ label: "configured changelog", kind: vscode.QuickPickItemKind.Separator });
      items.push({ label: existingChangelog });
    }

    // add the choose option to the items
    items.push({ label: "", kind: vscode.QuickPickItemKind.Separator });
    items.push({ label: this.CHOOSE_CHANGELOG_OPTION, iconPath: new vscode.ThemeIcon("files") });

    // and add the recently loaded elements
    const propertyFile = dialogValues.inputValues.get(PROPERTY_FILE)?.[0];
    if (propertyFile) {
      items.push({ label: "recently chosen changelogs", kind: vscode.QuickPickItemKind.Separator });
      items.push(
        ...cacheHandler
          .readChangelogs(propertyFile)
          // transform to relative path
          .map((pCachedChangelog) => {
            return path.relative(getWorkFolder(), pCachedChangelog);
          })
          // and create quick pick
          .map((pCachedChangelog) => {
            return { label: pCachedChangelog } as vscode.QuickPickItem;
          })
      );
    }

    return items;
  }
}

/**
 * Retrieves the workspace folder for the currently active file in Visual Studio Code.
 *
 * @returns A string representing the normalized path of the workspace folder.
 */
export function getWorkFolder(): string {
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
