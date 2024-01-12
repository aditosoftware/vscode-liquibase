import { immerable } from "immer";
import { ALL_DRIVERS, Driver, NO_PRE_CONFIGURED_DRIVER } from "../drivers";
import { PropertiesEditor } from "properties-file/editor";

/**
 * The Database connection configuration with all the input that is needed for connecting to the database.
 * @see https://docs.liquibase.com/concepts/connections/creating-config-properties.html
 */
export class DatabaseConnection {
  /**
   * Prefix for all reference key.
   */
  static readonly REFERENCE: string = "reference";

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
   * Creates a default database connection.
   * @returns the default DatabaseConnection
   */
  static createDefaultDatabaseConnection(): DatabaseConnection {
    return new DatabaseConnection("", "", "", "", NO_PRE_CONFIGURED_DRIVER);
  }

  /**
   * Returns a value of an element.
   * @param pName - the name of the element that should be get
   * @returns the value of the element
   */
  getValue(pName: keyof DatabaseConnection): string | undefined {
    if (typeof this[pName] === "string") {
      return this[pName] as string;
    }
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
    pDownloadDriver?: (pDriver: Driver) => Promise<string | undefined>
  ): Promise<string | undefined> {
    properties.insertComment(`configuration for the ${pReferenceConnection ? "reference " : ""}database`);
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
    pDownloadDriver?: (pDriver: Driver) => Promise<string | undefined>
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
    return DatabaseConnection.REFERENCE + key.charAt(0).toUpperCase() + key.substring(1);
  }

  /**
   * Transforms a key, which was previously referenced, back into its normal state.
   * @param key - the referenced key
   * @returns the normal key
   */
  static createDeReferencedKey(key: string): string {
    const keyWithoutReference = key.replace(DatabaseConnection.REFERENCE, "");
    return keyWithoutReference.charAt(0).toLowerCase() + keyWithoutReference.substring(1);
  }
}
