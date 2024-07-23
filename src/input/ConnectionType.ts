import { DialogValues, InputBase, InputBaseOptions } from "@aditosoftware/vscode-input";
import * as vscode from "vscode";
import { readConfiguration } from "../configuration/handle/readConfiguration";

/**
 * Name used for the normal property file.
 */
export const PROPERTY_FILE = "propertyFile";
/**
 * Name used for the reference property file.
 */
export const REFERENCE_PROPERTY_FILE = "referencePropertyFile";

/**
 * Any options for any connection type configuration
 */
interface ConnectionTypeOptions extends InputBaseOptions {
  /**
   * The name of the connection type is restricted due to the nature of limited connection types.
   */
  name: typeof PROPERTY_FILE | typeof REFERENCE_PROPERTY_FILE;
}

/**
 * Input for the connection type.
 */
export class ConnectionType extends InputBase<ConnectionTypeOptions> {
  /**
   * @override
   */
  async showDialog(_currentResults: DialogValues, title: string): Promise<string | undefined> {
    const configurations: vscode.QuickPickItem[] | undefined = await this.generateItems();

    if (configurations && configurations.length !== 0) {
      const selectedConnection: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(configurations, {
        title,
        placeHolder: `Select one ${this.inputOptions.name === REFERENCE_PROPERTY_FILE ? "reference " : ""}system`,
        canPickMany: false,
      });

      if (selectedConnection) {
        return selectedConnection.detail;
      }
    } else {
      // no configuration found, give the user the possibility to create one
      await ConnectionType.suggestCreationOfConfiguration();
    }
  }

  /**
   * Suggests the user that they should create a configuration, when no liquibase configuration was found.
   */
  static async suggestCreationOfConfiguration(): Promise<void> {
    const answer = await vscode.window.showErrorMessage("No configurations found. Please create a configuration.", {
      title: "Create configuration",
    });
    if (answer?.title === "Create configuration") {
      await vscode.commands.executeCommand("liquibase.createLiquibaseConfiguration");
    }
  }

  /**
   * Generates the items for the selection.
   *
   * @returns the items for the selection
   */
  private async generateItems(): Promise<vscode.QuickPickItem[] | undefined> {
    const configuration = await readConfiguration();

    if (configuration) {
      return Object.keys(configuration)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => {
          const path = configuration[key];
          return {
            label: key,
            detail: path,
          };
        });
    }
  }
}
