import { immerable } from "immer";
import { PREDEFINED_DRIVERS, Driver, NO_PRE_CONFIGURED_DRIVER, UrlParts } from "@aditosoftware/driver-dependencies";
import { PropertiesEditor } from "properties-file/editor";
import { CustomDriver, CustomDrivers } from "../../utilities/customDriver";

/**
 * The Database connection configuration with all the input that is needed for connecting to the database.
 *
 * @see https://docs.liquibase.com/concepts/connections/creating-config-properties.html
 */
export class DatabaseConnection {
  /**
   * Prefix for all reference key.
   */
  static readonly REFERENCE: string = "reference";

  /**
   * Marker for immer, so that this class is treated as an immerable class and produces immutable objects.
   */
  [immerable] = true;

  /**
   * Constructor for a database connection. This be never called outside the class, instead you should use the static methods.
   *
   * @param username - Username to connect to the target database.
   * @param password - Password to connect to the target database.
   * @param url - Specifies the database to use when making comparisons to the source database. Also known as the target. This is usually a jdbc url.
   * @param driver - Specifies the driver class name for the target database.
   * @param databaseType - The database type. This can be any type from the drivers. This will be later adjusted into `driver` and `classpath`, if a pre-configured driver was selected.
   */
  private constructor(
    public username: string,
    public password: string,
    public url: string,
    public driver: string,
    public databaseType: string
  ) {}

  /**
   * Clones an existing object to create a new one. This is needed after serialization and deserialization, because otherwise the methods will not be there.
   *
   * This method needs to be static, because after serialization and deserialization no methods of the class will be available,
   * and so this method would not be callable, when it is an class method.
   *
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
   *
   * @param defaultDatabaseForConfiguration - the default database configuration that should be selected
   * @returns the default DatabaseConnection
   */
  static createDefaultDatabaseConnection(defaultDatabaseForConfiguration: string): DatabaseConnection {
    return new DatabaseConnection("", "", "", "", defaultDatabaseForConfiguration);
  }

  /**
   * Transforms a key into a reference key. For instance `username` will be transformed to `referenceUsername`.
   *
   * @param key - the key which should be transformed into a reference key
   * @returns the reference key
   */
  static createReferenceKey(key: string): string {
    return this.REFERENCE + key.charAt(0).toUpperCase() + key.slice(1);
  }

  /**
   * Transforms a key, which was previously referenced, back into its normal state.
   *
   * @param key - the referenced key
   * @returns the normal key
   */
  static createDeReferencedKey(key: string): string {
    const keyWithoutReference = key.replace(this.REFERENCE, "");
    return keyWithoutReference.charAt(0).toLowerCase() + keyWithoutReference.slice(1);
  }

  /**
   * Trying to extract all the url parts from a database connection
   *
   * @param customDriver - the custom driver that should be used if the database type is not a pre-configured driver
   * @returns the url parts
   */
  extractUrlPartsFromDatabaseConfiguration(customDriver?: CustomDrivers): UrlParts {
    // find the driver for the database type
    const driver = PREDEFINED_DRIVERS.get(this.databaseType);
    if (driver) {
      // and extract the url parts
      return driver.extractUrlParts(this.url);
    }
    const customDriverConfiguration = customDriver?.[this.databaseType];

    if (customDriverConfiguration) {
      return new CustomDriver(customDriverConfiguration).extractUrlParts(this.url);
    }

    return {};
  }

  /**
   * Returns a value of an element.
   *
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
   *
   * @param pName - the name of the element that should be set
   * @param pValue - the value that should be set
   * @returns the updated element
   */
  setValue(pName: keyof DatabaseConnection, pValue: string): this {
    if (typeof this[pName] === "string") {
      (this[pName] as string) = pValue;
    }
    return this;
  }

  /**
   * Checks if any data is given.
   *
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
   * @param pDisguisePassword - if the password should not be displayed as plain text, but as `***`. These should be used if you are in a preview.
   */
  writeDataForConnection(
    properties: PropertiesEditor,
    pReferenceConnection: boolean,
    pDisguisePassword: boolean
  ): void {
    properties.insertComment(`configuration for the ${pReferenceConnection ? "reference " : ""}database`);

    for (const [key, value] of Object.entries(this)) {
      if (!(key && value && key !== "databaseType" && typeof value === "string")) {
        continue;
      }

      let usedValue: string = value;

      if (key === "password" && pDisguisePassword) {
        usedValue = "***";
      }

      properties.insert(pReferenceConnection ? DatabaseConnection.createReferenceKey(key) : key, usedValue);
    }

    this.writeDriverConfigurationAndDownload(properties, pReferenceConnection);
  }

  /**
   * Adjusts the driver after loading it from a properties file.
   * If the driver is from a pre-configured driver class, then the databaseType will be set to this pre-configured element,
   * in order to have it displayed more easily in the webview.
   *
   * @param value - the value of the current driver configuration
   */
  adjustDriver(value: string): void {
    let preConfiguredDriver = false;

    for (const [driverKey, driverValue] of PREDEFINED_DRIVERS) {
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

  /**
   * Writes the driver configuration to the properties file. If `pDownloadDriver` is given, the driver will also be downloaded, if it is not there.
   *
   * @param pProperties - the properties editor where the properties should be written
   * @param pIsReferenceConnection - information if this is the reference connection or not
   */
  private writeDriverConfigurationAndDownload(pProperties: PropertiesEditor, pIsReferenceConnection: boolean): void {
    const databaseType: string = this.databaseType;

    if (databaseType === NO_PRE_CONFIGURED_DRIVER) {
      return;
    }

    const databaseDriver: Driver | undefined = PREDEFINED_DRIVERS.get(databaseType);

    if (!databaseDriver) {
      return;
    }

    const driverKey: string = "driver";

    pProperties.insert(
      pIsReferenceConnection ? DatabaseConnection.createReferenceKey(driverKey) : driverKey,
      databaseDriver.driverClass
    );
  }
}
