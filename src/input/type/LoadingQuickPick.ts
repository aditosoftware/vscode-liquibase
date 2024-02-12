import { QuickInputButton, ThemeIcon, window } from "vscode";
import { AfterInputType, BeforeInputType, DialogValues, QuickPick, QuickPickItemFunction } from "..";
import { Logger } from "../../logging/Logger";

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

  /**
   * The tooltip that should be shown when reloading
   */
  private reloadTooltip: string;

  /**
   * The function that is used for reload any data.
   * This can be different from the normal data generate function (`generateItems`)
   */
  private reloadItems: QuickPickItemFunction;

  constructor(
    name: string,
    title: string,
    loadingTitle: string,
    generateItems: QuickPickItemFunction,
    reloadItems: QuickPickItemFunction,
    reloadTooltip: string,
    allowMultiple?: boolean,
    beforeInput?: BeforeInputType,
    afterInput?: AfterInputType
  ) {
    super(name, title, generateItems, allowMultiple, beforeInput, afterInput);
    this.loadingTitle = loadingTitle;
    this.reloadItems = reloadItems;
    this.reloadTooltip = reloadTooltip;
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
    const data = await this.loadItems(this.generateItems, currentResults);

    // Hide loading message
    loadingItem.dispose();

    const reloadButton: QuickInputButton = {
      iconPath: new ThemeIcon("sync"),
      tooltip: this.reloadTooltip,
    };

    // Show quick input with loaded data
    const quickPick = window.createQuickPick();
    quickPick.ignoreFocusOut = true;
    quickPick.title = this.generateTitle(this.title, currentStep, maximumStep, data.additionalTitle);
    quickPick.items = data.items;
    quickPick.canSelectMany = this.allowMultiple ? this.allowMultiple : false;
    quickPick.placeholder = this.generatePlaceholder();
    // add a reload button
    quickPick.buttons = [reloadButton];
    // and add a handler for the reload button
    quickPick.onDidTriggerButton((button) => {
      if (button === reloadButton) {
        Logger.getLogger().info("Reload triggered");
        quickPick.busy = true;
        quickPick.enabled = false;
        quickPick.title = this.generateTitle(this.loadingTitle, currentStep, maximumStep);

        // dummy timeout, because I did not find any other solution how to show the busy indicator to the user
        setTimeout(() => {
          // load the items and then update title and items
          this.loadItems(this.reloadItems, currentResults).then((result) => {
            quickPick.title = this.generateTitle(this.title, currentStep, maximumStep, result.additionalTitle);
            quickPick.items = result.items;
            quickPick.busy = false;
            quickPick.enabled = true;
            Logger.getLogger().info("reload done");
          });
        }, 1);
      }
    });

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
