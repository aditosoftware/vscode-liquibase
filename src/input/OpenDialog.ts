import { InputBase } from ".";
import * as vscode from "vscode";

/**
 * Input for any Open Dialog (files and directory).
 */
export class OpenDialog extends InputBase<string[]> {
  private openDialogOptions: vscode.OpenDialogOptions;

  constructor(openDialogOptions: vscode.OpenDialogOptions) {
    super();
    this.openDialogOptions = openDialogOptions;
  }

  async showDialog(currentStep: number, maximumStep: number): Promise<string[] | undefined> {
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
