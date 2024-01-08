import { immerable } from "immer";

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
  additionalConfiguration: { [key: string]: string } = {};

  constructor(
    name: string,
    databaseConnection: DatabaseConnection,
    additionalConfiguration: { [key: string]: string },
    referenceDatabaseConnection?: DatabaseConnection
  ) {
    this.name = name;
    this.databaseConnection = databaseConnection;
    this.referenceDatabaseConnection = referenceDatabaseConnection;
    this.additionalConfiguration = additionalConfiguration;
  }
}

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
