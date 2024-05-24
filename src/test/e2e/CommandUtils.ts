// TODO: wenn du neue Util-Methoden anlegen möchtest, bitte in LiquibaseGUITestUtils!

// TODO entfernen
/**
 * Waits a given time in order to have everything there.
 *
 * just wait, pls
 *
 * @param timeout - the number of milliseconds that should be waited.
 */
export async function wait(timeout: number = 2000): Promise<void> {
  await new Promise((r) => setTimeout(r, timeout));
}
