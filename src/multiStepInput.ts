import * as vscode from "vscode";

// TODO mit Fadlers Logik zusammenführen?

/**
 * Creates a multi step input. This has a title with the current step count.
 * @param pTitle - the general title of input. This will be displayed above every input with a `currentCount/maxCount` information
 * @param pOptions - the options for every input. Please note that the `title` will be overridden
 * @returns the results of this multiStep input
 */
export async function multiStepInput(pTitle: string, pOptions: StepOption[]): Promise<StepResults | undefined> {
  const totalSteps = pOptions.length;
  let currentStep = 1;
  const results: StepResults = {};

  for (const option of pOptions) {
    const result = await vscode.window.showInputBox({
      ...option.inputBoxOption,
      title: `${pTitle} (${currentStep++}/${totalSteps})`,
    });

    if (!result) {
      vscode.window.showInformationMessage("Input cancelled or empty. Exiting.");
      return undefined;
    }

    if (option.key) {
      results[option.key] = result;
    }
  }

  return results;
}

/**
 * The results of the MultiStep input.
 * The key of each element is the title of the current InputBoxOptions.
 */
export interface StepResults {
  [prompt: string]: string;
}

/**
 * A option for a input step element.
 */
export interface StepOption {
  /**
   * The key for saving the step result.
   */
  key: string;

  /**
   * The option of this element.
   */
  inputBoxOption: vscode.InputBoxOptions;
}
