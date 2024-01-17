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
    return this.urlForDownload.substring(this.urlForDownload.lastIndexOf("/") + 1);
  }
}

// TODO all the driver names / Keys and NO_PRE_CONFIGURED_DRIVER are duplicated in the settings

/**
 * All the pre-configured drivers.
 */
export const ALL_DRIVERS = new Map<string, Driver>([
  [
    // https://mvnrepository.com/artifact/org.mariadb.jdbc/mariadb-java-client
    "MARIADB",
    new Driver(
      "MariaDB",
      "org.mariadb.jdbc.Driver",
      "https://repo1.maven.org/maven2/org/mariadb/jdbc/mariadb-java-client/2.5.3/mariadb-java-client-2.5.3.jar"
    ),
  ],
  [
    // https://mvnrepository.com/artifact/com.mysql/mysql-connector-j
    "MYSQL",
    new Driver(
      "MySQL",
      "com.mysql.cj.jdbc.Driver",
      "https://repo1.maven.org/maven2/com/mysql/mysql-connector-j/8.2.0/mysql-connector-j-8.2.0.jar"
    ),
  ],

  [
    // https://mvnrepository.com/artifact/com.microsoft.sqlserver/mssql-jdbc
    // TODO jre8 oder jre11?
    "MSSQL",
    new Driver(
      "MS SQL",
      "com.microsoft.sqlserver.jdbc.SQLServerDriver",
      "https://repo1.maven.org/maven2/com/microsoft/sqlserver/mssql-jdbc/12.4.2.jre11/mssql-jdbc-12.4.2.jre11.jar"
    ),
  ],
  [
    // https://mvnrepository.com/artifact/org.postgresql/postgresql
    "POSTGRESQL",
    new Driver(
      "PostgreSQL",
      "org.postgresql.Driver",
      "https://repo1.maven.org/maven2/org/postgresql/postgresql/42.7.1/postgresql-42.7.1.jar"
    ),
  ],
  [
    // https://mvnrepository.com/artifact/com.oracle.database.jdbc/ojdbc8
    // TODO Version?
    "ORACLE",
    new Driver(
      "Oracle",
      "oracle.jdbc.driver.OracleDriver",
      "https://repo1.maven.org/maven2/com/oracle/database/jdbc/ojdbc8/23.3.0.23.09/ojdbc8-23.3.0.23.09.jar"
    ),
  ],
]);
