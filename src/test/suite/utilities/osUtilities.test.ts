import { getClasspathSeparator } from "../../../utilities/osUtilities";
import assert from "assert";

/**
 * Tests the os specific utitlies
 */
suite("osUtilities", () => {
  const initialPlatform = process.platform;

  /**
   * set process.platform back to the initial value
   */
  setup(() => {
    Object.defineProperty(process, "platform", { value: initialPlatform });
  });

  /**
   * set process.platform back to the initial value
   */
  teardown(() => {
    Object.defineProperty(process, "platform", { value: initialPlatform });
  });

  /**
   * Tests for the various platforms the separator
   */
  [
    {
      platform: "aix",
      classpath: ":",
    },
    {
      platform: "darwin",
      classpath: ":",
    },
    {
      platform: "freebsd",
      classpath: ":",
    },
    {
      platform: "linux",
      classpath: ":",
    },
    {
      platform: "openbsd",
      classpath: ":",
    },
    {
      platform: "sunos",
      classpath: ":",
    },
    {
      platform: "win32",
      classpath: ";",
    },
  ].forEach((pArguments) => {
    test(`should get classpath separator for ${pArguments.platform}`, () => {
      Object.defineProperty(process, "platform", { value: pArguments.platform });

      assert.strictEqual(getClasspathSeparator(), pArguments.classpath);
    });
  });
});
