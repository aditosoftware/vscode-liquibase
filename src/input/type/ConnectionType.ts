import { DialogValues, InputBase } from "..";
import * as vscode from "vscode";
import { readConfiguration } from "../../handleLiquibaseSettings";

/**
 * Name used for the normal property file.
 */
export const PROPERTY_FILE = "propertyFile";
/**
 * Name used for the reference property file.
 */
export const REFERENCE_PROPERTY_FILE = "referencePropertyFile";

/**
 * Input for the connection type.
 */
export class ConnectionType extends InputBase {
  constructor(name: typeof PROPERTY_FILE | typeof REFERENCE_PROPERTY_FILE) {
    super(name);
  }

  async showDialog(
    _currentResults: DialogValues,
    currentStep: number,
    maximumStep: number
  ): Promise<string | undefined> {
    const configurations: vscode.QuickPickItem[] | undefined = await this.generateItems();

    // TODO detail good in dialog?

    if (configurations && configurations.length !== 0) {
      const selectedConnection: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(configurations, {
        title: `Select the system ${this.generateStepOutput(currentStep, maximumStep)}`,
        placeHolder: "Pick your desired system",
        canPickMany: false,
      });

      if (selectedConnection) {
        return selectedConnection.detail;
      }
    } else {
      vscode.window.showErrorMessage("No configurations found");
    }
  }

  /**
   * Generates the items for the selection.
   * @returns the items for the selection
   */
  private async generateItems(): Promise<vscode.QuickPickItem[] | undefined> {
    const configuration = await readConfiguration();

    if (configuration) {
      return Object.keys(configuration).map((key) => {
        const path = configuration[key];
        return {
          label: key,
          detail: path,
        };
      });
    }
  }
}