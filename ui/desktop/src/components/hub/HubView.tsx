import { useCallback } from 'react';
import { ExternalLink, LayoutGrid, Puzzle, Zap } from 'lucide-react';
import { MainPanelLayout } from '../Layout/MainPanelLayout';
import { cn } from '../../utils';
import { defineMessages, useIntl } from '../../i18n';

const i18n = defineMessages({
  title: {
    id: 'hubView.title',
    defaultMessage: 'Hub',
  },
  description: {
    id: 'hubView.description',
    defaultMessage: 'Discover Skills and MCP servers from various sources.',
  },
  skillsHeading: {
    id: 'hubView.skillsHeading',
    defaultMessage: 'Skills',
  },
  skillsDescription: {
    id: 'hubView.skillsDescription',
    defaultMessage: 'Extend your agent with reusable skills from these sources.',
  },
  mcpsHeading: {
    id: 'hubView.mcpsHeading',
    defaultMessage: 'MCPs',
  },
  mcpsDescription: {
    id: 'hubView.mcpsDescription',
    defaultMessage: 'Connect tools and integrations with MCP servers from these registries.',
  },
});

interface HubSource {
  name: string;
  description: string;
  url: string;
}

/** Places to discover reusable skills, from various sources. */
const SKILL_SOURCES: HubSource[] = [
  {
    name: 'Agent Skills',
    description: 'The open Agent Skills standard — reusable capabilities for AI agents.',
    url: 'https://agentskills.io',
  },
  {
    name: 'skills.sh',
    description: 'The open skills ecosystem; install skills with a single command.',
    url: 'https://www.skills.sh',
  },
  {
    name: 'Anthropic Skills',
    description: "Anthropic's official implementation of skills for Claude.",
    url: 'https://github.com/anthropics/skills',
  },
  {
    name: 'Awesome Copilot',
    description: 'Community collection of skills, agents, and prompts for GitHub Copilot.',
    url: 'https://github.com/github/awesome-copilot',
  },
];

/** Registries and directories of Model Context Protocol servers, from various sources. */
const MCP_SOURCES: HubSource[] = [
  {
    name: 'MCP Registry',
    description: 'Official registry of Model Context Protocol servers.',
    url: 'https://registry.modelcontextprotocol.io',
  },
  {
    name: 'Official Servers',
    description: 'Reference implementations and community-built servers from the MCP project.',
    url: 'https://github.com/modelcontextprotocol/servers',
  },
  {
    name: 'Smithery',
    description: 'Directory of MCP servers installable in one command.',
    url: 'https://smithery.ai',
  },
  {
    name: 'Glama',
    description: 'MCP server directory with detailed server listings.',
    url: 'https://glama.ai/mcp',
  },
  {
    name: 'mcp.so',
    description: 'Search engine for MCP servers.',
    url: 'https://mcp.so',
  },
];

function SourceCard({ source }: { source: HubSource }) {
  const handleOpen = useCallback(() => {
    void window.electron.openExternal(source.url);
  }, [source.url]);

  return (
    <button
      type="button"
      onClick={handleOpen}
      className={cn(
        'flex flex-col items-start gap-2 p-4 text-left rounded-lg',
        'border border-border-primary bg-background-primary',
        'hover:bg-background-secondary transition-colors duration-150'
      )}
    >
      <div className="flex items-center justify-between w-full gap-2">
        <span className="font-medium text-text-primary truncate">{source.name}</span>
        <ExternalLink className="w-4 h-4 flex-shrink-0 text-text-secondary" />
      </div>
      <span className="text-sm text-text-secondary">{source.description}</span>
    </button>
  );
}

function SourceSection({
  icon,
  heading,
  description,
  sources,
}: {
  icon: React.ReactNode;
  heading: string;
  description: string;
  sources: HubSource[];
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h2 className="text-xl font-medium text-text-primary">{heading}</h2>
      </div>
      <p className="text-sm text-text-secondary mb-4">{description}</p>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
      >
        {sources.map((source) => (
          <SourceCard key={source.url} source={source} />
        ))}
      </div>
    </section>
  );
}

export default function HubView() {
  const intl = useIntl();

  return (
    <MainPanelLayout>
      <div className="flex-1 flex flex-col min-h-0">
        <div className="bg-background-primary px-8 pb-8 pt-16">
          <div className="flex flex-col page-transition">
            <div className="flex items-center gap-3 mb-1">
              <LayoutGrid className="w-8 h-8 text-text-secondary" />
              <h1 className="text-4xl font-light">{intl.formatMessage(i18n.title)}</h1>
            </div>
            <p className="text-sm text-text-secondary">{intl.formatMessage(i18n.description)}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <div className="flex flex-col gap-10 pt-2">
            <SourceSection
              icon={<Zap className="w-5 h-5 text-text-secondary" />}
              heading={intl.formatMessage(i18n.skillsHeading)}
              description={intl.formatMessage(i18n.skillsDescription)}
              sources={SKILL_SOURCES}
            />
            <SourceSection
              icon={<Puzzle className="w-5 h-5 text-text-secondary" />}
              heading={intl.formatMessage(i18n.mcpsHeading)}
              description={intl.formatMessage(i18n.mcpsDescription)}
              sources={MCP_SOURCES}
            />
          </div>
        </div>
      </div>
    </MainPanelLayout>
  );
}
