import { InputBase } from ".";
import * as vscode from "vscode";

type QuickPickItems = () => Promise<vscode.QuickPickItem[]> | vscode.QuickPickItem[];

/**
 * Any quick pick that is not an selection of an connection.
 */
export class QuickPick extends InputBase<string[]> {
  private allowMultiple: boolean;
  private generateItems: QuickPickItems;

  constructor(allowMultiple: boolean, generateItems: QuickPickItems) {
    super();
    this.allowMultiple = allowMultiple;
    this.generateItems = generateItems;
  }

  async showDialog(currentStep: number, maximumStep: number): Promise<string[] | undefined> {
    const items = await this.generateItems();

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
