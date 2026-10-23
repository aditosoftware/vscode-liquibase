import { getRequiredFiles } from "../../preparePrerequisites";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import fs from "node:fs";

const projectDirectory = path.join(__dirname, "..", "..", "..");
console.debug(`Project directory: ${projectDirectory}`);

const targetDirectory = path.join(projectDirectory, "out", "sbom");
console.log(`Target directory: ${targetDirectory}`);
fs.mkdirSync(targetDirectory, { recursive: true });

// copy liquibase extended jar
copyLiquibaseExtendedJar();

// download all required files and fail the pipeline step when the download was not successful
void downloadFiles();

/**
 * Copies the liquibase-extended-cli.jar from the project to the target directory.
 */
function copyLiquibaseExtendedJar(): void {
  const liquibaseExtendedJar = "liquibase-extended-cli.jar";

  const source = path.join(projectDirectory, "lib", liquibaseExtendedJar);
  const destination = path.join(targetDirectory, liquibaseExtendedJar);

  console.debug(`Copying ${source} to ${destination}`);
  fs.cpSync(source, destination);
}

/**
 * Downloads all required files from the maven repository.
 * Those files are also downloaded during the install process of the extension.
 */
async function downloadFiles(): Promise<void> {
  try {
    const files = getRequiredFiles();

    for (const [fileName, fileUrl] of files) {
      console.debug(`Downloading: ${fileName} from ${fileUrl}`);

      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Download failed (${fileName}): ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const targetPath = path.join(targetDirectory, fileName);
      await writeFile(targetPath, Buffer.from(arrayBuffer));

      console.debug(`Saved: ${targetPath}`);
    }
  } catch (error) {
    console.error(error);
    // fail the pipeline step
    process.exitCode = 1;
  }
}
