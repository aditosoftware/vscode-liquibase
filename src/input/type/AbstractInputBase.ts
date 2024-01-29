import { DialogValues } from "..";

/**
 * Type of the function that can be used the check, if the input should be shown or not. If the function returns `true`, then it should be shown.
 * If the function returns `false`, then the dialog will not be shown.
 */
export type BeforeInputType = (dialogValues: DialogValues) => boolean;

/**
 * Type of the function that can be used to do some action after the input was shown.
 *
 * This can be for example used, if you get a value from any dialog values normal input that should be used as an uri instead.
 */
export type AfterInputType = (dialogValues: DialogValues) => void;

/**
 * Any input for the extension.
 */
export abstract class InputBase {
  /**
   * The unique name which is needed to store the values.
   * This should be unique among all inputs from one multi-step input.
   */
  readonly name: string;

  /**
   * Function that should be executed before the input is shown.
   *
   * This function can be used the check, if the input should be shown or not. If the function returns `true`, then it should be shown.
   */
  readonly beforeInput?: BeforeInputType;

  /**
   * Function that should be executed after the input was shown and the new value was saved into the dialog values.
   *
   * This can be for example used, if you get a value from any dialog values normal input that should be used as an uri instead.
   */
  readonly afterInput?: AfterInputType;

  constructor(name: string, beforeInput?: BeforeInputType, afterInput?: AfterInputType) {
    this.name = name;
    this.beforeInput = beforeInput;
    this.afterInput = afterInput;
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
