import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isAbsoluteSauronPath, resolveSauronPathRoot, sanitizeSauronPathRoot } from './pathUtils';

describe('resolveSauronPathRoot', () => {
  it('rejects empty and relative values', () => {
    expect(resolveSauronPathRoot(undefined)).toBeUndefined();
    expect(resolveSauronPathRoot('   ')).toBeUndefined();
    expect(resolveSauronPathRoot('relative/root')).toBeUndefined();
  });

  it('retains absolute paths without requiring them to exist', () => {
    const absolute = path.resolve('nonexistent-sauron-root');
    expect(resolveSauronPathRoot(`  ${absolute}  `)).toBe(absolute);
  });

  it('expands a home-relative root before validation', () => {
    expect(resolveSauronPathRoot('~')).toBe(os.homedir());
  });

  it('removes a rejected value from the child-process environment', () => {
    const env = { SAURON_PATH_ROOT: 'relative/root' };
    expect(sanitizeSauronPathRoot(env)).toBeUndefined();
    expect(env).not.toHaveProperty('SAURON_PATH_ROOT');
  });

  it('matches Rust absolute-path handling on Windows', () => {
    expect(isAbsoluteSauronPath('C:\\sauron\\root', 'win32')).toBe(true);
    expect(isAbsoluteSauronPath('\\\\server\\share\\sauron', 'win32')).toBe(true);
    expect(isAbsoluteSauronPath('C:sauron\\root', 'win32')).toBe(false);
    expect(isAbsoluteSauronPath('\\sauron\\root', 'win32')).toBe(false);
    expect(isAbsoluteSauronPath('/sauron/root', 'win32')).toBe(false);
  });
});
