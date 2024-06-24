import * as vscode from "vscode";
import { addToLiquibaseConfiguration } from "../configuration/handle/createAndAddConfiguration";
import { LiquibaseConfigurationPanel } from "../panels/LiquibaseConfigurationPanel";
import * as path from "path";
import * as fs from "fs";
import { getDefaultDatabaseForConfiguration, getLiquibaseFolder } from "../handleLiquibaseSettings";
import { getPathOfConfiguration, readLiquibaseConfigurationNames } from "../configuration/handle/readConfiguration";
import {
  InputBox,
  OpenDialog,
  handleMultiStepInput,
  ConfirmationDialog,
  InputBase,
  InputBaseOptions,
} from "@aditosoftware/vscode-input";
import { readFullValues } from "../configuration/data/readFromProperties";
import { ConnectionType } from "../input/ConnectionType";
import { CustomDriverData } from "../utilities/customDriver";
import { PREDEFINED_DRIVERS } from "@aditosoftware/driver-dependencies";
import { resourcePath } from "../extension";
import { Logger } from "@aditosoftware/vscode-logging";
import { getCustomDrivers } from "../utilities/customDriverUtilities";

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
      customDrivers: getCustomDrivers(),
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

/**
 * Displays all available drivers in the resource folder.
 * The user can add, edit or delete custom drivers.
 */
export function displayAvailableDrivers(): void {
  const reload: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon("sync"),
    tooltip: "Reload",
  };

  const quickpick = vscode.window.createQuickPick();
  quickpick.items = getDrivers();
  quickpick.ignoreFocusOut = false;
  quickpick.onDidAccept(() => {
    quickpick.selectedItems.forEach((selectedItem) => {
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
    } else if (selectedAction.button.tooltip === "edit") {
      quickpick.dispose();
      const driverJSON = getCustomDrivers();
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
export function getDrivers(): vscode.QuickPickItem[] {
  const deleteDriver: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon("trashcan"),
    tooltip: "delete",
  };

  const editDriver: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon("gear"),
    tooltip: "edit",
  };

  const drivers: vscode.QuickPickItem[] = [];

  drivers.push({
    label: "Default Drivers",
    kind: vscode.QuickPickItemKind.Separator,
  });

  PREDEFINED_DRIVERS.forEach((value, key) => {
    drivers.push({
      label: key,
      description: value.jdbcName,
      detail: value.driverClass,
      buttons: [],
    });
  });

  getCustomDriversForView(drivers, [editDriver, deleteDriver]);

  drivers.push({
    label: "New Driver",
    kind: vscode.QuickPickItemKind.Separator,
  });

  drivers.push({
    iconPath: new vscode.ThemeIcon("add"),
    label: "Add New Driver",
  });

  return drivers;
}

/**
 * Returns a list of all custom drivers.
 *
 * @param drivers - the list of drivers
 * @param actions - the actions that can be performed on the drivers
 */
export function getCustomDriversForView(drivers: vscode.QuickPickItem[], actions: vscode.QuickInputButton[]): void {
  drivers.push({
    label: "Custom Drivers",
    kind: vscode.QuickPickItemKind.Separator,
  });

  fs.readdirSync(resourcePath).forEach((file) => {
    if (path.extname(file) === ".json") {
      const fileContent = fs.readFileSync(path.join(resourcePath, file), "utf8");
      if (fileContent?.includes("driverClass")) {
        const driver = JSON.parse(fileContent);
        drivers.push({
          label: driver.name,
          detail: driver.driverClass,
          buttons: actions,
        });
      }
    }
  });
}

/**
 * Deletes a driver from the resource folder.
 *
 * @param driverName - the name of the driver to delete
 */
export function deleteDriver(driverName: string): void {
  const input = [
    new ConfirmationDialog({
      name: "confirmation",
      message: "Do you really want to delete this driver?",
      detail: () => `This will remove the driver "${driverName}" globally.\n You can NOT restore any of the data.`,
      confirmButtonName: "Delete Driver",
    }),
  ];
  handleMultiStepInput(input)
    .then((dialogValues) => {
      if (dialogValues && dialogValues.inputValues.get("confirmation")?.[0] === "true") {
        removeDriverFiles(driverName);
      }
      displayAvailableDrivers(); //re-open the previous view
    })
    .catch((error) => {
      Logger.getLogger().error({ message: "Error while removing the driver", error, notifyUser: true });
    });
}

/**
 * Modifies or adds a driver to the resource folder.
 *
 * @param oldDriverValues - the old values of the driver
 * @param oldDriverName - the old name of the driver
 */
export const modifyOrAddDriver = (oldDriverValues?: CustomDriverData, oldDriverName?: string): void => {
  const inputs: InputBase<InputBaseOptions>[] = [];

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
          },
          title: "Select the driver file you want to add",
        },
      })
    );
  }

  inputs.push(
    new InputBox({
      name: "visualName",
      inputBoxOptions: {
        value: oldDriverName,
        ignoreFocusOut: true,
        validateInput(value) {
          return validateInputBoxTextValue(value, "Driver name must not be empty");
        },
        placeHolder: "Your Driver Name",
        title: "Enter the visual name of the driver",
      },
    }),
    new InputBox({
      name: "jdbcName",
      inputBoxOptions: {
        value: oldDriverValues?.jdbcName,
        ignoreFocusOut: true,
        validateInput(value) {
          return validateInputBoxTextValue(value, "JDBC name must not be empty");
        },
        placeHolder: "jdbc:yourDriver://",
        title: "Enter the jdbc name of the driver",
      },
    }),
    new InputBox({
      name: "driverClass",
      inputBoxOptions: {
        value: oldDriverValues?.driverClass,
        ignoreFocusOut: true,
        validateInput(value) {
          return validateInputBoxTextValue(value, "Driver class must not be empty");
        },
        placeHolder: "org.yourDriver.Driver",
        title: "Enter the driver class of the driver",
      },
    }),
    new InputBox({
      name: "defaultPort",
      inputBoxOptions: {
        value: oldDriverValues?.port?.toString(),
        ignoreFocusOut: true,
        placeHolder: "3306",
        validateInput: (input) => {
          return validateInputBoxPortValue(input);
        },
        title: "Enter the default port of the driver",
      },
    }),
    new InputBox({
      name: "separator",
      inputBoxOptions: {
        value: oldDriverValues?.separator,
        ignoreFocusOut: true,
        validateInput(value) {
          return validateInputBoxTextValue(value, "Separator must not be empty");
        },
        placeHolder: "/ or ; or , or : or - or _ or . or | or \\ or any other character",
        title: "Enter the separator of the driver",
      },
    })
  );

  handleDriverInput(inputs, oldDriverValues, oldDriverName);
};

/**
 * Handles the input for the driver.
 *
 * @param inputs - the input fields for the driver
 * @param oldDriverValues - the old values of the driver
 * @param oldDriverName - the old name of the driver
 */
export const handleDriverInput = (
  inputs: InputBase<InputBaseOptions>[],
  oldDriverValues?: CustomDriverData,
  oldDriverName?: string
): void => {
  handleMultiStepInput(inputs)
    .then((dialogValues) => {
      if (dialogValues) {
        const driverFile = dialogValues.inputValues.get("driverFile")?.[0];
        const visualName = dialogValues.inputValues.get("visualName")?.[0];
        const jdbcName = dialogValues.inputValues.get("jdbcName")?.[0];
        const driverClass = dialogValues.inputValues.get("driverClass")?.[0];
        const defaultPort = dialogValues.inputValues.get("defaultPort")?.[0];
        const separator = dialogValues.inputValues.get("separator")?.[0];

        if (visualName && jdbcName && driverClass && defaultPort && separator) {
          // Create the custom driver object with the given values
          const driver: CustomDriverData = {
            driverClass: driverClass,
            port: parseInt(defaultPort),
            jdbcName: jdbcName,
            separator: separator,
          };

          // Add or modify the driver based on the presence of oldDriverValues and oldDriverName
          if (oldDriverValues && oldDriverName) {
            updateDriver(oldDriverName, visualName, driver);
          } else if (driverFile) {
            const driverFilePath = vscode.Uri.file(driverFile).fsPath;
            copyAndCreateDriver(driverFilePath, visualName, driver);
          } else {
            Logger.getLogger().warn({
              message: "No driver file was selected or previous driver values were found.",
              notifyUser: true,
            });
          }
        }
      }
    })
    .catch((error) => {
      Logger.getLogger().error({
        message: "An error occurred while entering the driver information. Please check the log for more information.",
        notifyUser: true,
        error: error,
      });
    });
};

/**
 * Updates the driver and JSON in the resource folder.
 *
 * @param oldDriverName - the old name of the driver
 * @param driverName - the new name of the driver
 * @param driver - the custom driver object
 */
export function updateDriver(oldDriverName: string, driverName: string, driver: CustomDriverData): void {
  fs.renameSync(path.join(resourcePath, oldDriverName + ".jar"), path.join(resourcePath, driverName + ".jar"));
  fs.renameSync(path.join(resourcePath, oldDriverName + ".json"), path.join(resourcePath, driverName + ".json"));
  writeConfigToJSON(driverName, driver);
}

/**
 * Copies the driver to the resource folder and creates a JSON file for the driver with default values.
 *
 * @param driverFilePath - the path to the driver file
 * @param driverName - the name of the driver
 * @param driver - the custom driver object
 */
export function copyAndCreateDriver(driverFilePath: string, driverName: string, driver: CustomDriverData): void {
  fs.copyFileSync(driverFilePath, path.join(resourcePath, driverName + ".jar")); // Copy the driver to the resource folder
  writeConfigToJSON(driverName, driver);
}

/**
 * Writes the driver values to a JSON file.
 *
 * @param driverName - the name of the driver
 * @param driver - the custom driver object
 */
export function writeConfigToJSON(driverName: string, driver: CustomDriverData): void {
  fs.writeFileSync(
    path.join(resourcePath, driverName + ".json"),
    JSON.stringify(
      {
        name: driverName,
        driverClass: driver.driverClass,
        defaultPort: driver.port,
        jdbcName: driver.jdbcName,
        separator: driver.separator,
      },
      null,
      2
    )
  );
}

/**
 * Validates the input box value.
 *
 * @param value - the value that should be checked
 * @param errorMessage - the error message that should be displayed when the value is empty
 * @returns the error message if the value is empty, otherwise null
 */
export function validateInputBoxTextValue(
  value: string,
  errorMessage?: string
): vscode.InputBoxValidationMessage | null {
  if (value.trim() === "") {
    return {
      message: errorMessage ?? "Value must not be empty",
      severity: vscode.InputBoxValidationSeverity.Error,
    } as vscode.InputBoxValidationMessage;
  }
  return null;
}

/**
 * Validates the input box value for numbers.
 *
 * @param value - the value that should be checked
 * @returns the error message if the port is not inside the port range or not a number, otherwise null
 */
export function validateInputBoxPortValue(value: string): vscode.InputBoxValidationMessage | null {
  const port = value.trim();
  if (port === "") {
    return {
      message: "Port must not be empty",
      severity: vscode.InputBoxValidationSeverity.Error,
    } as vscode.InputBoxValidationMessage;
  } else if (!/^\d*$/.test(port)) {
    return {
      message: "Port must be a number",
      severity: vscode.InputBoxValidationSeverity.Error,
    } as vscode.InputBoxValidationMessage;
  } else if (parseInt(port) < 0 || parseInt(port) > 65535) {
    return {
      message: "Port must be between 0 and 65535",
      severity: vscode.InputBoxValidationSeverity.Error,
    } as vscode.InputBoxValidationMessage;
  } else {
    return null;
  }
}

/**
 * Removes the driver files from the resource folder.
 *
 * @param driverName - the name of the driver
 */
export function removeDriverFiles(driverName: string): void {
  fs.rmSync(path.join(resourcePath, driverName + ".jar"));
  fs.rmSync(path.join(resourcePath, driverName + ".json"));
}
