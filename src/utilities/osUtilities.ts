

/**
 * Checks if the current OS is windows.
 * @returns `true` if the current os is windows,  else `false`
 */
export function isWindows(): boolean {
    return process.platform === "win32";
}