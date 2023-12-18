import * as vscode from "vscode";
import * as path from "path";
import { executeJar } from "./executeJar";
import { loadItemsFromJson } from "./loadItemsFromJson";
import { showQuickPickItemPanel } from "./QuickPickItemHelper";
import { prerequisites } from "./prerequisites";
import { getReferenceKeysFromPropertyFile } from "./propertiesToDiff";

enum InputType {
  InputBox,
  OpenDialog,
  QuickPick,
  SaveDialog,
  TextDocument,
  WorkspaceFolderPick,
}
interface PickPanelConfig {
  panelType: InputType;
  currentStep: number;
  items: any;
  allowMultiple?: boolean;
  cmdArgs?: string;
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
  const contexts: vscode.QuickPickItem[] = loadItemsFromJson(jsonFileItems);
  const possibleFormats: vscode.QuickPickItem[] = [
    { label: "XML", description: "xml" },
    { label: "JSON", description: "json" },
    { label: "YAML", description: "yaml" },
    { label: "YML", description: "yml" },
  ];
  //const file: vscode.QuickInput[] =

  // Perform any necessary prerequisites setup before executing the extension logic
  prerequisites(context, resourcePath).then(() => {
    // Command that will be executed when the extension command is triggered
    let disposable1 = registerLiquibaseCommand(
      "Liquibase.update",
      "update",
      [
        {
          panelType: InputType.QuickPick,
          items: contexts,
          currentStep: 1,
          allowMultiple: true,
        }, //context
        { panelType: InputType.QuickPick, items: systems, currentStep: 2 }, //systems
      ],
      context,
      resourcePath
    );

    let disposable2 = registerLiquibaseCommand(
      "Liquibase.drop-all",
      "drop-all",
      [{ panelType: InputType.QuickPick, items: systems, currentStep: 1 }],
      context,
      resourcePath
    );

    let disposable3 = registerLiquibaseCommand(
      "Liquibase.validate",
      "validate",
      [{ panelType: InputType.QuickPick, items: systems, currentStep: 1 }],
      context,
      resourcePath
    );

    let disposable4 = registerLiquibaseCommand(
      "Liquibase.status",
      "status",
      [{ panelType: InputType.QuickPick, items: systems, currentStep: 1 }],
      context,
      resourcePath
    );

    let disposable5 = registerLiquibaseCommand(
      "Liquibase.diff",
      "diff",
      [
        { panelType: InputType.QuickPick, items: systems, currentStep: 1 },
        { panelType: InputType.QuickPick, items: systems, currentStep: 2 },
      ],
      context,
      resourcePath,
      getReferenceKeysFromPropertyFile(
        path.join(resourcePath, ".liquibase", "liquibase2.properties")
      )
    );

    //TODO: Generate-Changelog -> more steps and user-input
    let disposable6 = registerLiquibaseCommand(
      "Liquibase.generate-changelog",
      "generate-changelog",
      [
        {
          panelType: InputType.QuickPick,
          items: possibleFormats,
          currentStep: 1,
        },
        { panelType: InputType.QuickPick, items: systems, currentStep: 2 },
        {
          panelType: InputType.InputBox,
          items: {
            title: "generate changelog",
            value: "changelog",
          },
          currentStep: 3,
          cmdArgs: "--data-output-directory"
        },
      ],
      context,
      resourcePath,
      []
    );

    let disposable7 = registerLiquibaseCommand(
      "Liquibase.db-doc",
      "db-doc",
      [
        { panelType: InputType.QuickPick, items: systems, currentStep: 1 },
        {
          panelType: InputType.OpenDialog,
          currentStep: 2,
          items: {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
          },
          cmdArgs: "--output-directory",
        },
      ],
      context,
      resourcePath,
      []
    );

    // Add the disposables to subscriptions for cleanup on extension deactivation
    context.subscriptions.push(
      disposable1,
      disposable2,
      disposable3,
      disposable4,
      disposable5,
      disposable6,
      disposable7
    );
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
        let result = await getInputByType(config, pickPanelConfigs.length);

        if (!result) {
          // User canceled the selection
          vscode.window.showInformationMessage("Command was cancelled");
          return;
        }

        // Handle the selected result as needed
        console.log(result);
        if (config.cmdArgs) {
          args?.push(config.cmdArgs + "=" + result);
        }
      }

      // Execute Liquibase update with the final selections
      executeJar(resourcePath, action, args)
        .then(() =>
          vscode.window.showInformationMessage(
            `Liquibase ${action} was successful`
          )
        )
        .catch((error) => console.error("Error:", error.message));
    } catch (error) {
      console.error("Error:");
      // Handle errors as needed
    }
  });
}

async function getInputByType(config: PickPanelConfig, maximumSteps: number) {
  switch (config.panelType) {
    case InputType.QuickPick:
      return await showQuickPickItemPanel(
        config.items,
        config.currentStep,
        maximumSteps,
        config.allowMultiple
      );
    case InputType.OpenDialog:
      config.items.openLabel = `Select Directory - (Step ${config.currentStep} of ${maximumSteps})`;
      return await vscode.window.showOpenDialog(config.items).then((uri) => {
        if (uri && uri[0]) {
          return uri[0].fsPath;
        }
      });
    case InputType.InputBox:
      config.items.placeHolder = `Choose a name - (Step ${config.currentStep} of ${maximumSteps})`;
      return await vscode.window.showInputBox(config.items).then((name) => {
        return name;
      });
    case InputType.SaveDialog:
      //
      break;
    case InputType.TextDocument:
      //
      break;
    case InputType.WorkspaceFolderPick:
      //
      break;
    default:
      console.log("you fucked up");
      return;
  }
}

/**
 * Shutting down the client. This function is called when the extension is deactivated.
 */
export function deactivate() {
  console.log("Extension deactivated.");
}
