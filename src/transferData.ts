import { immerable } from "immer";
import { PropertiesEditor } from "properties-file/editor";
import { ALL_DRIVERS, Driver, NO_PRE_CONFIGURED_DRIVER } from "./drivers";

/**
 * The message data that can be transferred from the webview to the extension.
 */
export class MessageData {
  /**
   * The command that should be executed. This command is any string that is referenced in the panel of the webview.
   */
  command: string;

  /**
   * The real data of the message.
   */
  data: LiquibaseConfigurationData;

  constructor(command: string, data: LiquibaseConfigurationData) {
    this.command = command;
    this.data = data;
  }

  /**
   * Creates a new instance of an existing object after the serialization.
   * This is needed, because otherwise no methods will be there.
   * @param pSerializedData - the serialized data
   * @returns the new message data
   */
  static createFromSerializedData(pSerializedData: MessageData): MessageData {
    return new MessageData(
      pSerializedData.command,
      new LiquibaseConfigurationData(
        pSerializedData.data.name,

        new DatabaseConnection(
          pSerializedData.data.databaseConnection.username,
          pSerializedData.data.databaseConnection.password,
          pSerializedData.data.databaseConnection.url,
          pSerializedData.data.databaseConnection.driver,
          pSerializedData.data.databaseConnection.classpath,
          pSerializedData.data.databaseConnection.databaseType
        ),

        pSerializedData.data.additionalConfiguration,

        pSerializedData.data.referenceDatabaseConnection
          ? new DatabaseConnection(
              pSerializedData.data.referenceDatabaseConnection.username,
              pSerializedData.data.referenceDatabaseConnection.password,
              pSerializedData.data.referenceDatabaseConnection.url,
              pSerializedData.data.referenceDatabaseConnection.driver,
              pSerializedData.data.referenceDatabaseConnection.classpath,
              pSerializedData.data.referenceDatabaseConnection.databaseType
            )
          : undefined
      )
    );
  }
}

/**
 * The liquibase configuration data.
 */
export class LiquibaseConfigurationData {
  [immerable] = true;

  /**
   * The name of the configuration.
   */
  name: string;

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
    name: string,
    databaseConnection: DatabaseConnection,
    additionalConfiguration: AdditionalConfiguration,
    referenceDatabaseConnection?: DatabaseConnection
  ) {
    this.name = name;
    this.databaseConnection = databaseConnection;
    this.referenceDatabaseConnection = referenceDatabaseConnection;
    this.additionalConfiguration = additionalConfiguration;
  }

  generatePropertiesForDisplay(): string {
    // TODO machen

    // this.generateProperties().then((data) => {
    //   console.log(data);
    // });

    // const properties = await this.generateProperties();
    // return properties.format();

    return this.generateProperties().format();
  }

  generateProperties(): PropertiesEditor {
    // Build the properties
    const properties: PropertiesEditor = new PropertiesEditor("");

    // Adjust the connection for pre-configured databases ...
    this.adjustDatabaseConnection(this.databaseConnection);
    // .. and put in the properties for the database connection
    Object.entries(this.databaseConnection).forEach(([key, value]) => {
      if (key && value && key !== "databaseType") {
        properties.insert(key, value);
      }
    });

    if (this.referenceDatabaseConnection) {
      // Adjust the connection for a reference connection ...
      this.adjustDatabaseConnection(this.referenceDatabaseConnection);
      // ... and put in these values prefixed by reference as well
      Object.entries(this.referenceDatabaseConnection).forEach(([key, value]) => {
        if (key && value && key !== "databaseType") {
          const referenceKey = "reference" + key.charAt(0).toUpperCase() + key.substring(1);
          properties.insert(referenceKey, value);
        }
      });
    }

    // add additional properties
    for (const key in this.additionalConfiguration) {
      properties.insert(key, this.additionalConfiguration[key]);
    }

    return properties;
  }

  /**
   * Adjusts a database connection by possible downloading the drivers and setting those values in the connection.
   * @param pDatabaseConnection - the database connection whose driver should be adjusted
   */
  private adjustDatabaseConnection(pDatabaseConnection: DatabaseConnection): void {
    const databaseType: string = pDatabaseConnection.databaseType;

    if (databaseType !== NO_PRE_CONFIGURED_DRIVER) {
      const databaseDriver: Driver | undefined = ALL_DRIVERS.get(databaseType);
      if (databaseDriver) {
        // TODO Some error here
        // pDatabaseConnection.driver = databaseDriver.driverClass;
        // pDatabaseConnection.classpath = "<TBA>";
        // TODO anpassen
      }
    }
  }
}

type AdditionalConfiguration = { [key: string]: string };

/**
 * The Database connection configuration with all the input that is needed for connecting to the database.
 * @see https://docs.liquibase.com/concepts/connections/creating-config-properties.html
 */
export class DatabaseConnection {
  [immerable] = true;

  /**
   * Username to connect to the target database.
   */
  username: string;

  /**
   *Password to connect to the target database.
   */
  password: string;

  /**
   * Specifies the database to use when making comparisons to the source database. Also known as the target.
   * This is usually a jdbc url.
   */
  url: string;

  /**
   * Specifies the driver class name for the target database.
   */
  driver: string;

  /**
   * Specifies the directories and JAR files to search for changelog files and custom extension classes.
   *
   * TODO To separate multiple directories, use a semicolon (;) on Windows or a colon (:) on Linux or MacOS.
   */
  classpath: string;

  /**
   * The database type. This can be any type from the drivers. This will be later adjusted into `driver` and `classpath`, if a pre-configured driver was selected.
   */
  databaseType: string;

  constructor(
    username: string,
    password: string,
    url: string,
    driver: string,
    classpath: string,
    databaseType: string
  ) {
    this.username = username;
    this.password = password;
    this.url = url;
    this.driver = driver;
    this.classpath = classpath;
    this.databaseType = databaseType;
  }

  /**
   * Sets a value to a dynamic key.
   * @param pName - the name of the element that should be set
   * @param pValue - the value that should be set
   * @returns the updated element
   */
  setValue(pName: keyof DatabaseConnection, pValue: string): DatabaseConnection {
    if (typeof this[pName] === "string") {
      (this[pName] as string) = pValue;
    }
    return this;
  }
}
