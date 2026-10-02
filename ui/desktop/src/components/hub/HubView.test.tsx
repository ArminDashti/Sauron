/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HubView from './HubView';
import { IntlTestWrapper } from '../../i18n/test-utils';

const openExternal = vi.fn();

function renderHub() {
  return render(
    <IntlTestWrapper>
      <HubView />
    </IntlTestWrapper>
  );
}

describe('HubView', () => {
  beforeEach(() => {
    openExternal.mockReset();
    Object.defineProperty(window, 'electron', {
      writable: true,
      value: { ...window.electron, openExternal },
    });
  });

  it('renders the Skills and MCP sections with their sources', () => {
    renderHub();

    expect(screen.getByRole('heading', { level: 1, name: 'Hub' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Skills' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'MCPs' })).toBeInTheDocument();

    expect(screen.getByText('Agent Skills')).toBeInTheDocument();
    expect(screen.getByText('skills.sh')).toBeInTheDocument();
    expect(screen.getByText('Anthropic Skills')).toBeInTheDocument();
    expect(screen.getByText('MCP Registry')).toBeInTheDocument();
    expect(screen.getByText('Smithery')).toBeInTheDocument();
    expect(screen.getByText('mcp.so')).toBeInTheDocument();
  });

  it('opens a skill source externally when clicked', async () => {
    const user = userEvent.setup();
    renderHub();

    await user.click(screen.getByRole('button', { name: /Agent Skills/ }));

    expect(openExternal).toHaveBeenCalledWith('https://agentskills.io');
  });

  it('opens an MCP source externally when clicked', async () => {
    const user = userEvent.setup();
    renderHub();

    await user.click(screen.getByRole('button', { name: /Smithery/ }));

    expect(openExternal).toHaveBeenCalledWith('https://smithery.ai');
  });
});
