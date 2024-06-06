/**
 * The possible type for any classpath.
 */
export type ClasspathType = ";" | ":";

/**
 * Returns the classpath separator based on OS of the user.
 *
 * @returns the classpath of the OS
 */
export function getClasspathSeparator(): ClasspathType {
  return isWindows() ? ";" : ":";
}

/**
 * Checks if the current OS is windows.
 *
 * @returns `true` if the current os is windows,  else `false`
 */
export function isWindows(): boolean {
  return process.platform === "win32";
}
