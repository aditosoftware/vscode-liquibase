import * as vscode from 'vscode';
import * as fs from 'fs';

/**
 * Retrieves reference keys and values from a Liquibase properties file.
 *
 * @param propertyFilePath - The path to the Liquibase properties file.
 * @returns An array of strings representing reference keys and values, or undefined if an error occurs.
 */
export function getReferenceKeysFromPropertyFile(propertyFilePath: string): string[] | undefined {
    // Get the path to the Liquibase properties file

    // Check if propertyFilePath is provided
    if (!propertyFilePath) {
        vscode.window.showErrorMessage('No Reference File was found.');
        return;
    }

    try {
        // Read the content of the file
        const fileContent = fs.readFileSync(propertyFilePath, 'utf-8');

        // Parse the content and extract values
        const lines = fileContent.split('\n');
        const values: string[] = [];

        //TODO: seperate Method to read the file -> also needed for readChangelogFile!
        // Iterate through each line in the file
        for (const line of lines) {
            const keyValue = line.split(': ');

            // Check if the line has key-value pair format
            if (keyValue.length === 2) {
                const key = keyValue[0].trim();
                const value = keyValue[1].trim();

                // Format the key and exclude "classpath" key
                const formattedKey = `--reference-${key}`;
                if (key !== "classpath") { //TODO: filter for only neccessary values -> don't exclude just include what is needed
                    values.push(`${formattedKey}=${value}`);
                }
            }
        }

        return values;
    } catch (error) {
        // Show an error message if there is an issue reading the file
        vscode.window.showErrorMessage(`Error reading liquibase.properties: ${error}`);
    }
}
