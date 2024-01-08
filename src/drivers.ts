// TODO dynamic links

/**
 * Indicates that the selected driver was not pre-configured.
 */
export const NO_PRE_CONFIGURED_DRIVER = "NO_PRE_CONFIGURED_DRIVER";

/**
 * Class for pre-defining the drivers the users can preselect.
 */
export class Driver {
  readonly displayName: string;
  readonly driverClass: string;
  readonly urlForDownload: string;

  /**
   * Constructor.
   * @param pDisplayname - the display name that should be visible for the user
   * @param pDriverClass - the class which is needed for creating the Liquibase file
   * @param pUrlForDownload - the url for downloading the driver
   */
  constructor(pDisplayname: string, pDriverClass: string, pUrlForDownload: string) {
    this.displayName = pDisplayname;
    this.driverClass = pDriverClass;
    this.urlForDownload = pUrlForDownload;
  }

  /**
   * Finds out the file name under which an existing driver would be downloaded.
   * @returns the file name under which the driver would be saved
   */
  public getFileName(): string {
    return this.urlForDownload.substring(this.urlForDownload.lastIndexOf("/"));
  }
}

/**
 * All the pre-configured drivers.
 */
export const ALL_DRIVERS = new Map<string, Driver>([
  [
    "MARIADB",
    new Driver(
      "MariaDB",
      "org.mariadb.jdbc.Driver",
      "https://repo1.maven.org/maven2/org/mariadb/jdbc/mariadb-java-client/3.3.2/mariadb-java-client-3.3.2.jar"
    ),
  ],
  [
    "MYSQL",
    new Driver(
      // TODO correct?
      "MySQL",
      "org.mariadb.jdbc.Driver",
      "https://repo1.maven.org/maven2/org/mariadb/jdbc/mariadb-java-client/3.3.2/mariadb-java-client-3.3.2.jar"
    ),
  ],
]);
