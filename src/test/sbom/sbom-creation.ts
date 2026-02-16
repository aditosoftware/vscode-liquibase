import { getRequiredFiles } from "../../preparePrerequisites";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import fs from "node:fs";

const projectDir = path.join(__dirname, "..", "..", "..");
console.debug(`Project directory: ${projectDir}`);

const targetDir = path.join(projectDir, "out", "sbom");
console.log(`Target directory: ${targetDir}`);
fs.mkdirSync(targetDir, { recursive: true });

// copy liquibase extended jar
copyLiquibaseExtendedJar();

downloadFiles().catch((err) => {
  console.error(err);
  process.exitCode = 1; // fail the pipeline step
});

/**
 * Copies the liquibase-extended-cli.jar from the project to the target directory.
 */
function copyLiquibaseExtendedJar(): void {
  const liquibaseExtendedJar = "liquibase-extended-cli.jar";

  const source = path.join(projectDir, "lib", liquibaseExtendedJar);
  const destination = path.join(targetDir, liquibaseExtendedJar);

  console.debug(`Copying ${source} to ${destination}`);
  fs.cpSync(source, destination);
}

/**
 * Downloads all required files from the maven repository.
 * Those files are also downloaded during the install process of the extension.
 */
async function downloadFiles(): Promise<void> {
  const files = getRequiredFiles();

  for (const [fileName, fileUrl] of files) {
    console.debug(`Downloading: ${fileName} from ${fileUrl}`);

    const res = await fetch(fileUrl);
    if (!res.ok) {
      throw new Error(`Download failed (${fileName}): ${res.status} ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const targetPath = path.join(targetDir, fileName);
    await writeFile(targetPath, Buffer.from(arrayBuffer));

    console.debug(`Saved: ${targetPath}`);
  }
}
