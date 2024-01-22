import { DialogValues, InputBase } from "..";
import * as vscode from "vscode";

/**
 * The name that should be used for any folder selection.
 */
export const folderSelectionName = "folderSelection";

/**
 * Input for any Open Dialog (files and directory).
 */
export class OpenDialog extends InputBase {
  private openDialogOptions: vscode.OpenDialogOptions;

  constructor(openDialogOptions: vscode.OpenDialogOptions, name: string = folderSelectionName) {
    super(name);
    this.openDialogOptions = openDialogOptions;
  }

  async showDialog(
    _currentResults: DialogValues,
    currentStep: number,
    maximumStep: number
  ): Promise<string[] | undefined> {
    const stepOutput = this.generateStepOutput(currentStep, maximumStep);

    if (this.openDialogOptions.title) {
      this.openDialogOptions.title += ` ${stepOutput};`;
    } else {
      this.openDialogOptions.title = `Select ${
        this.openDialogOptions.canSelectFolders ? "Directory" : "File"
      } - ${stepOutput}`;
    }

    return await vscode.window.showOpenDialog(this.openDialogOptions).then((uri) => {
      if (uri) {
        // get from any uri the fileSystem path
        return uri.map((pElement) => pElement.fsPath);
      }
    });
  }
}
