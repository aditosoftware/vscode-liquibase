import { UrlParts } from "./data/UrlParts";

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

  /**
   * The jdbc name of the driver.
   */
  readonly jdbcName: string;

  /**
   * The default port of the driver.
   */
  readonly port: number;

  /**
   * The separator for the jdbc url.
   */
  readonly separator: string;

  /**
   * Constructor.
   *
   * @param pDriverClass - The class which is needed for creating the Liquibase file.
   * @param pUrlForDownload - The url for downloading the driver. This is only used in the prerequisites.
   * @param jdbcName - The jdbc name of the driver.
   * @param port - The default port of the driver.
   * @param separator - The separator for the jdbc url.
   * @param extractDatabaseNameFromUrl - the function that will be used for extracting the database name from the url.
   * Not all drivers have the database name separated only by the separator, therefore a custom function is needed.
   * @param buildDatabaseName - the function that will build that database name, so it can be added to the url. This should also add the separator to the return value.
   * Not all drivers have the database name separated only by the separator, therefore a custom function is needed.
   * @param extractParameters - the function that will extract all additional parameters from the given url and return them.
   * This should not include the database name, because it will be extracted and added in a other way.
   */
  constructor(
    pDriverClass: string,
    pUrlForDownload: string,
    jdbcName: string,
    port: number,
    separator: string,
    private readonly extractDatabaseNameFromUrl: (url: string, driver: Driver) => DatabaseNameExtraction,
    private readonly buildDatabaseName: (driver: Driver, databaseName: string) => string,
    private readonly extractParameters: (oldUrl: string) => string
  ) {
    this.driverClass = pDriverClass;
    this.urlForDownload = pUrlForDownload;
    this.jdbcName = jdbcName;
    this.port = port;
    this.separator = separator;
    this.extractDatabaseNameFromUrl = extractDatabaseNameFromUrl;
    this.buildDatabaseName = buildDatabaseName;
    this.extractParameters = extractParameters;
  }

  /**
   * Finds out the file name under which an existing driver would be downloaded.
   *
   * @returns the file name under which the driver would be saved
   */
  getFileName(): string {
    return this.urlForDownload.substring(this.urlForDownload.lastIndexOf("/") + 1);
  }

  /**
   * Extract the url parts of a given url.
   *
   * @param url - the url whose parts should be extracted
   * @returns the parts of the url
   */
  extractUrlParts(url: string): UrlParts {
    // removes the jdbc name from the url
    const urlToCheck = url.replace(this.jdbcName, "");

    // extract the database name
    const databaseNameExtraction = this.extractDatabaseNameFromUrl(urlToCheck, this);

    // take the url without the database name and splits by :
    const parts = urlToCheck.substring(0, databaseNameExtraction.index).split(":");

    if (parts.length === 2) {
      // extract server address and port from the parts, if there were the right amount of parts
      const serverAddress = parts[0];
      const port = parseInt(parts[1]);

      return {
        serverAddress,
        port,
        databaseName: databaseNameExtraction.databaseName,
      };
    } else {
      // otherwise, just return the port
      return { port: this.port };
    }
  }

  /**
   * Builds an jdbc url from the given url parts.
   *
   * @param oldUrl - any old url where parameters should be preserved
   * @param newValues - the new values from the user input.
   * @param serverAddress - the old input value from the server address input. This will be used as a fallback, if in `newValues` is no corresponding element.
   * @param port - the old input value from the port input. This will be used as a fallback, if in `newValues` is no corresponding element.
   * @param databaseName - the old input value from the database name input. This will be used as a fallback, if in `newValues` is no corresponding element.
   * @returns the built url
   */
  buildUrl(
    oldUrl: string | undefined,
    newValues: UrlParts,
    serverAddress: string,
    port: number,
    databaseName: string
  ): string {
    // extract parameters from the old url
    let parameters = "";
    if (oldUrl) {
      parameters = this.extractParameters(oldUrl);
    }

    // build the database name for the the driver
    const builtDatabaseName = this.buildDatabaseName(this, newValues.databaseName ?? databaseName);

    // and build the url
    return `${this.jdbcName}${newValues.serverAddress ?? serverAddress}:${
      newValues.port ?? port
    }${builtDatabaseName}${parameters}`;
  }
}

/**
 * The data that should be returned by the function that extracts the database name.
 */
interface DatabaseNameExtraction {
  /**
   * The index where the database name starts.
   * This will be later used to remove the database name from the jdbc url and work with the rest.
   */
  index: number;

  /**
   * The database name that was extracted from the jdbc url.
   */
  databaseName: string;
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
      "https://repo1.maven.org/maven2/org/mariadb/jdbc/mariadb-java-client/2.5.3/mariadb-java-client-2.5.3.jar",
      "jdbc:mariadb://",
      3306,
      "/",
      extractDatabaseNameBySeparator,
      buildDatabaseNameBySeparator,
      extractParameters
    ),
  ],

  [
    // https://mvnrepository.com/artifact/com.mysql/mysql-connector-j
    "MySQL",
    new Driver(
      "com.mysql.cj.jdbc.Driver",
      "https://repo1.maven.org/maven2/com/mysql/mysql-connector-j/8.2.0/mysql-connector-j-8.2.0.jar",
      "jdbc:mysql://",
      3306,
      "/",
      extractDatabaseNameBySeparator,
      buildDatabaseNameBySeparator,
      extractParameters
    ),
  ],

  [
    // https://mvnrepository.com/artifact/com.microsoft.sqlserver/mssql-jdbc
    "MS SQL",
    new Driver(
      "com.microsoft.sqlserver.jdbc.SQLServerDriver",
      "https://repo1.maven.org/maven2/com/microsoft/sqlserver/mssql-jdbc/12.2.0.jre11/mssql-jdbc-12.2.0.jre11.jar",
      "jdbc:sqlserver://",
      1443,
      ";",
      extractDatabaseNameForMsSQL,
      buildDatabaseNameForMsSQL,
      extractParametersForMsSQL
    ),
  ],

  [
    // https://mvnrepository.com/artifact/org.postgresql/postgresql
    "PostgreSQL",
    new Driver(
      "org.postgresql.Driver",
      "https://repo1.maven.org/maven2/org/postgresql/postgresql/42.6.0/postgresql-42.6.0.jar",
      "jdbc:postgresql://",
      5432,
      "/",
      extractDatabaseNameBySeparator,
      buildDatabaseNameBySeparator,
      extractParameters
    ),
  ],

  [
    // https://mvnrepository.com/artifact/com.oracle.database.jdbc/ojdbc8
    "Oracle",
    new Driver(
      "oracle.jdbc.driver.OracleDriver",
      "https://repo1.maven.org/maven2/com/oracle/database/jdbc/ojdbc11/23.2.0.0/ojdbc11-23.2.0.0.jar",
      "jdbc:oracle:thin:@",
      1521,
      ":",
      extractDatabaseNameBySeparator,
      buildDatabaseNameBySeparator,
      extractParameters
    ),
  ],
]);

/**
 * Extracts the database name of an url by the separator of the driver.
 *
 * @param url - the given url
 * @param driver - the driver for which the extraction should be done
 * @returns the extracted database name
 */
function extractDatabaseNameBySeparator(url: string, driver: Driver): DatabaseNameExtraction {
  // find out where last occurrence of the separator is...
  const separatorIndex = url.lastIndexOf(driver.separator);

  // ... and extract the database name from it
  let databaseName = url.substring(separatorIndex + 1);
  if (databaseName.includes("?")) {
    // remove any parameters from the database name
    databaseName = databaseName.substring(0, databaseName.indexOf("?"));
  }

  return { index: separatorIndex, databaseName };
}

/**
 * Builds the database name, so it can be added to the url.
 * This will have the separator in front of the name.
 *
 * @param driver - the driver which has the separator
 * @param databaseName - the name of the database
 * @returns the name of the database with the separator
 */
function buildDatabaseNameBySeparator(driver: Driver, databaseName: string): string {
  return `${driver.separator}${databaseName}`;
}

/**
 * Extracts the parameters by the separator `?`.
 * If there are no parameters, then an empty string will be returned.
 *
 * @param oldUrl - the url where the parameters should be extracted
 * @returns the parameters with the separator `?`
 */
function extractParameters(oldUrl: string): string {
  if (oldUrl.includes("?")) {
    return oldUrl.substring(oldUrl.indexOf("?"));
  }
  return "";
}

/**
 * Extracts the database name for MS SQL. This has the database name not separated by an separator, but with an argument.
 *
 * Example url: `jdbc:sqlserver://hostname:port;databaseName=database_name;parameter1=value1;parameter2=value2`
 *
 * @param url - the given url
 * @param driver - the driver for which the extraction should be done
 * @returns the extracted database name
 */
function extractDatabaseNameForMsSQL(url: string, driver: Driver): DatabaseNameExtraction {
  const parameterSeparatorIndex = url.indexOf(";");
  // get all parameters of the url (which should include the database name)
  const parameters = url.substring(parameterSeparatorIndex + 1);

  // filter the parameters to find out the database name
  const databaseName = parameters
    .split(driver.separator)
    // find the parameter that starts with databaseName
    .filter((pParameter) => pParameter.startsWith("databaseName"))
    // extract the value of the parameter
    .map((pParameter) => pParameter.substring(pParameter.indexOf("=") + 1))
    .join("");

  return { index: parameterSeparatorIndex, databaseName };
}

/**
 * Builds the database name for MS SQL, so it can be added to the url.This has the database name not separated by an separator, but with an argument.
 *
 * @param driver - the driver which is currently building the database name
 * @param databaseName - the name of the database
 * @returns the name of the database for MS SQL
 */
function buildDatabaseNameForMsSQL(driver: Driver, databaseName: string): string {
  return `${driver.separator}databaseName=${databaseName}`;
}

/**
 * Extracts the parameters for MS SQL. These parameters are separated by `;` and can be in any number.
 * Also the parameters can include the databaseName, which should not be extracted.
 *
 * @param oldUrl - the url where the parameters should be extracted
 * @returns the parameters starting with `;`. If there are no parameters, then an empty string will be returned.
 */
function extractParametersForMsSQL(oldUrl: string): string {
  if (oldUrl.includes(";")) {
    const allParameters = oldUrl.substring(oldUrl.indexOf(";") + 1);

    const newParameters = allParameters
      .split(";")
      .filter((parameter) => !parameter.startsWith("databaseName"))
      .join(";");

    if (newParameters) {
      return ";" + newParameters;
    }
  }
  return "";
}
