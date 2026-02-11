import { PREDEFINED_DRIVERS } from "@aditosoftware/driver-dependencies";

/**
 * Gets all the required jar files that are needed for the execution of the extension.
 *
 * @returns - the required files with filename and url to download
 */
export function getRequiredFiles(): Map<string, string> {
  const requiredFiles = new Map<string, string>();

  // add the required jars for liquibase
  const dependencies = [
    "https://repo1.maven.org/maven2/org/liquibase/liquibase-core/4.28.0/liquibase-core-4.28.0.jar",
    // picocli for using the CLI commands,
    "https://repo1.maven.org/maven2/info/picocli/picocli/4.7.5/picocli-4.7.5.jar",
    // snakeyaml for handling yaml changelogs
    "https://repo1.maven.org/maven2/org/yaml/snakeyaml/2.2/snakeyaml-2.2.jar",
    // Gson for executing the extended CLI file
    "https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar",
    // commons-io is needed for 4.28 and onwards
    "https://repo1.maven.org/maven2/commons-io/commons-io/2.16.1/commons-io-2.16.1.jar",
    // commons-lang3 is needed for 4.28 and onwards
    "https://repo1.maven.org/maven2/org/apache/commons/commons-lang3/3.14.0/commons-lang3-3.14.0.jar",
    // opencsv is needed for 4.28 and onwards
    "https://repo1.maven.org/maven2/com/opencsv/opencsv/5.9/opencsv-5.9.jar",
  ];
  for (const pUrl of dependencies) {
    requiredFiles.set(getFileName(pUrl), pUrl);
  }

  // and add the jars for the drivers
  for (const value of PREDEFINED_DRIVERS.values()) {
    requiredFiles.set(getFileName(value.urlForDownload), value.urlForDownload);
  }

  return requiredFiles;
}

/**
 * Finds out the file name from the url downloaded.
 *
 * @param urlForDownload - the url where the element should be downloaded
 * @returns the file name under which the element would be saved
 */
function getFileName(urlForDownload: string): string {
  return urlForDownload.substring(urlForDownload.lastIndexOf("/") + 1);
}
