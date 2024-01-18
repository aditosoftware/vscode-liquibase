import { InputBase } from ".";
import * as vscode from 'vscode';

/**
 * Any confirmation dialog.
 */
export class ConfirmationDialog extends InputBase<boolean> {
  private message: string;

  constructor(message: string) {
    super();
    this.message = message;
  }

  async showDialog(_currentStep: number, _maximumStep: number): Promise<boolean | undefined> {
    const answer = await vscode.window.showInformationMessage(this.message, "Yes", "No");
    if (answer === "Yes") {
      return true;
    }
  }
}
