import * as vscode from "vscode";
import * as fs from "fs";
import { readConfiguration } from "./handleLiquibaseSettings";
import { getReferenceKeysFromPropertyFile } from "./propertiesToDiff";

/**
 * Interface for the JSON-Settings-File
 */
export interface DropdownItem {
  label: string;
  description: string;
  path: string;
}

/**
 * Load the Items from the JSON-File. // TODO better name, move to other file?
 * @returns An array of QuickPickItem objects loaded from the JSON file.
 */
export async function loadItemsFromJson(): Promise<vscode.QuickPickItem[]> {
  try {
    const jsonContent = await readConfiguration();

    if (jsonContent) {
      return Object.keys(jsonContent).map((key) => {
        const item = jsonContent[key];
        return {
          label: key,
          description: "", // TODO description verwenden? vorher war das jdbc-url, aber will man das file parsen?
          path: item,
        };
      });
    }
  } catch (error) {
    // Handle errors, log them, and return an empty array
    console.error("Error reading JSON file:", error);
  }
  return [];
}
