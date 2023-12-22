import * as vscode from "vscode";
import * as path from "path";
import { loadItemsFromJson } from "./loadItemsFromJson";
import { prerequisites } from "./prerequisites";
import { getReferenceKeysFromPropertyFile } from "./propertiesToDiff";
import {
  InputType,
  getResultValue,
  registerLiquibaseCommand,
} from "./registerLiquibaseCommand";
import { getWorkFolder, readContextValues } from "./readChangelogFile";

/**
 * Main-Function that will execute all the code within
 * @param context - The context object provided by VSCode to the extension.
 *                  It represents the lifecycle of the extension and can be used
 *                  to store and retrieve global state.
 */
export async function activate(context: vscode.ExtensionContext) {
  // Constructing the path to the resources folder within the extension
  const resourcePath = path.join(context.extensionPath, "src", "resources");

  // Paths to JSON files and Liquibase changelog directory
  const jsonFileSystem = path.join(resourcePath, "dropdownSystems.json"); //TODO: read the system in real world use-case (pending on Ramonas impl) and maybe fallback?

  // Load items from JSON files
  const systems: vscode.QuickPickItem[] = loadItemsFromJson(jsonFileSystem);

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
      //TODO: rename disposable
      "Liquibase.update",
      "update",
      [
        {
          panelType: InputType.QuickPick,
          items: systems,
          currentStep: 1,
          resultShouldBeExposed: true,
        }, //systems
        {
          panelType: InputType.QuickPick,
          items: () => readContextValues(getResultValue()),
          currentStep: 2,
          allowMultiple: true,
          cmdArgs: "--contexts",
        }, //context
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
    // this may not work atm!
    let disposable6 = registerLiquibaseCommand(
      "Liquibase.generate-changelog",
      "generate-changelog",
      [
        {
          panelType: InputType.QuickPick,
          items: systems,
          currentStep: 2,
        },
        {
          panelType: InputType.OpenDialog,
          currentStep: 2,
          items: {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
          },
          resultShouldBeExposed: true,
        },
        {
          panelType: InputType.InputBox,
          items: {
            title: "File Name",
            value: "changelog",
          },
          currentStep: 3,
          cmdArgs: "--data-output-directory",
        },
        {
          panelType: InputType.QuickPick,
          items: possibleFormats,
          currentStep: 1,
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
        {
          panelType: InputType.QuickPick,
          items: systems,
          currentStep: 1,
        },
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
      resourcePath
    );

    let disposable8 = registerLiquibaseCommand(
      "Liquibase.unexpected-changesets",
      "unexpected-changesets",
      [
        {
          panelType: InputType.QuickPick,
          items: systems,
          currentStep: 1,
        },
      ],
      context,
      resourcePath,
      ["--verbose"]
    );

    let disposable9 = registerLiquibaseCommand(
      "Liquibase.changelog-sync",
      "changelog-sync",
      [
        {
          panelType: InputType.QuickPick,
          items: systems,
          currentStep: 1,
        },
      ],
      context,
      resourcePath
    );

    let disposable10 = registerLiquibaseCommand(
      "Liquibase.clear-checksums",
      "clear-checksums",
      [
        {
          panelType: InputType.QuickPick,
          items: systems,
          currentStep: 1,
        },
      ],
      context,
      resourcePath
    );

    let disposable11 = registerLiquibaseCommand(
      "Liquibase.history",
      "history",
      [
        {
          panelType: InputType.QuickPick,
          items: systems,
          currentStep: 1,
        },
      ],
      context,
      resourcePath
    );

    let disposable12 = registerLiquibaseCommand(
      "Liquibase.tag",
      "tag",
      [
        {
          panelType: InputType.QuickPick,
          items: systems,
          currentStep: 1,
        },
        {
          panelType: InputType.InputBox,
          items: {
            title: "Tag",
          },
          currentStep: 2,
          cmdArgs: "--tag",
        },
      ],
      context,
      resourcePath
    );

    let disposable13 = registerLiquibaseCommand(
      "Liquibase.tag-exists",
      "tag-exists",
      [
        {
          panelType: InputType.QuickPick,
          items: systems,
          currentStep: 1,
        },
        {
          panelType: InputType.InputBox,
          items: {
            title: "Tag to check if it exists",
          },
          currentStep: 2,
          cmdArgs: "--tag",
        },
      ],
      context,
      resourcePath
    );

    let disposable14 = registerLiquibaseCommand(
      "Liquibase.rollback",
      "rollback",
      [
        {
          panelType: InputType.QuickPick,
          items: systems,
          currentStep: 1,
        },
        {
          panelType: InputType.InputBox,
          items: {
            title: "Tag to rollback to",
          },
          currentStep: 2,
          cmdArgs: "--tag",
        },
      ],
      context,
      resourcePath
    );

    // Add the disposables to subscriptions for cleanup on extension deactivation
    context.subscriptions.push(
      disposable1,
      disposable2,
      disposable3,
      disposable4,
      disposable5,
      disposable6,
      disposable7,
      disposable8,
      disposable9,
      disposable10,
      disposable11,
      disposable12,
      disposable13,
      disposable14
    );
  });
}

/**
 * Shutting down the client. This function is called when the extension is deactivated.
 */
export function deactivate() {
  console.log("Extension deactivated.");
}
