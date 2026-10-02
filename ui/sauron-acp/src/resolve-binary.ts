import { statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const PLATFORM_PACKAGES: Record<string, string> = {
  "darwin-arm64": "@aaif/sauron-binary-darwin-arm64",
  "darwin-x64": "@aaif/sauron-binary-darwin-x64",
  "linux-arm64": "@aaif/sauron-binary-linux-arm64",
  "linux-x64": "@aaif/sauron-binary-linux-x64",
  "win32-x64": "@aaif/sauron-binary-win32-x64",
};

const require = createRequire(import.meta.url);

export interface BinaryResolverDependencies {
  resolvePackageJson(specifier: string): string;
  isFile(path: string): boolean;
}

const resolverDependencies: BinaryResolverDependencies = {
  resolvePackageJson: (specifier) => require.resolve(specifier),
  isFile: (path) => {
    try {
      return statSync(path).isFile();
    } catch {
      return false;
    }
  },
};

export function resolveSauronBinary(): string {
  const override = process.env.SAURON_BINARY?.trim();
  if (override) {
    const binaryPath = resolve(override);
    if (!resolverDependencies.isFile(binaryPath)) {
      throw new Error(`SAURON_BINARY does not point to a file: ${binaryPath}.`);
    }
    return binaryPath;
  }

  return resolveSauronBinaryForRuntime(
    process.platform,
    process.arch,
    resolverDependencies,
  );
}

export function resolveSauronBinaryForRuntime(
  platform: string,
  arch: string,
  dependencies: BinaryResolverDependencies,
): string {
  const platformKey = `${platform}-${arch}`;
  const packageName = PLATFORM_PACKAGES[platformKey];

  if (!packageName) {
    throw new Error(
      `No Sauron npm binary is available for ${platformKey}. Supported platforms: ${Object.keys(PLATFORM_PACKAGES).join(", ")}.`,
    );
  }

  let packageJsonPath: string;
  try {
    packageJsonPath = dependencies.resolvePackageJson(
      `${packageName}/package.json`,
    );
  } catch (cause) {
    throw new Error(
      `Sauron binary package ${packageName} is not installed. Reinstall @aaif/sauron-acp with optional dependencies enabled.`,
      { cause },
    );
  }

  const executableName = platform === "win32" ? "sauron.exe" : "sauron";
  const binaryPath = resolve(dirname(packageJsonPath), "bin", executableName);

  if (!dependencies.isFile(binaryPath)) {
    throw new Error(
      `Sauron executable from ${packageName} was not found at ${binaryPath}.`,
    );
  }

  return binaryPath;
}
