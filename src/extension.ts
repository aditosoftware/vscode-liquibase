import * as vscode from "vscode";
import * as path from "path";
import { executeJar } from "./executeJar";
import { loadItemsFromJson } from "./loadItemsFromJson";
import { showQuickPickItemPanel } from "./QuickPickItemHelper";
import { prerequisites } from "./prerequisites";
import { getReferenceKeysFromPropertyFile } from "./propertiesToDiff";

interface PickPanelConfig {
  items: vscode.QuickPickItem[];
  placeholder: string;
  maximumSteps: number;
  allowMultiple?: boolean;
}

/**
 * Main-Function that will execute all the code within
 * @param context - The context object provided by VSCode to the extension.
 *                  It represents the lifecycle of the extension and can be used
 *                  to store and retrieve global state.
 */
export function activate(context: vscode.ExtensionContext) {
  // Constructing the path to the resources folder within the extension
  const resourcePath = path.join(context.extensionPath, "src", "resources");

  // Paths to JSON files and Liquibase changelog directory
  const jsonFileSystem = path.join(resourcePath, "dropdownSystems.json"); //TODO: read the fucking system
  const jsonFileItems = path.join(resourcePath, "dropdownItems.json"); //TODO: delete after demo
  const changelogPath = path.join(resourcePath, ".liquibase", "Data"); //TODO: read the fucking context

  // Load items from JSON files
  const systems: vscode.QuickPickItem[] = loadItemsFromJson(jsonFileSystem);
  const items: vscode.QuickPickItem[] = loadItemsFromJson(jsonFileItems);

  // Perform any necessary prerequisites setup before executing the extension logic
  prerequisites(context, resourcePath).then(() => {
    // Command that will be executed when the extension command is triggered
    let disposable1 = registerLiquibaseCommand(
      "Liquibase.update",
      "update",
      [{ items, placeholder: "1", allowMultiple: true, maximumSteps: 2 }, { items: systems, placeholder: "2", maximumSteps: 2 }],
      context,
      resourcePath
    );

    let disposable2 = registerLiquibaseCommand(
      "Liquibase.drop-all",
      "drop-all",
      [{ items: systems, placeholder: "1", maximumSteps: 1 }],
      context,
      resourcePath
    );

    let disposable3 = registerLiquibaseCommand(
      "Liquibase.validate",
      "validate",
      [{ items: systems, placeholder: "1", maximumSteps: 1 }],
      context,
      resourcePath
    );

    let disposable4 = registerLiquibaseCommand(
      "Liquibase.status",
      "status",
      [{ items: systems, placeholder: "2", maximumSteps: 2 }],
      context,
      resourcePath
    );

    let disposable5 = registerLiquibaseCommand(
      "Liquibase.diff",
      "diff",
      [{ items: systems, placeholder: "1", maximumSteps: 2 }, { items: systems, placeholder: "2", maximumSteps: 2 }],
      context,
      resourcePath,
      getReferenceKeysFromPropertyFile(path.join(resourcePath, ".liquibase", "liquibase2.properties"))
    );

    // Add the disposables to subscriptions for cleanup on extension deactivation
    context.subscriptions.push(disposable1, disposable2, disposable3, disposable4);
  });
}

function registerLiquibaseCommand(
  commandId: string,
  action: string,
  pickPanelConfigs: PickPanelConfig[],
  context: vscode.ExtensionContext,
  resourcePath: string,
  args?: string[]
) {
  return vscode.commands.registerCommand(commandId, async () => {
    try {
      // Use for...of to iterate over async functions sequentially
      for (const config of pickPanelConfigs) {
        const result = await showQuickPickItemPanel(
          config.items,
          config.placeholder,
          config.maximumSteps,
          config.allowMultiple
        );

        if (!result) {
          // User canceled the selection
          vscode.window.showInformationMessage("No system selected.");
          return;
        }

        // Handle the selected result as needed
        console.log(result);
      }

      // Execute Liquibase update with the final selections
      executeJar(resourcePath, action, args)
        .then(() =>
          vscode.window.showInformationMessage(`Liquibase ${action} was successful`)
        )
        .catch((error) => console.error("Error:", error.message));
    } catch (error) {
      console.error("Error:");
      // Handle errors as needed
    }
  });
}

/**
 * Shutting down the client. This function is called when the extension is deactivated.
 */
export function deactivate() {
  console.log("Extension deactivated.");
}
