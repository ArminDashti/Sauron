import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ModelIcon from './ModelIcon';

function iconSrc(provider: string | null): string | null {
  const { container } = render(<ModelIcon provider={provider} />);
  return container.querySelector('img')?.getAttribute('src') ?? null;
}

describe('ModelIcon', () => {
  it('renders a transparent-background icon for a known provider', () => {
    const { container } = render(<ModelIcon provider="anthropic" />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toMatch(/^(data:image\/svg\+xml|.*\.svg)/);
    expect(img?.getAttribute('alt')).toBe('');
    expect(img?.getAttribute('aria-hidden')).toBe('true');
    expect(img?.className).toContain('dark:brightness-0');
    expect(img?.className).toContain('dark:invert');
  });

  it('resolves provider aliases onto the matching icon', () => {
    const bedrock = iconSrc('bedrock');
    expect(bedrock).not.toBeNull();
    expect(bedrock).toBe(iconSrc('aws_bedrock'));
    expect(bedrock).not.toBe(iconSrc('anthropic'));
  });

  it('resolves agent harness ids onto their own brand mark', () => {
    expect(iconSrc('claude-acp')).toBe(iconSrc('claude'));
    expect(iconSrc('codex-acp')).toBe(iconSrc('openai'));
    expect(iconSrc('cursor-agent')).toBe(iconSrc('cursor'));
    expect(iconSrc('opencode-acp')).toBe(iconSrc('opencode'));
    expect(iconSrc('copilot-acp')).toBe(iconSrc('github_copilot'));
  });

  it('matches providers case-insensitively and falls back for unknown ones', () => {
    expect(iconSrc('OpenAI')).toBe(iconSrc('openai'));

    const { container } = render(<ModelIcon provider="acme" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('falls back to the generic glyph when no provider is known', () => {
    const { container } = render(<ModelIcon provider={null} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders initials for a known provider that publishes no brand mark', () => {
    const { container } = render(<ModelIcon provider="orcarouter" />);
    expect(container.querySelector('img')).toBeNull();
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.textContent).toBe('OR');
  });
});
