import { InputBase, DialogValues } from ".";
import { Logger } from "@aditosoftware/vscode-logging";

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

  let totalNumber: number = inputs.length;

  for (const input of inputs) {
    // check if input is needed
    if (!input.beforeInput || input.beforeInput(dialogValues)) {
      // if needed, then show dialog
      const result = await input.showDialog(dialogValues, currentStep, totalNumber);

      if (!result) {
        // User canceled the selection
        Logger.getLogger().debug({ message: `Command ${input.name} was cancelled` });
        return;
      }

      dialogValues.addValue(input, result);

      // if there is some special behavior after the input, handle it
      if (input.afterInput) {
        input.afterInput(dialogValues);
      }

      currentStep++;
    } else {
      // input not needed, count down total number
      totalNumber--;
    }
  }

  return dialogValues;
}
