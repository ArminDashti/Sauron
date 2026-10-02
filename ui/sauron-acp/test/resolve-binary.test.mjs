import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import test from "node:test";
import { isAbsolute, join, relative, resolve } from "node:path";

import * as publicApi from "../dist/index.js";
import { resolveSauronBinaryForRuntime } from "../dist/resolve-binary.js";

const supportedPlatforms = [
  ["darwin", "arm64", "@aaif/sauron-binary-darwin-arm64", "sauron"],
  ["darwin", "x64", "@aaif/sauron-binary-darwin-x64", "sauron"],
  ["linux", "arm64", "@aaif/sauron-binary-linux-arm64", "sauron"],
  ["linux", "x64", "@aaif/sauron-binary-linux-x64", "sauron"],
  ["win32", "x64", "@aaif/sauron-binary-win32-x64", "sauron.exe"],
];

function setSauronBinary(t, value) {
  const original = process.env.SAURON_BINARY;
  process.env.SAURON_BINARY = value;
  t.after(() => {
    if (original === undefined) {
      delete process.env.SAURON_BINARY;
    } else {
      process.env.SAURON_BINARY = original;
    }
  });
}

for (const [
  platform,
  arch,
  packageName,
  executableName,
] of supportedPlatforms) {
  test(`resolves ${platform}-${arch}`, () => {
    let resolvedSpecifier;
    let checkedPath;
    const fixturePackageRoot = join("/fixtures", packageName);

    const result = resolveSauronBinaryForRuntime(platform, arch, {
      resolvePackageJson(specifier) {
        resolvedSpecifier = specifier;
        return join(fixturePackageRoot, "package.json");
      },
      isFile(path) {
        checkedPath = path;
        return true;
      },
    });

    assert.equal(resolvedSpecifier, `${packageName}/package.json`);
    assert.equal(result, resolve(fixturePackageRoot, "bin", executableName));
    assert.equal(checkedPath, result);
    assert.equal(isAbsolute(result), true);
  });
}

test("exports only the public resolver from the package root", () => {
  assert.deepEqual(Object.keys(publicApi), ["resolveSauronBinary"]);
});

test("uses SAURON_BINARY as an explicit override", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "sauron-acp-override-"));
  const binaryPath = join(directory, "sauron");
  writeFileSync(binaryPath, "");
  setSauronBinary(t, relative(process.cwd(), binaryPath));

  t.after(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  assert.equal(publicApi.resolveSauronBinary(), binaryPath);
});

test("rejects an invalid SAURON_BINARY override", (t) => {
  setSauronBinary(t, "missing-sauron-binary");

  assert.throws(
    () => publicApi.resolveSauronBinary(),
    /SAURON_BINARY does not point to a file/,
  );
});

test("reports unsupported platform and architecture combinations", () => {
  assert.throws(
    () =>
      resolveSauronBinaryForRuntime("freebsd", "x64", {
        resolvePackageJson() {
          throw new Error("should not resolve a package");
        },
        isFile() {
          return false;
        },
      }),
    /No Sauron npm binary is available for freebsd-x64/,
  );
});

test("reports a missing optional platform package", () => {
  assert.throws(
    () =>
      resolveSauronBinaryForRuntime("linux", "x64", {
        resolvePackageJson() {
          throw new Error("module not found");
        },
        isFile() {
          return false;
        },
      }),
    /Sauron binary package @aaif\/sauron-binary-linux-x64 is not installed/,
  );
});

test("reports a missing executable in an installed platform package", () => {
  assert.throws(
    () =>
      resolveSauronBinaryForRuntime("darwin", "arm64", {
        resolvePackageJson() {
          return join(
            "/fixtures",
            "@aaif/sauron-binary-darwin-arm64/package.json",
          );
        },
        isFile() {
          return false;
        },
      }),
    /Sauron executable from @aaif\/sauron-binary-darwin-arm64 was not found/,
  );
});
