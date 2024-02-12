import { AfterInputType, BeforeInputType, DialogValues, InputBase } from "..";
import * as vscode from "vscode";

/**
 * The type of the function to generate the items for the quickPick.
 *
 * This function can read all previous entered dialog values.
 */
export type QuickPickItemFunction = (
  currentResults: DialogValues
) => Promise<vscode.QuickPickItem[]> | vscode.QuickPickItem[];

/**
 * Any quick pick that is not an selection of an connection.
 */
export class QuickPick extends InputBase {
  /**
   * The title of the quick pick.
   */
  protected title: string;

  /**
   * Option, if multiple elements are allowed.
   * If no value present, then only one element is allowed.
   */
  protected allowMultiple?: boolean;
  /**
   * Any function to generate the items for the quick pick. This can be a sync or async function.
   */
  protected generateItems: QuickPickItemFunction;

  constructor(
    name: string,
    title: string,
    generateItems: QuickPickItemFunction,
    allowMultiple?: boolean,
    beforeInput?: BeforeInputType,
    afterInput?: AfterInputType
  ) {
    super(name, beforeInput, afterInput);
    this.title = title;
    this.allowMultiple = allowMultiple;
    this.generateItems = generateItems;
  }

  async showDialog(
    currentResults: DialogValues,
    currentStep: number,
    maximumStep: number
  ): Promise<string[] | undefined> {
    const items = await this.generateItems(currentResults);

    const result: vscode.QuickPickItem | vscode.QuickPickItem[] | undefined = await vscode.window.showQuickPick(items, {
      canPickMany: this.allowMultiple,
      title: this.generateTitle(this.title, currentStep, maximumStep),
      placeHolder: this.generatePlaceholder(),
    });

    if (result) {
      if (Array.isArray(result)) {
        return result.map((pElement) => pElement.label);
      } else {
        return [result.label];
      }
    }

    return result;
  }

  /**
   * Generates the whole title for the input by using the given title and the step output
   * @param pTitle - the describing text title. This should be given by creating the class
   * @param currentStep - the current step of the input
   * @param maximumStep - the maximum step of the input
   * @returns the generated title
   */
  protected generateTitle(pTitle: string, currentStep: number, maximumStep: number): string {
    return `${pTitle} -  ${this.generateStepOutput(currentStep, maximumStep)}`;
  }

  /**
   * Generates the placeholder by using the allowMultiple flag.
   * @returns the generated placeholder
   */
  protected generatePlaceholder(): string {
    return `Select ${this.allowMultiple ? "any number of items" : "one item"}`;
  }
}
