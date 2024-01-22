import * as vscode from "vscode";
import { addToLiquibaseConfiguration } from "./configuration/crud/createAndAddConfiguration";
import { LiquibaseConfigurationPanel } from "./panels/LiquibaseConfigurationPanel";
import { isWindows } from "./utilities/osUtilities";
import * as path from "path";
import { getDefaultDatabaseForConfiguration, getLiquibaseFolder, updateConfiguration } from "./handleLiquibaseSettings";
import { testLiquibaseConnection } from "./configuration/crud/testConfiguration";
import { getPathOfConfiguration, readLiquibaseConfigurationNames } from "./configuration/crud/readConfiguration";
import * as fs from "fs";
import {
  ConfirmationDialog,
  ConnectionType,
  InputBox,
  OpenDialog,
  PROPERTY_FILE,
  QuickPick,
  handleMultiStepInput,
} from "./input";
import { readFullValues } from "./configuration/data/readFromProperties";

/**
 * Tests an liquibase configuration.
 *
 * The user need to select any existing configuration.
 */
export async function testLiquibaseConfiguration(): Promise<void> {
  const result = await selectFromExistingConfigurations("Select any configuration you want to test");

  if (result) {
    testLiquibaseConnection(result);
  }
}

/**
 * Edits an existing configuration.
 * @param context - the ExtensionContext. This is needed for opening the webview for editing the context
 */
export async function editExistingLiquibaseConfiguration(uri: vscode.Uri, context: vscode.ExtensionContext) {
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
    const data = readFullValues(
      existingConfiguration.name,
      existingConfiguration.fsPath,
      {
        defaultDatabaseForConfiguration: getDefaultDatabaseForConfiguration(),
        liquibaseDirectoryInProject: getLiquibaseFolder(),
      },
      isWindows()
    );
    // and renders the panel with the data
    LiquibaseConfigurationPanel.render(context.extensionUri, data);
  }
}

/**
 * Shows an input that lets the user select any of the configured configurations.
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
    vscode.window.showErrorMessage("No configurations found");
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
    new InputBox(nameKey, {
      title: "The unique name for your configuration",
    }),
    new OpenDialog(
      {
        title: "Location of your existing liquibase.properties file",
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          "Liquibase Properties": ["properties"],
        },
      },
      locationKey
    ),
  ];

  const dialogValues = await handleMultiStepInput(inputs);

  if (dialogValues) {
    let name = dialogValues.inputValues.get(nameKey)?.[0];
    let location = dialogValues.inputValues.get(locationKey)?.[0];

    if (name && location) {
      addToLiquibaseConfiguration(name, location);
    }
  }
}

/**
 * Removes an existing configuration from the configuration file.
 */
export async function removeExistingLiquibaseConfiguration() {
  const setting = "Remove the configuration from the settings";
  const both = `${setting} and delete the corresponding file`;

  const removeType = "removeType";

  const inputs = [
    new ConnectionType("propertyFile"),
    new QuickPick(removeType, "Choose how you wish to remove the connection", false, () => {
      return [
        {
          label: setting,
        },
        {
          label: both,
        },
      ];
    }),
    new ConfirmationDialog((dialogValues) => {
      let deletionMode = dialogValues.inputValues.get(removeType)?.[0];

      return `Are you sure you want to delete your configuration? This will remove it from the following: ${deletionMode}`;
    }),
  ];

  const dialogResult = await handleMultiStepInput(inputs);
  if (dialogResult) {
    const path = dialogResult.inputValues.get(PROPERTY_FILE)?.[0];
    const deletionMode = dialogResult.inputValues.get(removeType);

    if (path && deletionMode) {
      const success = await updateConfiguration(async (pJsonData) => {
        const foundKey = Object.keys(pJsonData).find((pKey) => {
          return pJsonData[pKey] === path;
        });

        if (foundKey) {
          if (deletionMode.indexOf(both) !== -1) {
            fs.rmSync(path);
          }
          delete pJsonData[foundKey];
        }
      });

      if (success) {
        vscode.window.showInformationMessage(`Configuration was successfully removed.`);
      } else {
        vscode.window.showErrorMessage(`Error while removing the configuration.`);
      }
    }
  }
}
