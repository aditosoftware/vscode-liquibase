import * as vscode from "vscode";
import * as fs from "node:fs";
import path from "node:path";
import { NO_PRE_CONFIGURED_DRIVER } from "@aditosoftware/driver-dependencies";
import { Logger } from "@aditosoftware/vscode-logging";

/**
 * The general configuration name.
 */
const configurationName: string = "liquibase";

/**
 * Reads the settings and loads the configuration path where the liquibase specific settings should be stored
 *
 * @returns the configuration path where the liquibase specific settings should be stored. This is an absolute path.
 */
export async function getLiquibaseConfigurationPath(): Promise<string | undefined> {
  const configuration = vscode.workspace.getConfiguration(configurationName);

  const configurationPathSetting = "configurationPath";

  // get default value from setting, so it is not duplicated
  const defaultValue: unknown = configuration.inspect(configurationPathSetting)?.defaultValue;
  if (typeof defaultValue !== "string") {
    Logger.getLogger().warn({ message: `default value ${defaultValue} was not an string. This should never happen` });
    return;
  }

  let configurationPath: string = configuration.get(configurationPathSetting, defaultValue);

  // double check the configuration path, because it can also be empty string
  if (!configurationPath) {
    // if this is the case, simple use the default value.
    configurationPath = defaultValue;
  }

  if (vscode.workspace.workspaceFolders) {
    const workspaceFolder = vscode.workspace.workspaceFolders[0];

    const absolutePath = path.join(workspaceFolder.uri.fsPath, configurationPath);

    if (!fs.existsSync(absolutePath)) {
      const uriFile = vscode.Uri.file(absolutePath);
      // create the missing directories
      await vscode.workspace.fs.createDirectory(uriFile);
    }

    return absolutePath;
  }
}

/**
 * Returns the user setting where the liquibase folder is located inside the workspace.
 *
 * @returns the liquibase folder in the workspace or the workspace folder
 */
export function getLiquibaseFolder(): string {
  const configuration = vscode.workspace.getConfiguration(configurationName);
  const liquibaseFolder: string | undefined = configuration.get("liquibaseFolder", "");

  if (vscode.workspace.workspaceFolders) {
    const workspaceFolder = vscode.workspace.workspaceFolders[0];

    const fsPathToWorkspace = workspaceFolder.uri.fsPath;

    if (liquibaseFolder) {
      return path.join(fsPathToWorkspace, liquibaseFolder);
    } else {
      return fsPathToWorkspace;
    }
  }

  // Fallback: no workspace there, just return empty string.
  return "";
}

/**
 * Loads from the configuration the default database type.
 * This type should always be selected in new configurations.
 *
 * @returns the setting of the default database type from the configuration
 */
export function getDefaultDatabaseForConfiguration(): string {
  const configuration = vscode.workspace.getConfiguration(configurationName);
  const defaultDatabaseForConfiguration = configuration.get(
    "defaultDatabaseForConfiguration",
    NO_PRE_CONFIGURED_DRIVER
  );

  return defaultDatabaseForConfiguration || NO_PRE_CONFIGURED_DRIVER;
}

/**
 * Returns the setting if the output channel should be cleared on start.
 *
 * @returns `true` when the output channel should be cleared on start, otherwise `false`
 */
export function getClearOutputChannelOnStartSetting(): boolean {
  const configuration = vscode.workspace.getConfiguration(configurationName);
  return configuration.get("clearOutputChannelOnStart", true);
}

/**
 * Returns the setting if the output channel should be opened on start.
 *
 * @returns `true` when the output channel should be opened on start, otherwise `false`
 */
export function getOpenOutputChannelOnCommandStartSetting(): boolean {
  const configuration = vscode.workspace.getConfiguration(configurationName);
  return configuration.get("openOutputChannelOnCommandStart", true);
}
