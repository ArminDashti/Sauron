---
title: Browser Extension
description: Built-in web automation for agents via Playwright MCP
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

The **Browser** extension gives agents Playwright-powered tools to navigate pages, interact with elements, and capture screenshots. It is bundled with sauron and follows the same tool model as [OpenHands browser tools](https://github.com/OpenHands/software-agent-sdk/tree/main/openhands-tools/openhands/tools/browser_use) (navigate, click, type, snapshot).

## Requirements

- [Node.js](https://nodejs.org/) (for `npx`)
- Chromium for Playwright: `npx playwright install chromium`

On fresh desktop installs, the extension is added to your config automatically but stays **disabled** until you turn it on in **Settings → Extensions**.

## Enable

<Tabs groupId="interface">
  <TabItem value="ui" label="Desktop" default>
  Open **Settings → Extensions**, find **Browser**, and enable it.
  </TabItem>
  <TabItem value="cli" label="CLI">
  ```sh
  # Enable in config.yaml under extensions.browser, or for one session:
  sauron session --with-builtin browser
  ```
  </TabItem>
</Tabs>

## Tools

Tools are provided by [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp), including `browser_navigate`, `browser_click`, `browser_type`, and `browser_take_screenshot`. Prefer shell `curl` or fetch for static pages; use the browser when JavaScript or UI interaction is required.

## Related

- [Playwright MCP](/docs/mcp/playwright-mcp) — manual stdio install
- [Chrome DevTools MCP](/docs/mcp/chrome-devtools-mcp) — CDP-based automation
