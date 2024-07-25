import {
  InputBase,
  InputBaseOptions,
  OpenDialog,
  InputBox,
  QuickPick,
  handleMultiStepInput,
} from "@aditosoftware/vscode-input";
import { getWorkFolder } from "./handleChangelogFileInput";
import * as vscode from "vscode";
import { createBasicArgsForLiquibaseCLI, executeJarAsync } from "./executeJar";
import { Logger } from "@aditosoftware/vscode-logging";

const inputKey = "input";
const outputKey = "output";
const formatKey = "format";
const databaseTypeKey = "databaseType";

/**
 * Handles the converting from one format to another
 *
 * @param convertFile - `true`, if the file should be converted, `false`, if the folder should be converted
 * @param selectedFile - the file that was selected by the right click menu
 */
export async function convertFormats(convertFile: boolean, selectedFile?: vscode.Uri): Promise<void> {
  const inputElements: InputBase<InputBaseOptions>[] = [
    new OpenDialog({
      name: inputKey,
      openDialogOptions: {
        canSelectFiles: convertFile,
        canSelectFolders: !convertFile,
        defaultUri: vscode.Uri.file(getWorkFolder()),
        openLabel: `Select the ${convertFile ? "file" : "folder"} to convert`,
        filters: {
          Changelog: ["json", "sql", "xml", "yml", "yaml"],
          "All Files": ["*"],
        },
      },
      onBeforeInput: () => {
        return typeof selectedFile === "undefined";
      },
    }),
    new OpenDialog({
      name: outputKey,
      openDialogOptions: {
        canSelectFiles: false,
        canSelectFolders: true,
        defaultUri: vscode.Uri.file(getWorkFolder()),
        openLabel: "Select the output location",
      },
    }),
    new QuickPick({
      name: formatKey,
      placeHolder: "The new format for your changelogs",
      allowMultiple: false,
      generateItems: () => {
        return [{ label: "JSON" }, { label: "SQL" }, { label: "XML" }, { label: "YAML" }] as vscode.QuickPickItem[];
      },
    }),

    new InputBox({
      name: databaseTypeKey,
      inputBoxOptions: {
        placeHolder: "The database type for your new SQL files, e.g. mariadb, mssql, postgresql, ...",
      },
      onBeforeInput: (dialogValues) => {
        return dialogValues.inputValues.get(formatKey)?.[0] === "SQL";
      },
    }),
  ];

  const dialogValues = await handleMultiStepInput("Convert your changelogs to a new format", inputElements);

  if (dialogValues) {
    const input = selectedFile?.fsPath ?? dialogValues.inputValues.get(inputKey)?.[0];
    const output = dialogValues.inputValues.get(outputKey)?.[0];
    const format = dialogValues.inputValues.get(formatKey)?.[0];
    const databaseType = dialogValues.inputValues.get(databaseTypeKey)?.[0];

    if (input && output && format) {
      await convertToNewFormat(input, output, format, databaseType);
    }
  }
}

/**
 * Converts the given input to the new output format.
 *
 * @param input - the given input path
 * @param output - the given output path
 * @param format - the new format
 * @param databaseType - the database type. This is only given, when the format is SQL.
 */
async function convertToNewFormat(input: string, output: string, format: string, databaseType?: string): Promise<void> {
  const args = [...createBasicArgsForLiquibaseCLI(), "convert", "--format", format, input, output];

  if (databaseType) {
    args.push(...["--database-type", databaseType]);
  }

  const result = await executeJarAsync(
    `Converting to ${format}`,
    `Converting the changelogs to ${format}`,
    args,
    [0, 3]
  );

  switch (result) {
    case 0:
      // everything was successful
      vscode.window
        .showInformationMessage(
          `Converting the changelogs to ${format} was executed successfully. Please check the files for correctness.`,
          {},
          "Show log"
        )
        .then(
          (result) => {
            if (result === "Show log") {
              Logger.getLogger().showOutputChannel();
            }
          },
          (error) => Logger.getLogger().error({ message: `error showing success message`, error })
        );
      break;
    case 3:
      // some files were not successful
      Logger.getLogger().showOutputChannel();
      Logger.getLogger().warn({
        message: "Converting the changelogs was partly successful. Please check files and the error log.",
        notifyUser: true,
      });
      break;
  }
}
