import { InputBase } from ".";

/**
 * The values of the dialog.
 */
export class DialogValues {
  /**
   * If there was a confirmation, then the result will be saved here.
   */
  confirmation?: boolean;

  /**
   * The values that were given by the user.
   * The key is the input, which was used to get the value.
   * The value is always stored as a string[], even if it is only a string.
   */
  inputValues: Map<string, string[]> = new Map();

  /**
   * Adds a value to the inputValues.
   *
   * @param input - the input which was used to get any value from the user
   * @param result - the result given by the user
   */
  addValue(input: InputBase, result: string | string[] | boolean) {
    if (typeof result === "boolean") {
      this.confirmation = result;
    } else {
      // create the elements for storing it in the input values
      const elements: string[] = [];
      if (typeof result === "string") {
        elements.push(result);
      } else if (Array.isArray(result)) {
        result.forEach((pResult) => elements.push(pResult));
      }

      // and store it there
      this.inputValues.set(input.name, elements);
    }
  }
}
