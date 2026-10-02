import { defineMessages, useIntl } from '../../../i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import ExtensionsSection from '../extensions/ExtensionsSection';

const i18n = defineMessages({
  title: {
    id: 'mcpSettings.title',
    defaultMessage: 'MCP Servers',
  },
  description: {
    id: 'mcpSettings.description',
    defaultMessage:
      'Connect Model Context Protocol servers to give goose new tools, resources, and data sources. Extensions added here are available to every chat.',
  },
});

export default function McpSettingsSection() {
  const intl = useIntl();

  return (
    <section id="mcp" className="space-y-4 pr-4">
      <Card className="p-2 pb-4">
        <CardHeader className="pb-0">
          <CardTitle>{intl.formatMessage(i18n.title)}</CardTitle>
          <CardDescription>{intl.formatMessage(i18n.description)}</CardDescription>
        </CardHeader>
      </Card>

      <Card className="rounded-lg">
        <CardContent className="px-2 pt-2">
          <ExtensionsSection />
        </CardContent>
      </Card>
    </section>
  );
}
