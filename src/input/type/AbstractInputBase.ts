import { DialogValues } from "..";

/**
 * Any input for the extension.
 */
export abstract class InputBase {
  
  /**
   * The unique name which is needed to store the values.
   * This should be unique among all inputs from one multi-step input.
   */
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Shows the dialog and returns the result of it.
   *
   * **Note:** If you override this method, you will need async.
   *
   * @param currentResults  - the current results of the dialog
   * @param currentStep - the current step number of the dialog
   * @param maximumStep - the maximum step number of the dialog
   * @returns the inputted value or undefined, when any error / invalid input occurs
   */
  abstract showDialog(
    currentResults: DialogValues,
    currentStep: number,
    maximumStep: number
  ): Promise<string | string[] | boolean | undefined>;

  /**
   * Generate a step output that will read `(Step <current> of <maximum>)`.
   * This should be included in the title of the dialogs.
   * @param currentStep - the current step number of the dialog
   * @param maximumStep - the maximum step number of the dialog
   * @returns the step output
   */
  protected generateStepOutput(currentStep: number, maximumStep: number): string {
    return `(Step ${currentStep} of ${maximumStep})`;
  }
}
