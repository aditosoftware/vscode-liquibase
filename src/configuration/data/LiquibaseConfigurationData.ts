import { immerable } from "immer";
import { DatabaseConnection } from "./DatabaseConnection";
import { PropertiesEditor } from "properties-file/editor";
import { LiquibaseSettings } from "./TransferSettings";

/**
 * The type for additional configurations.
 *
 * **NOTE**: If you plan to refactor this, Maps are not really serializable and therefore not good for passing the values from the webview to the extension!
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
   * The keys that can be configured in the configuration data.
   */
  static readonly configuredKeys: string[] = [
    "changelogFile",
    ...["username", "password", "url", "driver"]
      .map((pKey) => [pKey, DatabaseConnection.createReferenceKey(pKey)])
      .flat(),
  ];

  /**
   * Constructor. If you want to create a new instance of this outside of the class, you might want to use any of the following methods:
   * - `createDefaultData` - for empty data
   * - `readFullValues` (`readFromProperties.ts`) - for loading from a liquibase.properties file. In this file, other methods of reading are also included.
   * - `clone` - for copying the whole object
   *
   * @param status - Indicator, if this is a new config or and edited config.
   * @param liquibaseSettings - The settings that are relevant for creating / updating a configuration.
   * @param name - The name of the configuration.
   * @param changelogFile - The file where the basic changelog.xml is located.
   * @param databaseConnection - The normal database connection configuration.
   * @param additionalConfiguration - Some additional configurations.
   * NOTE: If you plan to refactor this, Maps are not really serializable and therefore not good for passing the values!
   * @param referenceDatabaseConnection - The reference database connection. This connection does not need to be there.
   */
  private constructor(
    public status: ConfigurationStatus,
    public liquibaseSettings: LiquibaseSettings,
    public name: string,
    public changelogFile: string,
    public databaseConnection: DatabaseConnection,
    public additionalConfiguration: AdditionalConfiguration,
    public referenceDatabaseConnection?: DatabaseConnection
  ) {}

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
      dataToClone.changelogFile,
      DatabaseConnection.clone(dataToClone.databaseConnection),
      { ...dataToClone.additionalConfiguration },
      dataToClone.referenceDatabaseConnection
        ? DatabaseConnection.clone(dataToClone.referenceDatabaseConnection)
        : undefined
    );
  }

  /**
   * Creates a default object.
   *
   * @param liquibaseSettings - the settings relevant for creating a new configuration
   * @param status - if this configuration is used as a new one or to edit an existing one
   * @returns the created default object
   */
  static createDefaultData(
    liquibaseSettings: LiquibaseSettings,
    status: ConfigurationStatus
  ): LiquibaseConfigurationData {
    return new LiquibaseConfigurationData(
      status,
      liquibaseSettings,
      "",
      "",
      DatabaseConnection.createDefaultDatabaseConnection(liquibaseSettings.defaultDatabaseForConfiguration),
      {}
    );
  }

  /**
   * Adds a new key-value-pair to the current data. These key-value-pairs come directly from a liquibase.properties file.
   *
   * @param key - the the of the liquibase properties file
   * @param value - the value of the liquibase properties file
   */
  handleValueFromLiquibaseConfiguration(key: string, value: string): void {
    let normalizedKey = key;
    let reference: boolean = false;
    if (key.startsWith(DatabaseConnection.REFERENCE)) {
      reference = true;
      normalizedKey = DatabaseConnection.createDeReferencedKey(key);
    }

    if (normalizedKey === "changelogFile") {
      this.changelogFile = value;
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
   *
   * @param pDisguisePassword - if the password should not be displayed as plain text, but as `***`. These should be used if you are in a preview.
   * If no value is given, then the password will be set as plain text
   * @returns the created properties file as a string
   */
  generateProperties(pDisguisePassword?: boolean): string {
    const propertiesEditor = this.generatePropertiesEditor(pDisguisePassword ?? false);
    // replace all escaped colons with unescaped.
    // There is no way to automatically escape them during creation
    return propertiesEditor.format().replaceAll("\\:", ":");
  }

  /**
   * Creates the properties editor for the given configuration.
   *
   * @param pDisguisePassword - if the password should not be displayed as plain text, but as `***`. These should be used if you are in a preview.
   * @returns the created properties
   */
  private generatePropertiesEditor(pDisguisePassword: boolean): PropertiesEditor {
    // Build the properties
    const properties: PropertiesEditor = new PropertiesEditor("");

    if (this.changelogFile) {
      properties.insert("changelogFile", this.changelogFile);
    }

    // write the data for the normal connection
    if (this.databaseConnection.hasData()) {
      this.databaseConnection.writeDataForConnection(properties, false, pDisguisePassword);
    }

    // and write the reference properties
    if (this.referenceDatabaseConnection && this.referenceDatabaseConnection.hasData()) {
      this.referenceDatabaseConnection.writeDataForConnection(properties, true, pDisguisePassword);
    }

    // add advanced properties
    if (this.additionalConfiguration && Object.keys(this.additionalConfiguration).length !== 0) {
      properties.insertComment("additional configuration values");
      for (const key in this.additionalConfiguration) {
        properties.insert(key, this.additionalConfiguration[key]);
      }
    }

    return properties;
  }
}
