import path from "path";
import fs from "fs";
import * as vscode from "vscode";

import { Logger } from "@aditosoftware/vscode-logging";
import { randomUUID } from "crypto";
import { ConfigurationStatus, LiquibaseConfigurationData } from "../../configuration/data/LiquibaseConfigurationData";
import { initializeLogger } from "@aditosoftware/vscode-input";
import { setCacheHandler, setLibFolder, setResourcePath } from "../../extension";
import assert from "assert";
import { CacheHandler } from "../../cache";

/**
 * Utility class for tests.
 */
export class TestUtils {
  private static extensionInitialized: boolean = false;

  /**
   * The path to the out folder
   */
  static readonly basicPathToOut = path.join(__dirname, "..", "..");

  /**
   * Temporary folder for writing cache files.
   */
  private static readonly temporaryResourcePath = path.join(this.basicPathToOut, "temp");

  /**
   * The resource path were all the resources were downloaded.
   */
  static readonly resourcePath = path.join(
    __dirname,
    "..",
    "..",
    "..",
    ".vscode-test",
    "user-data",
    "User",
    "globalStorage",
    "undefined_publisher.liquibase"
  );

  /**
   * Creates a temporary folder for tests.
   *
   * This temp folder will be removed when `npm run test-compile` is run.
   *
   * @param folderNames - the name of the folders
   * @returns the full path to the temporary folder.
   */
  static createTempFolderForTests(...folderNames: string[]): string {
    const temporaryPath = path.join(TestUtils.temporaryResourcePath, ...folderNames, randomUUID());
    if (!fs.existsSync(temporaryPath)) {
      fs.mkdirSync(temporaryPath, { recursive: true });
    }

    return temporaryPath;
  }

  /**
   * Init everything for the tests.
   * This should be used, when you want to test as close to the extension as possible,
   * or need various paths filled.
   */
  static init(): void {
    this.initLoggerForTests();

    setLibFolder(path.join(__dirname, "..", "..", "..", "lib"));

    assert.ok(fs.existsSync(TestUtils.resourcePath), TestUtils.resourcePath);
    setResourcePath(TestUtils.resourcePath);

    setCacheHandler(new CacheHandler(path.join(TestUtils.resourcePath, "cache.json")));
  }

  /**
   * Initializes a dummy logger for tests.
   * Also inits the logger for the vscode-inputs.
   */
  static initLoggerForTests(): void {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
      logUri: vscode.Uri.file(path.join(this.basicPathToOut, "temp", "logging")),
    } as unknown as vscode.ExtensionContext;
    Logger.initializeLogger(context, "Tests");
    initializeLogger(Logger.getLogger());
  }

  /**
   * Inits the extension for the test.
   *
   * **Note**: This method has a 7 second timeout in order to initialize everything.
   * You need the set the timeout for the setup higher, in order to let it execute.
   */
  static async initExtension(): Promise<void> {
    if (this.extensionInitialized) {
      return;
    }
    await vscode.commands.executeCommand("liquibase.initialize");
    await new Promise((r) => setTimeout(r, 7_000));
    this.extensionInitialized = true;
  }

  /**
   * Creates some dummy liquibase configuration data.
   *
   * @returns the created LiquibaseConfigurationData
   */
  static createDummyLiquibaseConfigurationData(): LiquibaseConfigurationData {
    return LiquibaseConfigurationData.createDefaultData(
      {
        defaultDatabaseForConfiguration: "MariaDB",
        liquibaseDirectoryInProject: "",
      },
      ConfigurationStatus.NEW
    );
  }
}
