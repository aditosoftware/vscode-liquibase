import { DialogValues, InputBase, BeforeInputType, AfterInputType } from "..";
import * as vscode from "vscode";

/**
 * The name that should be used for any folder selection.
 */
export const folderSelectionName = "folderSelection";

/**
 * Input for any Open Dialog (files and directory).
 */
export class OpenDialog extends InputBase {
  /**
   * Any options for the open dialog
   */
  private readonly openDialogOptions: vscode.OpenDialogOptions;

  constructor(
    openDialogOptions: vscode.OpenDialogOptions,
    name: string = folderSelectionName,
    beforeInput?: BeforeInputType,
    afterInput?: AfterInputType
  ) {
    super(name, beforeInput, afterInput);
    this.openDialogOptions = openDialogOptions;
  }

  async showDialog(
    _currentResults: DialogValues,
    currentStep: number,
    maximumStep: number
  ): Promise<string[] | undefined> {
    const stepOutput = this.generateStepOutput(currentStep, maximumStep);

    // copy the options, so they will not persist during multiple dialogs
    const options = { ...this.openDialogOptions };
    if (options.title) {
      options.title += ` ${stepOutput}`;
    } else {
      options.title = `Select a ${options.canSelectFolders ? "Directory" : "File"} - ${stepOutput}`;
    }

    return await vscode.window.showOpenDialog(options).then((uri) => {
      if (uri) {
        // get from any uri the fileSystem path
        return uri.map((pElement) => pElement.fsPath);
      }
    });
  }
}
