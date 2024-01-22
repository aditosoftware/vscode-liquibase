import { immerable } from "immer";
import { ALL_DRIVERS, Driver, NO_PRE_CONFIGURED_DRIVER } from "../drivers";
import { PropertiesEditor } from "properties-file/editor";

/**
 * The Database connection configuration with all the input that is needed for connecting to the database.
 * @see https://docs.liquibase.com/concepts/connections/creating-config-properties.html
 */
export class DatabaseConnection {
  [immerable] = true;

  /**
   * Prefix for all reference key.
   */
  static readonly REFERENCE: string = "reference";

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

  private constructor(username: string, password: string, url: string, driver: string, databaseType: string) {
    this.username = username;
    this.password = password;
    this.url = url;
    this.driver = driver;
    this.databaseType = databaseType;
  }

  /**
   * Clones an existing object to create a new one. This is needed after serialization and deserialization, because otherwise the methods will not be there.
   *
   * This method needs to be static, because after serialization and deserialization no methods of the class will be available,
   * and so this method would not be callable, when it is an class method.
   * @param dataToClone - the data that needs to be cloned.
   * @returns the new instance
   */
  static clone(dataToClone: DatabaseConnection): DatabaseConnection {
    return new DatabaseConnection(
      dataToClone.username,
      dataToClone.password,
      dataToClone.url,
      dataToClone.driver,
      dataToClone.databaseType
    );
  }

  /**
   * Creates a default database connection.
   * @param defaultDatabaseForConfiguration  - the default database configuration that should be selected
   * @returns the default DatabaseConnection
   */
  static createDefaultDatabaseConnection(defaultDatabaseForConfiguration: string): DatabaseConnection {
    return new DatabaseConnection("", "", "", "", defaultDatabaseForConfiguration);
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
   * @param pBuildDriverPath - a function for building the drivers path
   * @returns the path from the downloaded driver, if downloaded
   */
  writeDataForConnection(
    properties: PropertiesEditor,
    pReferenceConnection: boolean,
    pBuildDriverPath: (pDriver: Driver) => string | undefined
  ): string | undefined {
    properties.insertComment(`configuration for the ${pReferenceConnection ? "reference " : ""}database`);
    Object.entries(this).forEach(([key, value]) => {
      if (key && value && key !== "databaseType") {
        properties.insert(pReferenceConnection ? this.createReferenceKey(key) : key, value);
      }
    });
    return this.writeDriverConfigurationAndDownload(properties, pReferenceConnection, pBuildDriverPath);
  }

  /**
   * Writes the driver configuration to the properties file. If `pDownloadDriver` is given, then will be also the driver downloaded, if not there.
   * @param pProperties - the properties editor where the properties should be written
   * @param pIsReferenceConnection - information if this is the reference connection or not
   * @param pBuildDriverPath - a function for building the driver path
   * @returns the path from the downloaded driver, if downloaded
   */
  private writeDriverConfigurationAndDownload(
    pProperties: PropertiesEditor,
    pIsReferenceConnection: boolean,
    pBuildDriverPath: (pDriver: Driver) => string | undefined
  ): string | undefined {
    const databaseType: string = this.databaseType;

    if (databaseType !== NO_PRE_CONFIGURED_DRIVER) {
      const databaseDriver: Driver | undefined = ALL_DRIVERS.get(databaseType);
      if (databaseDriver) {
        const driverKey: string = "driver";

        pProperties.insert(
          pIsReferenceConnection ? this.createReferenceKey(driverKey) : driverKey,
          databaseDriver.driverClass
        );

        // build the path for the driver
        return pBuildDriverPath(databaseDriver);
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

  /**
   * Adjusts the driver after loading it from a properties file.
   * If the driver is from a pre-configured driver class, then the databaseType will be set to this pre-configured element,
   * in order to have it easier displayed in the webview.
   * @param value - the value of the current driver configuration
   * @param connection - the database connection that should be changed
   */
  adjustDriver(value: string) {
    let preConfiguredDriver = false;

    for (const [driverKey, driverValue] of ALL_DRIVERS.entries()) {
      if (driverValue.driverClass === value) {
        // adjust database type when driver was given
        this.databaseType = driverKey;
        this.driver = "";
        preConfiguredDriver = true;
        break;
      }
    }

    if (!preConfiguredDriver) {
      // set the database type to no-pre-configured, because it can be any driver based on the users setting
      this.databaseType = NO_PRE_CONFIGURED_DRIVER;
    }
  }
}
