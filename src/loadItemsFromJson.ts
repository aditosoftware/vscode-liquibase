import * as vscode from "vscode";
import * as fs from "fs";

/**
 * Interface for the JSON-Settings-File
 */
export interface DropdownItem {
  label: string;
  description: string;
  path: string;
}

/**
 * Load the Items from the JSON-File
 * @param jsonFilePath - The path to the JSON file containing dropdown items.
 * @returns An array of QuickPickItem objects loaded from the JSON file.
 */
export function loadItemsFromJson(jsonFilePath: string): vscode.QuickPickItem[] {
  try {
    // Read the content of the JSON file synchronously
    const data = fs.readFileSync(jsonFilePath, "utf8");

    // Parse the JSON content into an object
    const jsonContent = JSON.parse(data);

    // Convert the JSON object into an array of QuickPickItem objects
    return Object.keys(jsonContent).map((key) => {
      const item = jsonContent[key] as DropdownItem;
      return { label: item.label, description: item.description, path: item.path };
    });
  } catch (error) {
    // Handle errors, log them, and return an empty array
    console.error("Error reading JSON file:", error);
    return [];
  }
}
