// TODO dynamic links

export const NO_PRE_CONFIGURED_DRIVER = "NO_PRE_CONFIGURED_DRIVER";

export const ALL_DRIVERS = new Map<string, Driver>([
  [
    "MARIADB",
    {
      displayName: "MariaDB",
      driverClass: "org.mariadb.jdbc.Driver",
      urlToClass:
        "https://repo1.maven.org/maven2/org/mariadb/jdbc/mariadb-java-client/3.3.2/mariadb-java-client-3.3.2.jar",
    },
  ],
  [
    "MYSQL",
    {
      // TODO correct?
      displayName: "MySQL",
      driverClass: "org.mariadb.jdbc.Driver",
      urlToClass:
        "https://repo1.maven.org/maven2/org/mariadb/jdbc/mariadb-java-client/3.3.2/mariadb-java-client-3.3.2.jar",
    },
  ],
]);

interface Driver {
  displayName: string;
  driverClass: string;
  urlToClass: string;
}
