import * as vscode from 'vscode';
import * as fs from 'fs';
import path from 'path';

export function getReferenceKeysFromPropertyFile(propertyFilePath: string): string[] | undefined {
    // Get the path to the liquibase.properties file

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

        for (const line of lines) {
            const keyValue = line.split(': ');
            if (keyValue.length === 2) {
                const key = keyValue[0].trim();
                const value = keyValue[1].trim();
                const formattedKey = `--reference-${key}`;
                if(key !== "classpath")
                {
                    values.push(`${formattedKey}=${value}`);
                }
            }
        }

        return values;
    } catch (error) {
        vscode.window.showErrorMessage(`Error reading liquibase.properties: ${error}`);
    }
}
