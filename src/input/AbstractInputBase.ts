/**
 * Any input for the extension.
 * // TODO resultType einschränken?  extends string | string[] | boolean
 */
export abstract class InputBase<ResultType> {
  /**
   * Shows the dialog and returns the result of it.
   *
   * **Note:** If you override this method, you will need async.
   *
   * @param currentStep - the current step number of the dialog
   * @param maximumStep - the maximum step number of the dialog
   * @returns the inputted value or undefined, when any error / invalid input occurs
   */
  abstract showDialog(currentStep: number, maximumStep: number): Promise<ResultType | undefined>;

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
