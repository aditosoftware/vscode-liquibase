import { DialogValues, InputBase } from "..";
import * as vscode from "vscode";

type QuickPickItems = (currentResults: DialogValues) => Promise<vscode.QuickPickItem[]> | vscode.QuickPickItem[];

/**
 * Any quick pick that is not an selection of an connection.
 */
export class QuickPick extends InputBase {
  private allowMultiple: boolean;
  private generateItems: QuickPickItems;

  constructor(name: string, allowMultiple: boolean, generateItems: QuickPickItems) {
    super(name);
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
      title: `Select one item${this.allowMultiple ? " or more items" : ""} - ${this.generateStepOutput(
        currentStep,
        maximumStep
      )}`,
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
