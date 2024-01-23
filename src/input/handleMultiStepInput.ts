import { InputBase, DialogValues } from ".";
import * as vscode from "vscode";

/**
 * Handles a multi-step input. All the inputs will be progressed in order.
 * If any input comes back as undefined, then an information message will be shown to the user
 * and nothing will be returned.
 * @param inputs - the inputs that should be progressed
 * @param dialogValues - the dialog values with any values that were given before the multi-step-input was called.
 * @returns the dialog values from the inputs
 */
export async function handleMultiStepInput(
  inputs: InputBase[],
  dialogValues?: DialogValues
): Promise<DialogValues | undefined> {
  let currentStep: number = 1;

  if (!dialogValues) {
    dialogValues = new DialogValues();
  }

  for (const input of inputs) {
    const result = await input.showDialog(dialogValues, currentStep, inputs.length);

    if (!result) {
      // User canceled the selection
      vscode.window.showInformationMessage("Command was cancelled");
      return;
    }

    dialogValues.addValue(input, result);

    currentStep++;
  }

  return dialogValues;
}
