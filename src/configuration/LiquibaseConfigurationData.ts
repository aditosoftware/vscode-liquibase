import { immerable } from "immer";
import { DatabaseConnection } from "./DatabaseConnection";
import * as fs from "fs";
import { getProperties } from "properties-file";
import { ALL_DRIVERS, Driver, NO_PRE_CONFIGURED_DRIVER } from "../drivers";
import { PropertiesEditor } from "properties-file/editor";

/**
 * The type for separating multiple classpath.
 * It is depending on OS. Use a Semicolon (`;`) on Windows. Use a colon (`:`) on Linux or MacOS.
 */
type ClasspathSeparator = ";" | ":";

/**
 * The type for additional configurations.
 */
type AdditionalConfiguration = { [key: string]: string };

/**
 * The liquibase configuration data.
 */
export class LiquibaseConfigurationData {
  [immerable] = true;

  /**
   * Indicator, if this is a new config or and edited config.
   */
  newConfig: boolean;

  /**
   * The default database configuration that should be selected in any dropdown.
   */
  defaultDatabaseForConfiguration: string;

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

  constructor(
    newConfig: boolean,
    defaultDatabaseForConfiguration: string,
    name: string,
    classpath: string,
    classpathSeparator: ClasspathSeparator,
    databaseConnection: DatabaseConnection,
    additionalConfiguration: AdditionalConfiguration,
    referenceDatabaseConnection?: DatabaseConnection
  ) {
    this.newConfig = newConfig;
    this.defaultDatabaseForConfiguration = defaultDatabaseForConfiguration;
    this.name = name;
    this.classpath = classpath;
    this.classpathSeparator = classpathSeparator;
    this.databaseConnection = databaseConnection;
    this.referenceDatabaseConnection = referenceDatabaseConnection;
    this.additionalConfiguration = additionalConfiguration;
  }

  /**
   * Creates a default object.
   * @param defaultDatabaseForConfiguration  - the default database configuration that should be selected
   * @param newValue - if this default is used as a new value or to save an existing value
   * @param isWindows - if windows or linux/MacOs separators are used
   * @returns the created default object
   */
  static createDefaultData(
    defaultDatabaseForConfiguration: string,
    newValue: boolean,
    isWindows: boolean
  ): LiquibaseConfigurationData {
    return new LiquibaseConfigurationData(
      newValue,
      defaultDatabaseForConfiguration,
      "",
      "",
      isWindows ? ";" : ":",
      DatabaseConnection.createDefaultDatabaseConnection(defaultDatabaseForConfiguration),
      {}
    );
  }

  // TODO verbessern
  /**
   * Loads the content from a file and transform it into an object.
   * @param pName - the name of the configuration
   * @param pPath - the path of the file
   * @param defaultDatabaseForConfiguration  - the default database configuration that should be selected
   * @param isWindows - if the current os is windows. Needed for the separator
   * @returns the loaded content
   */
  static createFromFile(
    pName: string,
    pPath: string,
    pDefaultDatabaseForConfiguration: string,
    isWindows: boolean
  ): LiquibaseConfigurationData {
    const properties = getProperties(fs.readFileSync(pPath, "utf8"));

    const data = LiquibaseConfigurationData.createDefaultData(pDefaultDatabaseForConfiguration, false, isWindows);

    data.name = pName;

    for (const [key, value] of Object.entries(properties)) {
      let normalizedKey = key;
      let reference: boolean = false;
      if (key.startsWith(DatabaseConnection.REFERENCE)) {
        reference = true;
        normalizedKey = DatabaseConnection.createDeReferencedKey(key);
      }

      if (normalizedKey === "classpath") {
        // TODO special case, when file from different os was copied?
        data.classpath = value.replaceAll(data.classpathSeparator, "\n");
      } else if (
        normalizedKey === "username" ||
        normalizedKey === "password" ||
        normalizedKey === "url" ||
        normalizedKey === "driver"
      ) {
        let connection: DatabaseConnection;
        if (reference) {
          if (!data.referenceDatabaseConnection) {
            data.referenceDatabaseConnection = DatabaseConnection.createDefaultDatabaseConnection(
              pDefaultDatabaseForConfiguration
            );
          }
          connection = data.referenceDatabaseConnection;
        } else {
          connection = data.databaseConnection;
        }

        // set the value for the connection
        connection.setValue(normalizedKey, value);

        if (normalizedKey === "driver") {
          let preConfiguredDriver = false;
          // adjust database type when driver was given
          // TODO multiple drivers suitable (e.g. MYSQL and MariaDB)
          for (const [driverKey, driverValue] of ALL_DRIVERS.entries()) {
            if (driverValue.driverClass === value) {
              connection.databaseType = driverKey;
              connection.driver = "";
              preConfiguredDriver = true;
              break;
            }
          }

          if (!preConfiguredDriver) {
            // set the database type to no-pre-configured, because it can be any driver based on the users setting
            connection.databaseType = NO_PRE_CONFIGURED_DRIVER;
          }
        }
      } else {
        // set the normal key, not the adjusted one
        data.additionalConfiguration[key] = value;
      }
    }

    return data;
  }

  // TODO das ganze woanders hin auslagern?

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
