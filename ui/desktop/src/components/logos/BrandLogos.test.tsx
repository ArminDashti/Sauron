import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandIcon, ProviderBrandIcon } from './BrandLogos';
import ModelIcon from './ModelIcon';
import { resolveProviderIcon } from './providerIcons';

function imgSrc(node: React.ReactElement): string | null {
  const { container } = render(node);
  return container.querySelector('img')?.getAttribute('src') ?? null;
}

describe('BrandIcon', () => {
  it('prefers the real vendored mark over the hand-drawn tile', () => {
    const src = imgSrc(<BrandIcon provider="openai" />);
    expect(src).toBe(resolveProviderIcon('openai'));
    expect(src).toBeTruthy();
  });

  it('agrees with ModelIcon so the two components never diverge', () => {
    for (const provider of ['openai', 'anthropic', 'groq', 'gcp_vertex_ai', 'tanzu_ai']) {
      expect(imgSrc(<BrandIcon provider={provider} />)).toBe(
        imgSrc(<ModelIcon provider={provider} />)
      );
    }
  });

  it('keeps the hand-drawn tile for providers that have no brand mark', () => {
    const { container } = render(<BrandIcon provider="local" />);
    // Local Inference ships a hand-drawn chip mark rather than a monogram.
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders initials for known providers with neither a logo nor a tile', () => {
    const { container } = render(<BrandIcon provider="routstr" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')?.textContent).toBe('R');
  });

  it('falls back to the Sauron eye for unknown providers', () => {
    const { container } = render(<BrandIcon provider="acme" />);
    expect(container.querySelector('text')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('still matches models by name when no provider is given', () => {
    const { container } = render(<BrandIcon model="claude-sonnet-4-5" />);
    expect(container.querySelector('text')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('ProviderBrandIcon', () => {
  it('delegates to BrandIcon', () => {
    expect(imgSrc(<ProviderBrandIcon provider="mistral" />)).toBe(resolveProviderIcon('mistral'));
  });
});
