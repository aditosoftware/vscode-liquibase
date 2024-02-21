import { UrlParts } from "./data/UrlParts";

/**
 * Indicates that the selected driver was not pre-configured.
 */
export const NO_PRE_CONFIGURED_DRIVER = "NO_PRE_CONFIGURED_DRIVER";

// TODO TSDOC
interface DatabaseNameExtraction {
  index: number;
  databaseName: string;
}

type DatabaseNameExtractType = (url: string, driver: Driver) => DatabaseNameExtraction;

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

  private readonly extractDatabaseNameFromUrl: DatabaseNameExtractType;

  constructor(
    pDriverClass: string,
    pUrlForDownload: string,
    jdbcName: string,
    port: number,
    separator: string,
    extractDatabaseNameFromUrl: DatabaseNameExtractType,
    private buildDatabaseType: (driver: Driver, databaseName: string) => string,
    private extractParameters: (oldUrl: string) => string
  ) {
    this.driverClass = pDriverClass;
    this.urlForDownload = pUrlForDownload;
    this.jdbcName = jdbcName;
    this.port = port;
    this.separator = separator;
    this.extractDatabaseNameFromUrl = extractDatabaseNameFromUrl;
    this.buildDatabaseType = buildDatabaseType;
    this.extractParameters = extractParameters;
  }

  /**
   * Finds out the file name under which an existing driver would be downloaded.
   * @returns the file name under which the driver would be saved
   */
  getFileName(): string {
    return this.urlForDownload.substring(this.urlForDownload.lastIndexOf("/") + 1);
  }

  // TODO TSDoc
  extractUrlParts(url: string): UrlParts {
    const urlToCheck = url.replace(this.jdbcName, "");

    const databaseNameExtraction = this.extractDatabaseNameFromUrl(urlToCheck, this);

    // take the url without the database name and splits by :
    const parts = urlToCheck.substring(0, databaseNameExtraction.index).split(":");

    if (parts.length === 2) {
      // extract server address and port from the parts
      const serverAddress = parts[0];
      const port = parseInt(parts[1]);

      return {
        serverAddress,
        port,
        databaseName: databaseNameExtraction.databaseName,
      };
    } else {
      return { port: this.port };
    }
  }

  // TODO TSDoc
  buildUrl(
    oldUrl: string | undefined,
    newValues: UrlParts,
    serverAddress: string,
    port: number,
    databaseName: string
  ): string {
    let parameters = "";
    // const oldUrl = pProperties.databaseConnection?.url;
    if (oldUrl) {
      parameters = this.extractParameters(oldUrl);
      console.log(parameters);
    }

    const builtDatabaseType = this.buildDatabaseType(this, newValues.databaseName ?? databaseName);

    const url = `${this.jdbcName}${newValues.serverAddress ?? serverAddress}:${
      newValues.port ?? port
    }${builtDatabaseType}${parameters}`;

    return url;
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
      "https://repo1.maven.org/maven2/org/mariadb/jdbc/mariadb-java-client/2.5.3/mariadb-java-client-2.5.3.jar",
      "jdbc:mariadb://",
      3306,
      "/",
      extractUrlBySeparator,
      buildDatabaseTypeBySeparator,
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
      extractUrlBySeparator,
      buildDatabaseTypeBySeparator,
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
      "/",
      extractUrlForMsSQL,
      buildDatabaseTypeForMsSQL,
      extractParametersForMsSQL
      // TODO"jdbc:sqlserver://localhost:1433;databaseName=data"
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
      extractUrlBySeparator,
      buildDatabaseTypeBySeparator,
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
      extractUrlBySeparator,
      buildDatabaseTypeBySeparator,
      extractParameters
    ),
  ],
]);

function extractUrlBySeparator(url: string, driver: Driver): DatabaseNameExtraction {
  const urlToCheck = url.replace(driver.jdbcName, "");

  // find out where last occurrence of the separator is...
  const separatorIndex = urlToCheck.lastIndexOf(driver.separator);
  // ... and extract the database name from it
  let databaseName = urlToCheck.substring(separatorIndex + 1);
  if (databaseName.includes("?")) {
    // remove any parameters from the url
    databaseName = databaseName.substring(0, databaseName.indexOf("?"));
  }

  return { index: separatorIndex, databaseName };
}

function buildDatabaseTypeBySeparator(driver: Driver, databaseName: string): string {
  return `${driver.separator}${databaseName}`;
}

function extractParameters(oldUrl: string): string {
  if (oldUrl.includes("?")) {
    return oldUrl.substring(oldUrl.indexOf("?"));
  }
  return "";
}

function extractUrlForMsSQL(url: string, driver: Driver): DatabaseNameExtraction {
  const urlToCheck = url.replace(driver.jdbcName, "");

  const parameterSeparatorIndex = urlToCheck.indexOf(";");
  const parameters = urlToCheck.substring(parameterSeparatorIndex + 1);

  const databaseName = parameters
    .split(";")
    .filter((pParameter) => pParameter.startsWith("databaseName"))
    .map((pParameter) => pParameter.substring(pParameter.indexOf("=") + 1))
    .join("");

  return { index: parameterSeparatorIndex, databaseName };
}

// function buildUrl(url: string, index: number, databaseName: string, defaultPort: number): UrlParts {
//   // take the url without the database name and splits by :
//   const parts = url.substring(0, index).split(":");

//   if (parts.length === 2) {
//     // extract server address and port from the parts
//     const serverAddress = parts[0];
//     const port = parseInt(parts[1]);

//     return {
//       serverAddress,
//       port,
//       databaseName,
//     };
//   } else {
//     return { port: defaultPort };
//   }
// }

function buildDatabaseTypeForMsSQL(driver: Driver, databaseName: string): string {
  return `;databaseName=${databaseName}`;
}

function extractParametersForMsSQL(oldUrl: string): string {
  if (oldUrl.includes(";")) {
    const allParameters = oldUrl.substring(oldUrl.indexOf(";") + 1);

    return (
      ";" +
      allParameters
        .split(";")
        .filter((parameter) => !parameter.startsWith("databaseName"))
        .join(";")
    );
  }
  return "";
}
