import { immerable } from "immer";
import { DatabaseConnection } from "./DatabaseConnection";
import * as fs from "fs";
import { getProperties } from "properties-file";
import { Driver } from "../drivers";
import { PropertiesEditor } from "properties-file/editor";
import { LiquibaseSettings } from "./TransferSettings";

/**
 * The type for separating multiple classpath.
 * It is depending on OS. Use a Semicolon (`;`) on Windows. Use a colon (`:`) on Linux or MacOS.
 */
type ClasspathSeparator = ";" | ":";

/**
 * The type for additional configurations.
 *  NOTE: If you plan to refactor this, Maps are not really serializable and therefore not good for passing the values from the webview to the extension!
 */
type AdditionalConfiguration = { [key: string]: string };

/**
 * The status of the current configuration.
 */
export enum ConfigurationStatus {
  NEW = "NEW",
  EDIT = "EDIT",
}

/**
 * The liquibase configuration data.
 */
export class LiquibaseConfigurationData {
  [immerable] = true;

  /**
   * Indicator, if this is a new config or and edited config.
   */
  status: ConfigurationStatus;

  /**
   * The settings that are relevant for creating / updating a configuration.
   */
  liquibaseSettings: LiquibaseSettings;

  /**
   * The name of the configuration.
   */
  name: string;

  /**
   * Specifies the directories and JAR files to search for changelog files and custom extension classes.
   */
  classpath: string;

  /**
   * The separator for multiple classpath elements.
   * To separate multiple directories, use a semicolon (;) on Windows or a colon (:) on Linux or MacOS.
   */
  classpathSeparator: ClasspathSeparator;

  /**
   * The file where the basic changelog.xml is located.
   */
  changelogFile: string;

  /**
   * The normal database connection configuration.
   */
  databaseConnection: DatabaseConnection;

  /**
   * The reference database connection. This connection does not need to be there.
   */
  referenceDatabaseConnection?: DatabaseConnection;

  /**
   * Some additional configurations.
   * NOTE: If you plan to refactor this, Maps are not really serializable and therefore not good for passing the values!
   */
  additionalConfiguration: AdditionalConfiguration;

  /**
   * Constructor. If you want to create a new instance of this outside of the class, you might want to use any of the following methods:
   * - `createDefaultData` - for empty data
   * - `createFromFile` - for loading from a liquibase.properties file.
   * - `clone` - for copying the whole object
   */
  private constructor(
    status: ConfigurationStatus,
    liquibaseSettings: LiquibaseSettings,
    name: string,
    classpath: string,
    classpathSeparator: ClasspathSeparator,
    changelogFile: string,
    databaseConnection: DatabaseConnection,
    additionalConfiguration: AdditionalConfiguration,
    referenceDatabaseConnection?: DatabaseConnection
  ) {
    this.status = status;
    this.liquibaseSettings = liquibaseSettings;
    this.name = name;
    this.classpath = classpath;
    this.classpathSeparator = classpathSeparator;
    this.changelogFile = changelogFile;
    this.databaseConnection = databaseConnection;
    this.referenceDatabaseConnection = referenceDatabaseConnection;
    this.additionalConfiguration = additionalConfiguration;
  }

  /**
   * Clones an existing object to create a new one. This is needed after serialization and deserialization, because otherwise the methods will not be there.
   * This will also clone the sub-objects.
   *
   * This method needs to be static, because after serialization and deserialization no methods of the class will be available,
   * and so this method would not be callable, when it is an class method.
   *
   * @param dataToClone - the data that needs to be cloned.
   * @returns the new instance
   */
  static clone(dataToClone: LiquibaseConfigurationData): LiquibaseConfigurationData {
    return new LiquibaseConfigurationData(
      dataToClone.status,
      {
        defaultDatabaseForConfiguration: dataToClone.liquibaseSettings.defaultDatabaseForConfiguration,
        liquibaseDirectoryInProject: dataToClone.liquibaseSettings.liquibaseDirectoryInProject,
      },
      dataToClone.name,
      dataToClone.classpath,
      dataToClone.classpathSeparator,
      dataToClone.changelogFile,
      DatabaseConnection.clone(dataToClone.databaseConnection),
      dataToClone.additionalConfiguration,
      dataToClone.referenceDatabaseConnection
        ? DatabaseConnection.clone(dataToClone.referenceDatabaseConnection)
        : undefined
    );
  }

  /**
   * Creates a default object.
   * @param liquibaseSettings  - the settings relevant for creating a new configuration
   * @param state - if this configuration is used as a new one or to edit an existing one
   * @param isWindows - if windows or linux/MacOs separators are used
   * @returns the created default object
   */
  static createDefaultData(
    liquibaseSettings: LiquibaseSettings,
    status: ConfigurationStatus,
    isWindows: boolean
  ): LiquibaseConfigurationData {
    return new LiquibaseConfigurationData(
      status,
      liquibaseSettings,
      "",
      "",
      isWindows ? ";" : ":",
      "",
      DatabaseConnection.createDefaultDatabaseConnection(liquibaseSettings.defaultDatabaseForConfiguration),
      {}
    );
  }

  /**
   * Loads the content from a file and transform it into an object.
   * @param pName - the name of the configuration
   * @param pPath - the path of the file
   * @param pLiquibaseSettings - the settings used for creating and updating the configuration
   * @param isWindows - if the current os is windows. Needed for the separator in the classpath
   * @returns the loaded content
   */
  static createFromFile(
    pName: string,
    pPath: string,
    pLiquibaseSettings: LiquibaseSettings,
    isWindows: boolean
  ): LiquibaseConfigurationData {
    // read the liquibase properties from a file
    const liquibaseProperties = getProperties(fs.readFileSync(pPath, "utf8"));

    const data = LiquibaseConfigurationData.createDefaultData(pLiquibaseSettings, ConfigurationStatus.EDIT, isWindows);
    data.name = pName;

    // handle all key-value-pairs from the file
    for (const [key, value] of Object.entries(liquibaseProperties)) {
      data.handleValueFromLiquibaseConfiguration(key, value);
    }

    return data;
  }

  /**
   * Adds a new key-value-pair to the current data. These key-value-pairs come directly from a liquibase.properties file.
   * @param key - the the of the liquibase properties file
   * @param value - the value of the liquibase properties file
   */
  private handleValueFromLiquibaseConfiguration(key: string, value: string) {
    let normalizedKey = key;
    let reference: boolean = false;
    if (key.startsWith(DatabaseConnection.REFERENCE)) {
      reference = true;
      normalizedKey = DatabaseConnection.createDeReferencedKey(key);
    }

    if (normalizedKey === "changelogFile") {
      this.changelogFile = value;
    } else if (normalizedKey === "classpath") {
      // TODO handle special case, when file from different os was copied?
      this.classpath = value.replaceAll(this.classpathSeparator, "\n");
    } else if (
      normalizedKey === "username" ||
      normalizedKey === "password" ||
      normalizedKey === "url" ||
      normalizedKey === "driver"
    ) {
      let connection: DatabaseConnection;
      if (reference) {
        if (!this.referenceDatabaseConnection) {
          this.referenceDatabaseConnection = DatabaseConnection.createDefaultDatabaseConnection(
            this.liquibaseSettings.defaultDatabaseForConfiguration
          );
        }
        connection = this.referenceDatabaseConnection;
      } else {
        connection = this.databaseConnection;
      }

      // set the value for the connection
      connection.setValue(normalizedKey, value);

      if (normalizedKey === "driver") {
        connection.adjustDriver(value);
      }
    } else {
      // set the normal key, not the adjusted one for the additional configuration
      this.additionalConfiguration[key] = value;
    }
  }

  /**
   * Creates the properties text for saving in a file or previewing.
   * @param pBuildDriverPath - function to build the driver path.
   * // TODO correct? or build also when Preview?
   * There should be no function, when this function is only used to create a preview.
   * @returns the created properties file as a string
   */
  generateProperties(pBuildDriverPath?: (pDriver: Driver) => string | undefined): string {
    const propertiesEditor = this.generatePropertiesEditor(pBuildDriverPath);
    // replace all escaped colons with unescaped.
    // There is no way to automatically escape them during creation
    // TODO maybe more escapes are needed with unescapeContent
    return propertiesEditor.format().replaceAll("\\:", ":");
  }

  /**
   * Creates the properties editor for the given configuration.
   *  @param pBuildDriverPath - function to build the driver path.
   * There should be no function, when this function is only used to create a preview.
   * @returns the created properties
   */
  private generatePropertiesEditor(pBuildDriverPath?: (pDriver: Driver) => string | undefined): PropertiesEditor {
    // Build the properties
    const properties: PropertiesEditor = new PropertiesEditor("");

    if (this.changelogFile) {
      properties.insert("changelogFile", this.changelogFile);
    }

    const classpathElements: string[] = this.classpath.split("\n");
    // add the liquibase directory to the classpath
    classpathElements.push(this.liquibaseSettings.liquibaseDirectoryInProject);

    if (this.databaseConnection.hasData()) {
      const result = this.databaseConnection.writeDataForConnection(properties, false, pBuildDriverPath);
      result && classpathElements.push(result);
    }

    // and the reference properties
    if (this.referenceDatabaseConnection && this.referenceDatabaseConnection.hasData()) {
      const result = this.referenceDatabaseConnection.writeDataForConnection(properties, true, pBuildDriverPath);
      result && classpathElements.push(result);
    }

    const joinedClasspath =
      // make all elements in the classpath unique
      Array.from(new Set(classpathElements))
        // remove empty elements
        .filter((pElement) => pElement.trim() !== "")
        // remove all quotation marks
        .map((pElement) => pElement.replaceAll('"', ""))
        // and join them via the separator
        .join(this.classpathSeparator);

    if (joinedClasspath) {
      properties.insertComment(
        "Specifies the directories and JAR files to search for changelog files and custom extension classes.\nTo separate multiple directories, use a semicolon (;) on Windows or a colon (:) on Linux or MacOS."
      );
      properties.insert("classpath", joinedClasspath);
    }

    // add additional properties
    if (this.additionalConfiguration && Object.keys(this.additionalConfiguration).length !== 0) {
      properties.insertComment("additional configuration values");
      for (const key in this.additionalConfiguration) {
        properties.insert(key, this.additionalConfiguration[key]);
      }
    }

    return properties;
  }
}
