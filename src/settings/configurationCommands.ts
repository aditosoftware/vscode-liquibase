import * as vscode from "vscode";
import { addToLiquibaseConfiguration } from "../configuration/handle/createAndAddConfiguration";
import { LiquibaseConfigurationPanel } from "../panels/LiquibaseConfigurationPanel";
import * as path from "path";
import * as fs from "fs";
import { getDefaultDatabaseForConfiguration, getLiquibaseFolder } from "../handleLiquibaseSettings";
import { getPathOfConfiguration, readLiquibaseConfigurationNames } from "../configuration/handle/readConfiguration";
import { InputBox, OpenDialog, handleMultiStepInput, ConfirmationDialog } from "@aditosoftware/vscode-input";
import { readFullValues } from "../configuration/data/readFromProperties";
import { ConnectionType } from "../input/ConnectionType";
import { getCustomDrivers } from "../utilities/customDrivers";
import { PREDEFINED_DRIVERS } from "../configuration/drivers";
import { resourcePath } from "../extension";

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
    const data = readFullValues(
      existingConfiguration.name,
      existingConfiguration.fsPath,
      {
        defaultDatabaseForConfiguration: getDefaultDatabaseForConfiguration(),
        liquibaseDirectoryInProject: getLiquibaseFolder(),
        customDrivers: getCustomDrivers(),
      }
    );
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


/**
 * Displays all available drivers in the resource folder.
 * The user can add, edit or delete custom drivers.
 */
export function displayAvailableDrivers(): void {
  const reload: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon("sync"),
    tooltip: "Reload"
  };

  const quickpick = vscode.window.createQuickPick();
  quickpick.items = getDrivers();
  quickpick.ignoreFocusOut = true;
  quickpick.onDidChangeActive((selectedItems) => {
    //TODO: listen to click or enter, it automatically goes in here, if you hover per keyboard
    selectedItems.forEach((selectedItem) => {
      if (selectedItem.label === "Add New Driver") {
        quickpick.dispose();
        modifyOrAddDriver();
      }
    });
  });
  quickpick.title = "Available Drivers";
  quickpick.buttons = [vscode.QuickInputButtons.Back, reload];
  quickpick.onDidTriggerItemButton((selectedAction) => {
    if (selectedAction.button.tooltip === "delete") {
      quickpick.dispose();
      deleteDriver(selectedAction.item.label);
    }
    else if (selectedAction.button.tooltip === "edit") {
      quickpick.dispose();
      const driverJSON = JSON.parse(getCustomDrivers());
      console.log(driverJSON);
      console.log(selectedAction.item.label);
      console.log(driverJSON[selectedAction.item.label]);
      modifyOrAddDriver(driverJSON[selectedAction.item.label], selectedAction.item.label);
    }
  });
  quickpick.onDidTriggerButton((button) => {
    if (button === reload) {
      quickpick.dispose();
      displayAvailableDrivers();
    }
  });
  quickpick.show();
}

/**
 * Returns a list of all available drivers.
 * 
 * @returns a list of all available drivers
 */
function getDrivers(): vscode.QuickPickItem[] {
  const deleteDriver: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon("trashcan"),
    tooltip: "delete"
  };

  const editDriver: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon("gear"),
    tooltip: "edit"
  };

  const drivers: vscode.QuickPickItem[] = [];

  drivers.push({
    label: "Default Drivers",
    kind: vscode.QuickPickItemKind.Separator
  });

  PREDEFINED_DRIVERS.forEach((value, key) => {
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
      if (fileContent?.includes("driverClass")) {
        const driver = JSON.parse(fileContent);
        drivers.push({
          label: driver.name,
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

/**
 * Deletes a driver from the resource folder.
 * 
 * @param driverName - the name of the driver to delete
 */
function deleteDriver(driverName: string): void {
  const input = [new ConfirmationDialog({
    name: "confirmation",
    message: "Do you really want to delete this driver?",
    detail: () => `This will remove the driver "${driverName}" globally.\n You can NOT restore any of the data.`,
    confirmButtonName: "Delete Driver",
  })];
  handleMultiStepInput(input).then((dialogValues) => {
    if (dialogValues) {
      if (dialogValues.confirmation) {
        fs.rmSync(path.join(resourcePath, driverName + ".jar"));
        fs.rmSync(path.join(resourcePath, driverName + ".json"));
      }
    }
    displayAvailableDrivers(); //re-open the previous view
  }).catch((error) => {
    console.error(error);
  });
}

/**
 * Modifies or adds a driver to the resource folder.
 * 
 * @param oldDriverValues - the old values of the driver
 * @param oldDriverValues - the old values of the driver
 * @param oldDriverName - the old name of the driver
 * 
 * @returns void
 */
function modifyOrAddDriver(oldDriverValues?: { driver: string, port: number, jdbcName: string, seperator: string }, oldDriverName?: string): void {
  const inputs: (InputBox | OpenDialog)[] = [];

  if (!oldDriverName && !oldDriverValues) {
    inputs.push(
      new OpenDialog({
        name: "driverFile",
        openDialogOptions: {
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: {
            "Driver File": ["jar"],
            "All Files": ["*"],
          },
          openLabel: "Select driver file",
          title: "Select the driver file you want to add",
        },
      }),
    );
  }

  inputs.push(
    new InputBox({
      name: "visualName",
      inputBoxOptions: {
        value: oldDriverName ?? "",
        ignoreFocusOut: true,
        validateInput(value) {
          if (value === "") {
            return "Driver name must not be empty";
          }
          return null;
        },
        placeHolder: "Your Driver Name",
        title: "Enter the visual name of the driver",
      },
    }),
    new InputBox({
      name: "jdbcName",
      inputBoxOptions: {
        value: oldDriverValues?.jdbcName ?? "",
        ignoreFocusOut: true,
        validateInput(value) {
          if (value === "") {
            return "JDBC name must not be empty";
          }
          return null;
        },
        placeHolder: "jdbc:yourDriver://",
        title: "Enter the jdbc name of the driver",
      },
    }),
    new InputBox({
      name: "driverClass",
      inputBoxOptions: {
        value: oldDriverValues?.driver ?? "",
        ignoreFocusOut: true,
        validateInput(value) {
          if (value === "") {
            return "Driver class must not be empty";
          }
          return null;
        },
        placeHolder: "org.yourDriver.Driver",
        title: "Enter the driver class of the driver",
      },
    }),
    new InputBox({
      name: "defaultPort",
      inputBoxOptions: {
        value: oldDriverValues?.port?.toString() ?? "",
        ignoreFocusOut: true,
        placeHolder: "1234",
        validateInput: (input) => {
          if (isNaN(Number(input))) {
            return "Port must be a number";
          }
          else if (input === "") {
            return "Port must not be empty";
          }

          return null;
        },
        title: "Enter the default port of the driver",
      },
    }),
    new InputBox({
      name: "separator",
      inputBoxOptions: {
        value: oldDriverValues?.seperator ?? "",
        ignoreFocusOut: true,
        validateInput(value) {
          if (value === "") {
            return "Seperator must not be empty";
          }
          return null;
        },
        placeHolder: "/ or ; or , or : or - or _ or . or | or \\ or any other character",
        title: "Enter the separator of the driver",
      },
    }),
  );

  handleMultiStepInput(inputs).then((dialogValues) => {
    if (dialogValues) {
      const driverFile = dialogValues.inputValues.get("driverFile")?.[0];
      const visualName = dialogValues.inputValues.get("visualName")?.[0];
      const jdbcName = dialogValues.inputValues.get("jdbcName")?.[0];
      const driverClass = dialogValues.inputValues.get("driverClass")?.[0];
      const defaultPort = dialogValues.inputValues.get("defaultPort")?.[0];
      const separator = dialogValues.inputValues.get("separator")?.[0];

      if (visualName && jdbcName && driverClass && defaultPort && separator) {
        // Add or modify the driver based on the presence of oldDriverValues and oldDriverName
        if (oldDriverValues && oldDriverName) {
          updateDriver(oldDriverName, visualName, driverClass, defaultPort, jdbcName, separator);
        } else if (driverFile) {
          const driverFilePath = vscode.Uri.file(driverFile).fsPath;
          copyAndCreateDriver(driverFilePath, visualName, driverClass, defaultPort, jdbcName, separator);
        }
        else {
          console.error("No driver file selected or modified driver values given");
        }
      }
    }
  }).catch((error) => {
    console.error(error);
  });
}

/**
 * Updates the driver and JSON in the resource folder.
 */
function updateDriver(oldDriverName: string, visualName: string, driverClass: string, defaultPort: string, jdbcName: string, separator: string): void {
  fs.renameSync(path.join(resourcePath, oldDriverName + ".jar"), path.join(resourcePath, visualName + ".jar"));
  fs.renameSync(path.join(resourcePath, oldDriverName + ".json"), path.join(resourcePath, visualName + ".json"));
  fs.writeFileSync(path.join(resourcePath, visualName + ".json"), JSON.stringify({
    "name": visualName,
    "driverClass": driverClass,
    "defaultPort": defaultPort ?? "",
    "jdbcName": jdbcName ?? "",
    "seperator": separator ?? "",
  }, null, 2));
}

/**
 * Copies the driver to the resource folder and creates a JSON file for the driver with default values.
 */
function copyAndCreateDriver(driverFilePath: string, visualName: string, driverClass: string, defaultPort: string, jdbcName: string, separator: string): void {
  fs.copyFileSync(driverFilePath, path.join(resourcePath, visualName + ".jar")); // Copy the driver to the resource folder
  fs.writeFileSync(path.join(resourcePath, visualName + ".json"), JSON.stringify({
    "name": visualName,
    "driverClass": driverClass,
    "defaultPort": defaultPort ?? "",
    "jdbcName": jdbcName ?? "",
    "seperator": separator ?? "",
  }, null, 2));
}
