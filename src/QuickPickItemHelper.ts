import * as vscode from "vscode";

/**
 * Opens a QuickPickItem-Dialog with customizable selection type.
 * @param items - Items for the Dropdown-QuickPickItem-Dialog.
 * @param step - The step number in the process (e.g., step 1 of 2).
 * @param allowMultiple - Specify whether multiple selections are allowed.
 * @returns A Thenable representing the selected item or items, or undefined if canceled.
 * @example This function can be used to select items or systems with customizable selection type.
 */
export function showQuickPickItemPanel(
  items: vscode.QuickPickItem[],
  step: string,
  maximumSteps: number,
  allowMultiple: boolean = false
): Thenable<vscode.QuickPickItem[] | vscode.QuickPickItem | undefined> {
  const options: vscode.QuickPickOptions = {
    placeHolder: `Select one item${allowMultiple ? ' or more items' : ''} - (Step ${step} of ${maximumSteps})`,
    canPickMany: allowMultiple,
  };

  return vscode.window.showQuickPick(items, options);
}