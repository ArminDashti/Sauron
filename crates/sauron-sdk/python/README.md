# sauron-sdk

Python bindings for the sauron Development Kit (GDK).

This package is generated from the Rust `sauron-sdk` crate using UniFFI.

## Build a local wheel

From the repository root:

```bash
just --justfile crates/sauron-sdk/justfile python-wheel
```

The wheel is written to `crates/sauron-sdk/python/dist/`.
