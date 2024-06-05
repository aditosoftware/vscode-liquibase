import * as vscode from "vscode";
import { addToLiquibaseConfiguration } from "../configuration/handle/createAndAddConfiguration";
import { LiquibaseConfigurationPanel } from "../panels/LiquibaseConfigurationPanel";
import * as path from "path";
import { getDefaultDatabaseForConfiguration, getLiquibaseFolder } from "../handleLiquibaseSettings";
import { getPathOfConfiguration, readLiquibaseConfigurationNames } from "../configuration/handle/readConfiguration";
import { InputBox, OpenDialog, handleMultiStepInput } from "@aditosoftware/vscode-input";
import { readFullValues } from "../configuration/data/readFromProperties";
import { ConnectionType } from "../input/ConnectionType";

/**
 * Edits an existing configuration.
 *
 * @param uri - the file that should be edited
 * @param context - the ExtensionContext. This is needed for opening the webview for editing the context
 */
export async function editExistingLiquibaseConfiguration(
  uri: vscode.Uri | undefined,
  context: vscode.ExtensionContext
): Promise<void> {
  let existingConfiguration:
    | {
        fsPath: string;
        name: string;
      }
    | undefined;

  if (uri) {
    // called by context menu - find out name based on the path
    const fsPath = uri.fsPath;
    // file name with extension
    const fileName = path.basename(fsPath);
    // first part of name, if the name has at least 2 dots, otherwise full name
    const name =
      fileName.indexOf(".") !== fileName.lastIndexOf(".") ? fileName.substring(0, fileName.indexOf(".")) : fileName;
    existingConfiguration = { fsPath, name };
  } else {
    // invoked via command palette - show inputs for user
    // let the user select configuration
    const name = await selectFromExistingConfigurations("Select the configuration you want to edit");

    if (name) {
      // finds the path to the name
      const fsPath = await getPathOfConfiguration(name);
      if (fsPath) {
        existingConfiguration = { fsPath, name };
      }
    }
  }

  if (existingConfiguration) {
    // transferring the data from .properties into an object
    const data = readFullValues(existingConfiguration.name, existingConfiguration.fsPath, {
      defaultDatabaseForConfiguration: getDefaultDatabaseForConfiguration(),
      liquibaseDirectoryInProject: getLiquibaseFolder(),
    });
    // and renders the panel with the data
    LiquibaseConfigurationPanel.render(context.extensionUri, data);
  }
}

/**
 * Shows an input that lets the user select any of the configured configurations.
 *
 * @param pTitle - the title of the quick pick dialog
 * @returns the selected configuration
 */
async function selectFromExistingConfigurations(pTitle: string): Promise<string | undefined> {
  const configurationNames: string[] | undefined = await readLiquibaseConfigurationNames();
  if (configurationNames && configurationNames.length !== 0) {
    const result: string | undefined = await vscode.window.showQuickPick(configurationNames, {
      title: pTitle,
      placeHolder: "Pick your desired connection",
    });

    if (result) {
      return result;
    }
  } else {
    await ConnectionType.suggestCreationOfConfiguration();
  }
}

/**
 * Adds an existing liquibase configuration to the settings.
 *
 * The user needs to input the name and select any `.properties` file.
 */
export async function addExistingLiquibaseConfiguration(): Promise<void> {
  const nameKey = "name";
  const locationKey = "location";

  const inputs = [
    new InputBox({
      name: nameKey,
      inputBoxOptions: {
        title: "The unique name for your configuration",
      },
    }),
    new OpenDialog({
      name: locationKey,
      openDialogOptions: {
        title: "Location of your existing liquibase.properties file",
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          "Liquibase Properties": ["properties"],
        },
      },
    }),
  ];

  const dialogValues = await handleMultiStepInput(inputs);

  if (dialogValues) {
    const name = dialogValues.inputValues.get(nameKey)?.[0];
    const location = dialogValues.inputValues.get(locationKey)?.[0];

    if (name && location) {
      await addToLiquibaseConfiguration(name, location);
    }
  }
}
