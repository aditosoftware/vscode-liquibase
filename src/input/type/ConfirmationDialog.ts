import { AfterInputType, BeforeInputType, DialogValues, InputBase } from "..";
import * as vscode from "vscode";

type GenerateMessage = (currentResult: DialogValues) => string;

/**
 * Any confirmation dialog.
 */
export class ConfirmationDialog extends InputBase {
  /**
   * A message that does not change.
   */
  private fixedMessage?: string;

  /**
   * A message that is dynamically created based on other dialog values.
   */
  private generateMessage?: GenerateMessage;

  /**
   * @param message - either a fixed message or a generate message
   */
  constructor(message: GenerateMessage | string, beforeInput?: BeforeInputType, afterInput?: AfterInputType) {
    super("Confirmation", beforeInput, afterInput);

    if (typeof message === "string") {
      this.fixedMessage = message;
    } else {
      this.generateMessage = message;
    }
  }

  async showDialog(
    currentResults: DialogValues,
    _currentStep: number,
    _maximumStep: number
  ): Promise<boolean | undefined> {
    // generate the message for the dialog
    let message;
    if (this.fixedMessage) {
      message = this.fixedMessage;
    } else if (this.generateMessage) {
      message = this.generateMessage(currentResults);
    } else {
      // Fallback, normally not needed
      message = "Are you sure?";
    }

    // show the dialog and only return true, if Yes was selected
    const answer = await vscode.window.showInformationMessage(message, "Yes", "No");
    if (answer === "Yes") {
      return true;
    }
  }
}
