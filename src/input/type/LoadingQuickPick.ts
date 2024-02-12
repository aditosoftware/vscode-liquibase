import { window } from "vscode";
import { AfterInputType, BeforeInputType, DialogValues, QuickPick, QuickPickItemFunction } from "..";

/**
 * A long loading quick pick input. This should be used, if there is any long-loading data is expected.
 *
 * For example, if your loading takes 20 seconds, you should use this input over QuickPick, because this will notify the user about the loading process.
 * If you don't have any data that needs loading or your data is expected to have a very short loading time, then you should use QuickPick
 */
export class LoadingQuickPick extends QuickPick {
  /**
   * The title that should be shown during the loading.
   */
  private loadingTitle: string;

  constructor(
    name: string,
    title: string,
    loadingTitle: string,
    generateItems: QuickPickItemFunction,
    allowMultiple?: boolean,
    beforeInput?: BeforeInputType,
    afterInput?: AfterInputType
  ) {
    super(name, title, generateItems, allowMultiple, beforeInput, afterInput);
    this.loadingTitle = loadingTitle;
  }

  async showDialog(
    currentResults: DialogValues,
    currentStep: number,
    maximumStep: number
  ): Promise<string[] | undefined> {
    // Show loading message
    const loadingItem = window.createQuickPick();
    loadingItem.title = this.generateTitle(this.loadingTitle, currentStep, maximumStep);
    loadingItem.placeholder = "Please wait, loading is in progress. This might take a while.";
    loadingItem.ignoreFocusOut = true;
    loadingItem.busy = true;
    loadingItem.enabled = false;
    loadingItem.items = [{ label: "$(loading~spin) Loading..." }];
    loadingItem.show();

    // Generate the data for the read input
    const data = await this.generateItems(currentResults);

    // Hide loading message
    loadingItem.dispose();

    // Show quick input with loaded data
    const quickPick = window.createQuickPick();
    quickPick.title = this.generateTitle(this.title, currentStep, maximumStep);
    quickPick.items = data;
    quickPick.canSelectMany = this.allowMultiple ? this.allowMultiple : false;
    quickPick.placeholder = this.generatePlaceholder();
    quickPick.show();

    // Wait for user input or cancellation
    const selected = await new Promise<string[] | undefined>((resolve) => {
      quickPick.onDidAccept(() => {
        resolve(quickPick.selectedItems.map((pSelected) => pSelected.label));
        quickPick.dispose();
      });
      quickPick.onDidHide(() => {
        resolve(undefined);
        quickPick.dispose();
      });
    });

    return selected;
  }
}
