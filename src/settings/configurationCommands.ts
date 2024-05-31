import * as vscode from "vscode";
import { addToLiquibaseConfiguration } from "../configuration/handle/createAndAddConfiguration";
import { LiquibaseConfigurationPanel } from "../panels/LiquibaseConfigurationPanel";
import * as path from "path";
import * as fs from "fs";
import { getDefaultDatabaseForConfiguration, getLiquibaseFolder } from "../handleLiquibaseSettings";
import { getPathOfConfiguration, readLiquibaseConfigurationNames } from "../configuration/handle/readConfiguration";
import { ConfirmationDialog, DialogValues, InputBox, OpenDialog, handleMultiStepInput } from "@aditosoftware/vscode-input";
import { readFullValues } from "../configuration/data/readFromProperties";
import { ConnectionType } from "../input/ConnectionType";
import { ALL_DRIVERS } from "../configuration/drivers";
import { resourcePath } from "../extension";

/**
 * Edits an existing configuration.
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
    const data = readFullValues(
      existingConfiguration.name,
      existingConfiguration.fsPath,
      {
        defaultDatabaseForConfiguration: getDefaultDatabaseForConfiguration(),
        liquibaseDirectoryInProject: getLiquibaseFolder(),
      }
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


/**
 * Add, Modify and Delete shit.
 */
export function displayAvailableDrivers(): void {
  const help: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon("question"),
    tooltip: "help"
  };

  const quickpick = vscode.window.createQuickPick();
  quickpick.items = getDrivers();
  quickpick.ignoreFocusOut = true;
  quickpick.onDidChangeActive((selectedItems) => {
    selectedItems.forEach((selectedItem) => {
      if (selectedItem.label === "Add New Driver") {
        quickpick.dispose();
        addNewDriver();
      }
    });
  });
  quickpick.title = "Available Drivers",
  quickpick.buttons = [vscode.QuickInputButtons.Back, help];
  quickpick.onDidTriggerItemButton((selectedAction) => {
    if (selectedAction.button.tooltip === "delete") {
      quickpick.dispose();
      const fileContent = fs.readFileSync(path.join(resourcePath, selectedAction.item.label)).toString();
      deleteDriver(selectedAction.item.label);
    }
  });
  quickpick.show();
}

function getDrivers(): vscode.QuickPickItem[] {
  const deleteDriver: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon("trashcan"),
    tooltip: "delete"
  };

  const editDriver: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon("gear~spin"),
    tooltip: "edit"
  };

  const drivers: vscode.QuickPickItem[] = [];

  drivers.push({
    label: "Default Drivers",
    kind: vscode.QuickPickItemKind.Separator
  });

  ALL_DRIVERS.forEach((value, key) => {
    drivers.push({
      label: key,
      description: value.jdbcName,
      detail: value.driverClass,
      buttons: [],
    });
  });

  drivers.push({
    label: "Custom Drivers",
    kind: vscode.QuickPickItemKind.Separator
  });

  fs.readdirSync(resourcePath).forEach(file => {
    if (path.extname(file) === '.json') {
      const fileContent = fs.readFileSync(path.join(resourcePath, file)).toString();
      if (fileContent !== null && fileContent.includes("driverClass")) {
        const driver = JSON.parse(fileContent);
        drivers.push({
          label: driver.name,
          description: driver.jdbcUrl,
          detail: driver.driverClass,
          buttons: [editDriver, deleteDriver]
        });
      }
    }
  });

  drivers.push({
    label: "New Driver",
    kind: vscode.QuickPickItemKind.Separator
  });

  drivers.push({
    iconPath: new vscode.ThemeIcon("add"),
    label: "Add New Driver"
  });

  return drivers;
}

function addNewDriver(): void {
  const inputs = [
    new OpenDialog({
      name: "driverFile",
      openDialogOptions: {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          "Driver Files": ["jar"],
          "All Files": ["*"],
        },
        openLabel: "Select driver file",
        title: "Select the driver file you want to add",
      },
    }),
    new InputBox({
      name: "visualName",
      inputBoxOptions: {
        ignoreFocusOut: true,
        placeHolder: "Your Driver Name",
        title: "Enter the visual name of the new driver",
      },
    }),
    new InputBox({
      name: "jdbcUrl",
      inputBoxOptions: {
        ignoreFocusOut: true,
        placeHolder: "jdbc:yourDatabase://",
        title: "Enter the JDBC URL of the new driver",
      },
    }),
    new InputBox({
      name: "driverClass",
      inputBoxOptions: {
        ignoreFocusOut: true,
        placeHolder: "org.yourDriver.Driver",
        title: "Enter the driver class of the new driver",
      },
    }),
  ];

  handleMultiStepInput(inputs).then((dialogValues) => {
    if (dialogValues) {
      const driverFile = dialogValues.inputValues.get("driverFile")?.[0];
      const jdbcUrl = dialogValues.inputValues.get("jdbcUrl")?.[0];
      const driverClass = dialogValues.inputValues.get("driverClass")?.[0];
      const visualName = dialogValues.inputValues.get("visualName")?.[0];

      if (driverFile && jdbcUrl && driverClass) {
        const driverFilePath = vscode.Uri.file(driverFile).fsPath;
        const driverName = path.basename(driverFilePath);
        const driverDestination = path.join(resourcePath, driverName);
        fs.copyFileSync(driverFilePath, driverDestination); // Copy the driver to the resource folder
        fs.writeFileSync(path.join(resourcePath, driverName.replace(".jar", ".json")), JSON.stringify({
          "name": visualName,
          "physicalName": driverName.replace(".jar", ""),
          "jdbcUrl": jdbcUrl,
          "driverClass": driverClass
        }, null, 2));
      }
    }
  }).catch((error) => {
    console.error(error);
  });
}
function deleteDriver(driverName: string): void {
  const input = new ConfirmationDialog({
    name: "confirmation",
    message: `Do you really want to delete ${driverName}?`,
    detail: (dialogValues: DialogValues) => {
      const propertyFile = dialogValues.inputValues.get(PROPERTY_FILE)?.[0];

      let detail: string = "";
      if (propertyFile) {
        const url = readUrl(propertyFile);
        if (url) {
          detail = ` ${url}`;
        }
      }

      return `This will remove all the data from your database${detail}.\n You can NOT restore any of the data.`;
    },
    confirmButtonName: "Drop-all",
  });

  handleMultiStepInput([input]).then((dialogValues) => {
    if (dialogValues && dialogValues.confirmation) {
      // Drop all
      const propertyFile = dialogValues.inputValues.get(PROPERTY_FILE)?.[0];
      if (propertyFile) {
        const url = readUrl(propertyFile);
        if (url) {
          dropAll(url);
        }
      }
    }
  }
  
  fs.rmSync(path.join(resourcePath, driverName + ".jar"));
  fs.rmSync(path.join(resourcePath, driverName + ".json"));
}