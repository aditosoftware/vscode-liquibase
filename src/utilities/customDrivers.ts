import path from "path";
import fs from "fs";
import { resourcePath } from "../extension";

/**
 * Get all custom drivers from the resource folder.
 * 
 * @returns the custom drivers as JSON string
 */
export function getCustomDrivers(): string {
  const customDriversJson: { [key: string]: { driver: string, port: number, jdbcName: string, separator: string} } = {}; 
  fs.readdirSync(resourcePath).forEach(file => {
    if (file.includes(".json")) {
      const fileContent = fs.readFileSync(path.join(resourcePath, file), { encoding: 'utf-8' });
      const driver = JSON.parse(fileContent);

      if (driver.driverClass && driver.defaultPort && driver.jdbcName && driver.seperator) {
        customDriversJson[driver.name] = {
          driver: driver.driverClass,
          port: driver.defaultPort,
          jdbcName: driver.jdbcName,
          separator: driver.separator
        };
      }
    }
  });

  return JSON.stringify(customDriversJson);
}