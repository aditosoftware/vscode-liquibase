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
        pSerializedData.data.classpath,
        pSerializedData.data.classpathSeparator,

        new DatabaseConnection(
          pSerializedData.data.databaseConnection.username,
          pSerializedData.data.databaseConnection.password,
          pSerializedData.data.databaseConnection.url,
          pSerializedData.data.databaseConnection.driver,
          pSerializedData.data.databaseConnection.databaseType
        ),

        pSerializedData.data.additionalConfiguration,

        pSerializedData.data.referenceDatabaseConnection
          ? new DatabaseConnection(
              pSerializedData.data.referenceDatabaseConnection.username,
              pSerializedData.data.referenceDatabaseConnection.password,
              pSerializedData.data.referenceDatabaseConnection.url,
              pSerializedData.data.referenceDatabaseConnection.driver,
              pSerializedData.data.referenceDatabaseConnection.databaseType
            )
          : undefined
      )
    );
  }
}

/**
 * The type for separating multiple classpath.
 * It is depending on OS. Use a Semicolon (`;`) on Windows. Use a colon (`:`) on Linux or MacOS.
 */
type ClasspathSeparator = ";" | ":";

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
    name: string,
    classpath: string,
    classpathSeparator: ClasspathSeparator,
    databaseConnection: DatabaseConnection,
    additionalConfiguration: AdditionalConfiguration,
    referenceDatabaseConnection?: DatabaseConnection
  ) {
    this.name = name;
    this.classpath = classpath;
    this.classpathSeparator = classpathSeparator;
    this.databaseConnection = databaseConnection;
    this.referenceDatabaseConnection = referenceDatabaseConnection;
    this.additionalConfiguration = additionalConfiguration;
  }

  // TODO das ganze woanders hin auslagern?

  /**
   * Creates the properties text for saving in a file or previewing.
   * @param pDownloadDriver - function to download the driver, if not there. This function will return the path where this driver was downloaded.
   * There should be no function, when this function is only used to create a preview.
   * @returns the created properties file as a string
   */
  async generateProperties(pDownloadDriver?: (pDriver: Driver) => Promise<string>): Promise<string> {
    const propertiesEditor = await this.generatePropertiesEditor(pDownloadDriver);
    // replace all escaped colons with unescaped.
    // There is no way to automatically escape them during creation
    return propertiesEditor.format().replaceAll("\\:", ":");
  }

  /**
   * Creates the properties editor for the given configuration.
   * @param pDownloadDriver - function to download the driver, if not there. This function will return the path where this driver was downloaded.
   * There should be no function, when this function is only used to create a preview.
   * @returns the created properties
   */
  private async generatePropertiesEditor(
    pDownloadDriver?: (pDriver: Driver) => Promise<string>
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
      .map((pElement) => `"${pElement}"`);
    if (allUniqueClasspath.length !== 0) {
      const joinedClasspath = allUniqueClasspath.join(this.classpathSeparator);

      properties.insertComment(
        "Specifies the directories and JAR files to search for changelog files and custom extension classes. To separate multiple directories, use a semicolon (;) on Windows or a colon (:) on Linux or MacOS."
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
   * The database type. This can be any type from the drivers. This will be later adjusted into `driver` and `classpath`, if a pre-configured driver was selected.
   */
  databaseType: string;

  constructor(username: string, password: string, url: string, driver: string, databaseType: string) {
    this.username = username;
    this.password = password;
    this.url = url;
    this.driver = driver;
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

  /**
   * Checks if any data is given.
   * @returns `true` if any data is there
   */
  hasData(): boolean {
    return (
      this.username !== "" ||
      this.password !== "" ||
      this.url !== "" ||
      this.driver !== "" ||
      (this.databaseType !== "" && this.databaseType !== NO_PRE_CONFIGURED_DRIVER)
    );
  }

  /**
   * Writes the data for the database connection.
   *
   * @param properties - the properties editor where the properties should be written
   * @param pReferenceConnection - information if this is the reference connection or not
   * @param pDownloadDriver - a function for downloading the drivers
   * @returns the path from the downloaded driver, if downloaded
   */
  async writeDataForConnection(
    properties: PropertiesEditor,
    pReferenceConnection: boolean,
    pDownloadDriver?: (pDriver: Driver) => Promise<string>
  ): Promise<string | undefined> {
    properties.insertComment(`configuration for the ${pReferenceConnection ? "reference" : ""} database`);
    Object.entries(this).forEach(([key, value]) => {
      if (key && value && key !== "databaseType") {
        properties.insert(pReferenceConnection ? this.createReferenceKey(key) : key, value);
      }
    });
    return this.writeDriverConfigurationAndDownload(properties, pReferenceConnection, pDownloadDriver);
  }

  /**
   * Writes the driver configuration to the properties file. If `pDownloadDriver` is given, then will be also the driver downloaded, if not there.
   * @param pProperties - the properties editor where the properties should be written
   * @param pIsReferenceConnection - information if this is the reference connection or not
   * @param pDownloadDriver - a function for downloading the drivers
   * @returns the path from the downloaded driver, if downloaded
   */
  private async writeDriverConfigurationAndDownload(
    pProperties: PropertiesEditor,
    pIsReferenceConnection: boolean,
    pDownloadDriver?: (pDriver: Driver) => Promise<string>
  ): Promise<string | undefined> {
    const databaseType: string = this.databaseType;

    if (databaseType !== NO_PRE_CONFIGURED_DRIVER) {
      const databaseDriver: Driver | undefined = ALL_DRIVERS.get(databaseType);
      if (databaseDriver) {
        const driverKey: string = "driver";

        pProperties.insert(
          pIsReferenceConnection ? this.createReferenceKey(driverKey) : driverKey,
          databaseDriver.driverClass
        );

        // download driver when function is there
        if (pDownloadDriver) {
          return await pDownloadDriver(databaseDriver);
        }
      }
    }
  }

  /**
   * Transforms a key into a reference key. For instance `username` will be transformed to `referenceUsername`.
   * @param key - the key which should be transformed into a reference key
   * @returns the reference key
   */
  private createReferenceKey(key: string): string {
    return "reference" + key.charAt(0).toUpperCase() + key.substring(1);
  }
}
