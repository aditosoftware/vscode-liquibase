import {
  Driver,
  buildDatabaseNameBySeparator,
  extractDatabaseNameBySeparator,
  extractParameters,
} from "@aditosoftware/driver-dependencies";

/**
 * Interface for the custom drivers.
 */
export interface CustomDrivers {
  /**
   * The driver data.
   */
  [key: string]: CustomDriverData;
}

/**
 * Interface for the custom driver data.
 *
 */
export interface CustomDriverData {
  /**
   * The driver class.
   */
  driverClass: string;

  /**
   * The default port.
   */
  port: number;

  /**
   * The jdbc name.
   */
  jdbcName: string;

  /**
   * The separator.
   */
  separator: string;
}

/**
 * Custom driver class for drivers that are not pre-configured.
 */
export class CustomDriver extends Driver {
  /**
   * The class which is needed for creating the Liquibase file.
   */
  declare readonly driverClass;

  /**
   * The default port of the driver.
   */
  declare readonly port;

  /**
   * The jdbc name of the driver.
   */
  declare readonly jdbcName;

  /**
   * The separator for the jdbc url.
   */
  declare readonly separator;

  /**
   * Constructor. This will create a custom driver with default URL-builder.
   *
   * @param pCustomDriver - the custom driver data
   */
  constructor(pCustomDriver: CustomDriverData) {
    super(
      pCustomDriver.driverClass,
      "",
      pCustomDriver.jdbcName,
      pCustomDriver.port,
      pCustomDriver.driverClass,
      extractDatabaseNameBySeparator,
      buildDatabaseNameBySeparator,
      extractParameters
    );
  }
}
