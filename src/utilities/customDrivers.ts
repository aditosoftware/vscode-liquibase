import path from "path";
import fs from "fs";
import { resourcePath } from "../extension";

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
 * Get all custom drivers from the resource folder.
 *
 * @returns the custom drivers as a JSON string.
 */
export function getCustomDrivers(): CustomDrivers {
  const customDriverObject: CustomDrivers = {};
  fs.readdirSync(resourcePath).forEach((file) => {
    if (file.includes(".json")) {
      const fileContent = fs.readFileSync(path.join(resourcePath, file), { encoding: "utf-8" });
      const driver = JSON.parse(fileContent);

      if (driver.driverClass && driver.defaultPort && driver.jdbcName && driver.separator) {
        customDriverObject[driver.name] = {
          driverClass: driver.driverClass,
          port: driver.defaultPort,
          jdbcName: driver.jdbcName,
          separator: driver.separator,
        } as CustomDriverData;
      }
    }
  });

  return customDriverObject;
}
