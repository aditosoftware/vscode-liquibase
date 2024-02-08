import { AfterInputType, BeforeInputType, DialogValues, InputBase } from "..";
import * as vscode from "vscode";

type GenerateMessage = (currentResult: DialogValues) => string;

/**
 * Any confirmation dialog.
 * This dialog will be shown as a modal dialog and therefore be in the front.
 */
export class ConfirmationDialog extends InputBase {
  /**
   * The normal message of the dialog.
   */
  private message: string;

  /**
   * The detail message of this modal dialog. This will be dynamically generated from the other inputs.
   */
  private detail: GenerateMessage;

  /**
   * The name of the confirm button.
   */
  private confirmButtonName: string;

  constructor(
    message: string,
    detail: GenerateMessage,
    confirmButtonName: string,
    beforeInput?: BeforeInputType,
    afterInput?: AfterInputType
  ) {
    super("Confirmation", beforeInput, afterInput);

    this.message = message;
    this.detail = detail;
    this.confirmButtonName = confirmButtonName;
  }

  async showDialog(currentResults: DialogValues): Promise<boolean | undefined> {
    // show the dialog and only return true, if Yes was selected
    const answer = await vscode.window.showInformationMessage(
      this.message,
      {
        detail: this.detail(currentResults),
        modal: true,
      },
      this.confirmButtonName
    );
    if (answer === this.confirmButtonName) {
      return true;
    }
  }
}
