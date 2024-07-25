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
import { CHOOSE_CHANGELOG_OPTION } from "./constants";

/**
 * Class for handling the changelog file input in the dialog.
 */
export class HandleChangelogFileInput {
  /**
   * The name where the correct changelog will be stored.
   */
  static readonly CHANGELOG_NAME = "changelog";

  /**
   * The name of the changelog selection in the quick pick.
   */
  static readonly CHANGELOG_QUICK_PICK_NAME = "changelogQuickPick";

  /**
   * The name of the changelog selection in the open dialog.
   */
  static readonly CHANGELOG_OPEN_DIALOG_NAME = "changelogOpenDialog";

  /**
   * Generates the inputs for selecting the changelog.
   *
   * @returns - the inputs for selecting the changelog
   */
  static generateChangelogInputs(): PickPanelConfig[] {
    return [
      {
        input: new QuickPick({
          name: this.CHANGELOG_QUICK_PICK_NAME,
          placeHolder: "Select the changelog file",
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
            openLabel: "Select the changelog",
            filters: {
              Changelog: ["xml", "json", "yaml", "yml", "sql"],
              "All Files": ["*"],
            },
          },
          onBeforeInput: this.isOpenDialogNeeded,
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
   * @returns `true` when an extra changelog query is needed, `false` when none is needed
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
   * Checks if the open dialog for selecting the changelog is needed.
   *
   * @param dialogValues - the current dialog values
   * @returns `true` when the changelog needs to be selected from the open dialog, `false` when none is needed
   */
  private static isOpenDialogNeeded(dialogValues: DialogValues): boolean {
    return (
      HandleChangelogFileInput.isExtraQueryForChangelogNeeded(dialogValues) &&
      dialogValues.inputValues.get(HandleChangelogFileInput.CHANGELOG_QUICK_PICK_NAME)?.[0] === CHOOSE_CHANGELOG_OPTION
    );
  }

  /**
   * Gets the changelog file from the property file.
   *
   * @param dialogValues - the current dialog values
   * @returns the value of the `changelogFile` in the properties
   */
  private static getChangelogFileFromProperties(dialogValues: DialogValues): string | undefined {
    const propertyFile = dialogValues.inputValues.get(PROPERTY_FILE);
    if (propertyFile && propertyFile[0]) {
      const changelog = readChangelog(propertyFile[0]);
      if (changelog) {
        // if there is a changelog in in property-file, return it, so we can show it in the dialog
        return changelog;
      }
    }
  }

  /**
   * Checks if the changelog needs to be put into by an extra open dialog.
   *
   * @param dialogValues - the current dialog values
   * @returns `true` if an OpenDialog is needed for selecting the changelog
   */
  private static isChangelogFromOpenDialogNeeded(dialogValues: DialogValues): boolean {
    if (this.isExtraQueryForChangelogNeeded(dialogValues)) {
      const changelogPreSelection = dialogValues.inputValues.get(this.CHANGELOG_QUICK_PICK_NAME);
      if (changelogPreSelection && changelogPreSelection[0]) {
        // check, if the correct option was selected
        return changelogPreSelection[0] === CHOOSE_CHANGELOG_OPTION;
      }
    }

    return false;
  }

  /**
   * Sets the changelog file from the current dialog correctly as uri (exactly as context menu).
   * This will mimic the behavior from a context menu, which is correct in this case.
   * All the logic for setting the correct changelog-file will then automatically happen.
   *
   * @param dialogValues - the dialog values with the changelog file
   * @param nameOfInput - the name of the current input that was used
   */
  private static setExtraChangelogCorrectly(dialogValues: DialogValues, nameOfInput: string): void {
    const fileSelection = dialogValues.inputValues.get(nameOfInput);

    let changelogPath: string | undefined;

    if (fileSelection && fileSelection[0]) {
      if (fileSelection[0] === CHOOSE_CHANGELOG_OPTION) {
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
      // add the changelog path to the dialog values.
      // This will be transformed before the command execution into an URI.
      // It can not be done now, because otherwise you can´t go back to the changelog inputs
      dialogValues.addValue(this.CHANGELOG_NAME, changelogPath);

      // and save to cache
      const propertyFile = dialogValues.inputValues.get(PROPERTY_FILE)?.[0];
      if (propertyFile) {
        cacheHandler.saveChangelog(propertyFile, changelogPath);
      }
    } else {
      Logger.getLogger().error({ message: `Error getting a changelog path from ${fileSelection}`, notifyUser: true });
    }
  }

  /**
   * Generates the items for the changelog selection.
   *
   * @param dialogValues - the current dialog values
   * @returns the items that should be there to select the changelog
   */
  private static generateItemsForChangelogSelection(dialogValues: DialogValues): vscode.QuickPickItem[] {
    const items: vscode.QuickPickItem[] = [];

    // add the existing changelog to the items
    const existingChangelog = HandleChangelogFileInput.getChangelogFileFromProperties(dialogValues);
    if (existingChangelog) {
      items.push({ label: "configured changelog", kind: vscode.QuickPickItemKind.Separator });
      items.push({ label: existingChangelog });
    }

    // add the choose option to the items
    items.push({ label: "", kind: vscode.QuickPickItemKind.Separator });
    items.push({ label: CHOOSE_CHANGELOG_OPTION, iconPath: new vscode.ThemeIcon("files") });

    // and add the recently loaded elements
    const propertyFile = dialogValues.inputValues.get(PROPERTY_FILE)?.[0];
    if (propertyFile) {
      const cachedElements = cacheHandler
        .readChangelogs(propertyFile)
        // transform to relative path
        .map((pCachedChangelog) => {
          return path.relative(getWorkFolder(), pCachedChangelog);
        })
        // and create quick pick
        .map((pCachedChangelog) => {
          return { label: pCachedChangelog } as vscode.QuickPickItem;
        });

      if (cachedElements && cachedElements.length !== 0) {
        items.push({ label: "recently chosen changelogs", kind: vscode.QuickPickItemKind.Separator });
        items.push(...cachedElements);
      }
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
