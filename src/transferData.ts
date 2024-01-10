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
  classpath: string; // TODO include in constructor, remove default, tsdoc

  /**
   * The separator for multiple classpath elements.
   * To separate multiple directories, use a semicolon (;) on Windows or a colon (:) on Linux or MacOS.
   */
  classpathSeparator: ";" | ":"; // TODO type auslagern!

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
    classpathSeparator: ";" | ":",
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

  // FIXME Methode readFromProperties
  // FIXME Speichern und das hier zusammenlegen!

  generatePropertiesForDisplay(): string {
    // TODO das immer verwenden, damit classpath korrekt aussieht
    return this.generateProperties().format().replaceAll("\\:", ":");
  }

  // TODO use generateProperties also when saving

  generateProperties(): PropertiesEditor {
    // Build the properties
    const properties: PropertiesEditor = new PropertiesEditor("");

    // TODO anders lösen
    // TODO Workspace-Folder auch hinzufügen?
    const classpathElements: string[] = this.classpath.split("\n");
    const allUniqueClasspath = Array.from(new Set(classpathElements))
      .filter((pElement) => pElement.trim() !== "")
      .map((pElement) => `"${pElement}"`);

    if (allUniqueClasspath.length !== 0) {
      const joinedClasspath = allUniqueClasspath.join(this.classpathSeparator);

      properties.insert("classpath", joinedClasspath);
    }

    if (this.databaseConnection.hasData()) {
      properties.insertComment("configuration for the database");
      Object.entries(this.databaseConnection).forEach(([key, value]) => {
        if (key && value && key !== "databaseType") {
          properties.insert(key, value);
        }
      });
      this.writeDatabaseConnection(this.databaseConnection, properties, false);
    }

    // and the reference properties
    if (this.referenceDatabaseConnection && this.referenceDatabaseConnection.hasData()) {
      properties.insertComment("configuration for the reference database");
      Object.entries(this.referenceDatabaseConnection).forEach(([key, value]) => {
        if (key && value && key !== "databaseType") {
          const referenceKey = this.createReferenceKey(key);
          properties.insert(referenceKey, value);
        }
      });
      this.writeDatabaseConnection(this.referenceDatabaseConnection, properties, true);
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

  private createReferenceKey(key: string): string {
    return "reference" + key.charAt(0).toUpperCase() + key.substring(1);
  }

  private writeDatabaseConnection(
    pDatabaseConnection: DatabaseConnection,
    pProperties: PropertiesEditor,
    pIsReferenceConnection: boolean
  ): void {
    const databaseType: string = pDatabaseConnection.databaseType;

    if (databaseType !== NO_PRE_CONFIGURED_DRIVER) {
      const databaseDriver: Driver | undefined = ALL_DRIVERS.get(databaseType);
      if (databaseDriver) {
        const driverKey: string = "driver";

        pProperties.insert(
          pIsReferenceConnection ? this.createReferenceKey(driverKey) : driverKey,
          databaseDriver.driverClass
        );
        // TODO Classpath anders lösen?
        // pProperties.insert(pIsReferenceConnection ? this.createReferenceKey(classpathKey) : classpathKey, "<TBA>", {
        //   comment:
        //     "The classpath value will be dynamically created.\nThis will happen after downloading the necessary driver",
        // });
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

  hasData(): boolean {
    return (
      this.username !== "" ||
      this.password !== "" ||
      this.url !== "" ||
      this.driver !== "" ||
      (this.databaseType !== "" && this.databaseType !== NO_PRE_CONFIGURED_DRIVER)
    );
  }
}
