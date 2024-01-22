import { DialogValues, InputBase } from "..";
import * as vscode from "vscode";

type QuickPickItemFunction = (currentResults: DialogValues) => Promise<vscode.QuickPickItem[]> | vscode.QuickPickItem[];

/**
 * Any quick pick that is not an selection of an connection.
 */
export class QuickPick extends InputBase {
  private allowMultiple: boolean;
  private generateItems: QuickPickItemFunction;
  private title: string;

  constructor(name: string, title: string, allowMultiple: boolean, generateItems: QuickPickItemFunction) {
    super(name);
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
      placeHolder: `Select one ${this.allowMultiple ? "or more items" : "item"}`,
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
