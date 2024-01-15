import { immerable } from "immer";
import { DatabaseConnection } from "./DatabaseConnection";
import * as fs from "fs";
import { getProperties } from "properties-file";
import { Driver } from "../drivers";
import { PropertiesEditor } from "properties-file/editor";

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
   * The default database configuration that should be selected in any dropdown.
   */
  readonly defaultDatabaseForConfiguration: string;

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
    defaultDatabaseForConfiguration: string,
    name: string,
    classpath: string,
    classpathSeparator: ClasspathSeparator,
    databaseConnection: DatabaseConnection,
    additionalConfiguration: AdditionalConfiguration,
    referenceDatabaseConnection?: DatabaseConnection
  ) {
    this.status = status;
    this.defaultDatabaseForConfiguration = defaultDatabaseForConfiguration;
    this.name = name;
    this.classpath = classpath;
    this.classpathSeparator = classpathSeparator;
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
      dataToClone.defaultDatabaseForConfiguration,
      dataToClone.name,
      dataToClone.classpath,
      dataToClone.classpathSeparator,
      DatabaseConnection.clone(dataToClone.databaseConnection),
      dataToClone.additionalConfiguration,
      dataToClone.referenceDatabaseConnection
        ? DatabaseConnection.clone(dataToClone.referenceDatabaseConnection)
        : undefined
    );
  }

  /**
   * Creates a default object.
   * @param defaultDatabaseForConfiguration  - the default database configuration that should be selected
   * @param state - if this configuration is used as a new one or to edit an existing one
   * @param isWindows - if windows or linux/MacOs separators are used
   * @returns the created default object
   */
  static createDefaultData(
    defaultDatabaseForConfiguration: string,
    status: ConfigurationStatus,
    isWindows: boolean
  ): LiquibaseConfigurationData {
    return new LiquibaseConfigurationData(
      status,
      defaultDatabaseForConfiguration,
      "",
      "",
      isWindows ? ";" : ":",
      DatabaseConnection.createDefaultDatabaseConnection(defaultDatabaseForConfiguration),
      {}
    );
  }

  /**
   * Loads the content from a file and transform it into an object.
   * @param pName - the name of the configuration
   * @param pPath - the path of the file
   * @param defaultDatabaseForConfiguration  - the default database configuration that should be selected
   * @param isWindows - if the current os is windows. Needed for the separator in the classpath
   * @returns the loaded content
   */
  static createFromFile(
    pName: string,
    pPath: string,
    pDefaultDatabaseForConfiguration: string,
    isWindows: boolean
  ): LiquibaseConfigurationData {
    // read the liquibase properties from a file
    const liquibaseProperties = getProperties(fs.readFileSync(pPath, "utf8"));

    const data = LiquibaseConfigurationData.createDefaultData(
      pDefaultDatabaseForConfiguration,
      ConfigurationStatus.EDIT,
      isWindows
    );
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

    if (normalizedKey === "classpath") {
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
            this.defaultDatabaseForConfiguration
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
   * @param pDownloadDriver - function to download the driver, if not there. This function will return the path where this driver was downloaded.
   * There should be no function, when this function is only used to create a preview.
   * @returns the created properties file as a string
   */
  async generateProperties(pDownloadDriver?: (pDriver: Driver) => Promise<string | undefined>): Promise<string> {
    const propertiesEditor = await this.generatePropertiesEditor(pDownloadDriver);
    // replace all escaped colons with unescaped.
    // There is no way to automatically escape them during creation
    // TODO maybe more escapes are needed with unescapeContent
    return propertiesEditor.format().replaceAll("\\:", ":");
  }

  /**
   * Creates the properties editor for the given configuration.
   * @param pDownloadDriver - function to download the driver, if not there. This function will return the path where this driver was downloaded.
   * There should be no function, when this function is only used to create a preview.
   * @returns the created properties
   */
  private async generatePropertiesEditor(
    pDownloadDriver?: (pDriver: Driver) => Promise<string | undefined>
  ): Promise<PropertiesEditor> {
    // Build the properties
    const properties: PropertiesEditor = new PropertiesEditor("");

    const classpathElements: string[] = this.classpath.split("\n");

    if (this.databaseConnection.hasData()) {
      const result = await this.databaseConnection.writeDataForConnection(properties, false, pDownloadDriver);
      result && classpathElements.push(result);
    }

    // and the reference properties
    if (this.referenceDatabaseConnection && this.referenceDatabaseConnection.hasData()) {
      const result = await this.referenceDatabaseConnection.writeDataForConnection(properties, true, pDownloadDriver);
      result && classpathElements.push(result);
    }

    // TODO Workspace-Folder auch hinzufügen?

    const allUniqueClasspath = Array.from(new Set(classpathElements))
      .filter((pElement) => pElement.trim() !== "")
      // add quotation marks when no given
      .map((pElement) => {
        if (pElement.startsWith('"') && pElement.endsWith('"')) {
          return pElement;
        } else {
          return `"${pElement}"`;
        }
      });
    if (allUniqueClasspath.length !== 0) {
      const joinedClasspath = allUniqueClasspath.join(this.classpathSeparator);

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
