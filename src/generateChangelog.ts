import path from 'path';
import { DialogValues } from './input';
import { openDocument } from './utilities/vscodeUtilities';
// TODO filename

/**
 * Generates the command line arguments for `generate changelog`.
 * This will include the new changelog-file from the user input. 
 * @param dialogValues - the dialog values
 * @returns the generated command line arguments
 */
export function generateCommandLineArgs(dialogValues: DialogValues) {
    const fullPathToChangelog = generateChangelogFilePath(dialogValues);

    if (fullPathToChangelog) {
        return [`--changelog-file=${fullPathToChangelog}`];
    }
}

/**
 * Opens the created file after the command was executed.
 * @param dialogValues - the dialog values
 */
export async function openFileAfterCommandExecution(dialogValues: DialogValues) {
    const fullPathToChangelog = generateChangelogFilePath(dialogValues);
    if (fullPathToChangelog) {
        await openDocument(fullPathToChangelog);
    }
}

/**
 * Generates the file with the folder selection and the file ending for further commands.
 * 
 * // TODO: file ending xml is the only working, find out why 
 * 
 * @param dialogValues - the dialog values
 * @returns the generated file path
 */
function generateChangelogFilePath(dialogValues: DialogValues): string | undefined {
    const folder = dialogValues.inputValues.get("folderSelection")?.[0];
    const name = dialogValues.inputValues.get("fileName")?.[0];

    if (folder && name) {
        return path.join(folder, name.endsWith(".xml") ? name : name + ".xml");
    }
}