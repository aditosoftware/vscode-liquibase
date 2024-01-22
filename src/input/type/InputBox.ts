import { DialogValues, InputBase } from "..";
import * as vscode from "vscode";

/**
 * Input for any free text.
 */
export class InputBox extends InputBase {
  private inputBoxOptions: vscode.InputBoxOptions;

  constructor(name: string, inputBoxOptions: vscode.InputBoxOptions) {
    super(name);
    this.inputBoxOptions = inputBoxOptions;
  }

  async showDialog(
    _currentResults: DialogValues,
    currentStep: number,
    maximumStep: number
  ): Promise<string | undefined> {
    const stepOutput = this.generateStepOutput(currentStep, maximumStep);

    // add the step indicator to the title
    if (this.inputBoxOptions.title) {
      this.inputBoxOptions.title += ` ${stepOutput}`;
    } else {
      // fallback, if no title was given
      this.inputBoxOptions.title = `Choose a value - ${stepOutput}`;
    }

    return await vscode.window.showInputBox(this.inputBoxOptions);
  }
}
