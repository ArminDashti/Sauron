import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  addConfigExtension,
  getConfiguredExtensions,
  setConfigExtensionEnabled,
} from '../acp/extensions';
import { setBundledGitHubExtensionEnabled, BUNDLED_GITHUB_MCP_URI } from './githubExtension';

vi.mock('../acp/extensions', () => ({
  getConfiguredExtensions: vi.fn(),
  setConfigExtensionEnabled: vi.fn(),
  addConfigExtension: vi.fn(),
}));

const mockedGetConfiguredExtensions = vi.mocked(getConfiguredExtensions);
const mockedSetConfigExtensionEnabled = vi.mocked(setConfigExtensionEnabled);
const mockedAddConfigExtension = vi.mocked(addConfigExtension);

describe('setBundledGitHubExtensionEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds the bundled GitHub extension when missing and enabling', async () => {
    mockedGetConfiguredExtensions.mockResolvedValue({ extensions: [], warnings: [] });
    mockedAddConfigExtension.mockResolvedValue(undefined);

    await setBundledGitHubExtensionEnabled(true);

    expect(mockedAddConfigExtension).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'streamable_http',
        name: 'GitHub',
        uri: BUNDLED_GITHUB_MCP_URI,
        bundled: true,
      }),
      true
    );
  });

  it('enables an existing bundled GitHub extension', async () => {
    mockedGetConfiguredExtensions.mockResolvedValue({
      extensions: [
        {
          name: 'GitHub',
          type: 'streamable_http',
          uri: BUNDLED_GITHUB_MCP_URI,
          description: '',
          enabled: false,
          bundled: true,
          configKey: 'github',
        },
      ],
      warnings: [],
    });
    mockedSetConfigExtensionEnabled.mockResolvedValue(undefined);

    await setBundledGitHubExtensionEnabled(true);

    expect(mockedSetConfigExtensionEnabled).toHaveBeenCalledWith('github', true);
    expect(mockedAddConfigExtension).not.toHaveBeenCalled();
  });

  it('does not overwrite a custom extension that only shares the GitHub name', async () => {
    mockedGetConfiguredExtensions.mockResolvedValue({
      extensions: [
        {
          name: 'GitHub',
          type: 'stdio',
          cmd: 'my-github',
          args: [],
          description: 'custom',
          enabled: true,
          bundled: false,
          configKey: 'github',
        },
      ],
      warnings: [],
    });

    await setBundledGitHubExtensionEnabled(true);

    expect(mockedAddConfigExtension).not.toHaveBeenCalled();
    expect(mockedSetConfigExtensionEnabled).not.toHaveBeenCalled();
  });
});
