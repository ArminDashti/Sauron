import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SourceEntry } from '@aaif/sauron-acp-client';
import SkillsSection from './SkillsSection';
import { listSkillSources } from '../../../acp/sources';
import { getAcpClient } from '../../../acp/acpConnection';
import { IntlTestWrapper } from '../../../i18n/test-utils';

vi.mock('../../../acp/acpConnection', () => ({
  getAcpClient: vi.fn(),
}));

vi.mock('../../../acp/sources', () => ({
  listSkillSources: vi.fn(),
}));

vi.mock('../../../utils/workingDir', () => ({
  getInitialWorkingDir: () => '/workspace',
}));

const mockedListSkillSources = vi.mocked(listSkillSources);

const skillSource = (overrides: Partial<SourceEntry> = {}): SourceEntry => ({
  type: 'skill',
  name: 'release-notes',
  description: 'Draft release notes from merged pull requests',
  content: '',
  path: '/workspace/.sauron/skills/release-notes',
  global: false,
  writable: true,
  ...overrides,
});

describe('SkillsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists each installed skill with its scope', async () => {
    mockedListSkillSources.mockResolvedValue([
      skillSource(),
      skillSource({ name: 'triage', description: 'Triage incoming issues', global: true }),
    ]);

    render(<SkillsSection />, { wrapper: IntlTestWrapper });

    expect(screen.getByText('Loading skills...')).toBeInTheDocument();
    expect(await screen.findByText('release-notes')).toBeInTheDocument();
    expect(screen.getByText('Draft release notes from merged pull requests')).toBeInTheDocument();
    expect(screen.getByText('triage')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
    expect(screen.getByText('Global')).toBeInTheDocument();
    expect(mockedListSkillSources).toHaveBeenCalledWith('/workspace');
  });

  it('opens a skill for editing and saves its changes through ACP', async () => {
    const user = userEvent.setup();
    const skill = skillSource({ content: 'Initial instructions' });
    mockedListSkillSources.mockResolvedValue([skill]);
    const sourcesUpdate = vi.fn().mockResolvedValue({
      source: skillSource({
        name: 'release-notes-v2',
        content: 'Updated instructions',
        path: '/workspace/.sauron/skills/release-notes-v2',
      }),
    });
    vi.mocked(getAcpClient).mockResolvedValue({
      sauron: {
        sourcesUpdate_unstable: sourcesUpdate,
      },
    } as never);

    render(<SkillsSection />, { wrapper: IntlTestWrapper });
    await user.click(await screen.findByRole('button', { name: 'Open release-notes for editing' }));
    expect(screen.getByTestId('skill-editor')).toBeInTheDocument();
    expect(screen.getByLabelText('Instructions')).toHaveValue('Initial instructions');

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'release-notes-v2');
    await user.clear(screen.getByLabelText('Instructions'));
    await user.type(screen.getByLabelText('Instructions'), 'Updated instructions');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Skill saved.');
    expect(screen.getByLabelText('Instructions')).toHaveValue('Updated instructions');
    expect(sourcesUpdate).toHaveBeenCalledWith({
      type: 'skill',
      path: '/workspace/.sauron/skills/release-notes',
      name: 'release-notes-v2',
      description: 'Draft release notes from merged pull requests',
      content: 'Updated instructions',
    });
  });

  it('shows an empty state when no skills are installed', async () => {
    mockedListSkillSources.mockResolvedValue([]);

    render(<SkillsSection />, { wrapper: IntlTestWrapper });

    expect(await screen.findByText('No skills are installed.')).toBeInTheDocument();
  });

  it('shows the failure when the skill sources cannot be read', async () => {
    mockedListSkillSources.mockRejectedValue(new Error('backend unavailable'));

    render(<SkillsSection />, { wrapper: IntlTestWrapper });

    expect(await screen.findByText(/Failed to load skills/)).toBeInTheDocument();
    expect(screen.getByText(/backend unavailable/)).toBeInTheDocument();
  });
});
