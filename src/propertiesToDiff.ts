import { readPossibleReferenceValues } from "./configuration/data/readFromProperties";
import { Logger } from "@aditosoftware/vscode-logging";

/**
 * Retrieves reference keys and values from a Liquibase properties file.
 *
 * @param propertyFilePath - The path to the Liquibase properties file.
 * @returns An array of strings representing reference keys and values, or undefined if an error occurs.
 */
export function getReferenceKeysFromPropertyFile(propertyFilePath: string | undefined): string[] | undefined {
  // Check if propertyFilePath is provided
  if (!propertyFilePath) {
    Logger.getLogger().error({ message: "No Reference File was found.", notifyUser: true });
    return;
  }

  try {
    return readPossibleReferenceValues(propertyFilePath);
  } catch (error) {
    // Show an error message if there is an issue reading the file
    Logger.getLogger().error({ message: "Error reading liquibase.properties:", error, notifyUser: true });
  }
}
