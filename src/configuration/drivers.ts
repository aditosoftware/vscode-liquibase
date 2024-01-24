/**
 * Indicates that the selected driver was not pre-configured.
 */
export const NO_PRE_CONFIGURED_DRIVER = "NO_PRE_CONFIGURED_DRIVER";

/**
 * Class for pre-defining the drivers the users can preselect.
 */
export class Driver {
  /**
   * The class which is needed for creating the Liquibase file.
   */
  readonly driverClass: string;

  /**
   * The url for downloading the driver. This is only used in the prerequisites.
   */
  readonly urlForDownload: string;

  constructor(pDriverClass: string, pUrlForDownload: string) {
    this.driverClass = pDriverClass;
    this.urlForDownload = pUrlForDownload;
  }

  /**
   * Finds out the file name under which an existing driver would be downloaded.
   * @returns the file name under which the driver would be saved
   */
  public getFileName(): string {
    return this.urlForDownload.substring(this.urlForDownload.lastIndexOf("/") + 1);
  }
}

/**
 * All the pre-configured drivers.
 */
export const ALL_DRIVERS = new Map<string, Driver>([
  [
    // https://mvnrepository.com/artifact/org.mariadb.jdbc/mariadb-java-client
    "MariaDB",
    new Driver(
      "org.mariadb.jdbc.Driver",
      "https://repo1.maven.org/maven2/org/mariadb/jdbc/mariadb-java-client/2.5.3/mariadb-java-client-2.5.3.jar"
    ),
  ],
  [
    // https://mvnrepository.com/artifact/com.mysql/mysql-connector-j
    "MySQL",
    new Driver(
      "com.mysql.cj.jdbc.Driver",
      "https://repo1.maven.org/maven2/com/mysql/mysql-connector-j/8.2.0/mysql-connector-j-8.2.0.jar"
    ),
  ],

  [
    // https://mvnrepository.com/artifact/com.microsoft.sqlserver/mssql-jdbc
    "MS SQL",
    new Driver(
      "com.microsoft.sqlserver.jdbc.SQLServerDriver",
      "https://repo1.maven.org/maven2/com/microsoft/sqlserver/mssql-jdbc/12.2.0.jre11/mssql-jdbc-12.2.0.jre11.jar"
    ),
  ],
  [
    // https://mvnrepository.com/artifact/org.postgresql/postgresql
    "PostgreSQL",
    new Driver(
      "org.postgresql.Driver",
      "https://repo1.maven.org/maven2/org/postgresql/postgresql/42.6.0/postgresql-42.6.0.jar"
    ),
  ],
  [
    // https://mvnrepository.com/artifact/com.oracle.database.jdbc/ojdbc8
    "Oracle",
    new Driver(
      "oracle.jdbc.driver.OracleDriver",
      "https://repo1.maven.org/maven2/com/oracle/database/jdbc/ojdbc11/23.2.0.0/ojdbc11-23.2.0.0.jar"
    ),
  ],
]);
