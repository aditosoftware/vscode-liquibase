import { AfterInputType, BeforeInputType, DialogValues, InputBase } from "..";
import * as vscode from "vscode";

/**
 * Input for any free text.
 */
export class InputBox extends InputBase {

  /**
   * Any options for the input box.
   */
  private readonly inputBoxOptions: vscode.InputBoxOptions;

  constructor(
    name: string,
    inputBoxOptions: vscode.InputBoxOptions,
    beforeInput?: BeforeInputType,
    afterInput?: AfterInputType
  ) {
    super(name, beforeInput, afterInput);
    this.inputBoxOptions = inputBoxOptions;
  }

  async showDialog(
    _currentResults: DialogValues,
    currentStep: number,
    maximumStep: number
  ): Promise<string | undefined> {
    const stepOutput = this.generateStepOutput(currentStep, maximumStep);

    // copy the options, so they will not persist during multiple dialogs
    const options = { ...this.inputBoxOptions };
    if (options.title) {
      // add the step indicator to the title
      options.title += ` ${stepOutput}`;
    } else {
      // fallback, if no title was given
      options.title = `Choose a value - ${stepOutput}`;
    }

    return await vscode.window.showInputBox(options);
  }
}
