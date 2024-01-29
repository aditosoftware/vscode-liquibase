import { AfterInputType, BeforeInputType, DialogValues, InputBase } from "..";
import * as vscode from "vscode";

/**
 * The type of the function to generate the items for the quickPick.
 *
 * This function can read all previous entered dialog values.
 */
type QuickPickItemFunction = (currentResults: DialogValues) => Promise<vscode.QuickPickItem[]> | vscode.QuickPickItem[];

/**
 * Any quick pick that is not an selection of an connection.
 */
export class QuickPick extends InputBase {
  /**
   * The title of the quick pick.
   */
  private title: string;

  /**
   * Option, if multiple elements are allowed.
   * If no value present, then only one element is allowed.
   */
  private allowMultiple?: boolean;
  /**
   * Any function to generate the items for the quick pick. This can be a sync or async function.
   */
  private generateItems: QuickPickItemFunction;

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
      title: `${this.title} -  ${this.generateStepOutput(currentStep, maximumStep)}`,
      placeHolder: `Select ${this.allowMultiple ? "any number of items" : "one item"}`,
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
}
