import { DialogValues, InputBase } from "..";
import * as vscode from "vscode";

/**
 * Input for any free text.
 */
export class InputBox extends InputBase {
  private inputBoxOptions: vscode.InputBoxOptions;

  constructor(name: string, placeholder: string);
  constructor(name: string, inputBoxOptions: vscode.InputBoxOptions);
  constructor(name: string, option: vscode.InputBoxOptions | string) {
    super(name);
    if (typeof option === "string") {
      this.inputBoxOptions = { placeHolder: option };
    } else {
      this.inputBoxOptions = option;
    }
  }

  async showDialog(
    _currentResults: DialogValues,
    currentStep: number,
    maximumStep: number
  ): Promise<string | undefined> {
    const stepOutput = this.generateStepOutput(currentStep, maximumStep);
    if (this.inputBoxOptions.title) {
      this.inputBoxOptions.title += ` ${stepOutput}`;
    } else {
      this.inputBoxOptions.title = `Choose a name - ${stepOutput}`; // XXX passt das für alles?
    }

    return await vscode.window.showInputBox(this.inputBoxOptions);
  }
}
