import path from "node:path";
import fs from "node:fs";
import { resourcePath } from "../extension";
import { CustomDrivers, CustomDriverData } from "./customDriver";

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
