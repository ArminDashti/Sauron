# Native Binary Packages for sauron

This directory contains the npm package scaffolding for distributing the
`sauron` Rust binary as platform-specific npm packages.

## Packages

| Package | Platform |
|---------|----------|
| `@aaif/sauron-binary-darwin-arm64` | macOS Apple Silicon |
| `@aaif/sauron-binary-darwin-x64` | macOS Intel |
| `@aaif/sauron-binary-linux-arm64` | Linux ARM64 |
| `@aaif/sauron-binary-linux-x64` | Linux x64 |
| `@aaif/sauron-binary-win32-x64` | Windows x64 |

## Usage

These are platform-specific implementation dependencies and are not intended
to be installed directly. Install `@aaif/sauron-acp` instead. It installs the
appropriate package automatically and provides the `sauron` command. Each
binary package contains its native executable. Its platform-specific internal
command preserves executable permissions during npm packing;
`@aaif/sauron-acp` remains the sole owner of the supported `sauron` command.

## Release preparation

The `.github/workflows/publish-npm.yml` workflow downloads the binaries from an
exact versioned Sauron release and prepares the platform package tarballs.
By default it only uploads the verified tarballs as a workflow artifact. Set
the manual `publish` input to publish them through the protected npm production
environment.
