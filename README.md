<div align="center">

# Sauron

_your native open source AI agent — desktop app, CLI, and API — for code, workflows, and everything in between_

<p align="center">
  <a href="https://opensource.org/licenses/Apache-2.0"
    ><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg"></a>
  <a href="https://discord.gg/n8R5VaWDAn"
    ><img src="https://img.shields.io/discord/1287729918100246654?logo=discord&logoColor=white&label=Join+Us&color=blueviolet" alt="Discord"></a>
  <a href="https://github.com/ArminDashti/Sauron/actions/workflows/ci.yml"
     ><img src="https://img.shields.io/github/actions/workflow/status/ArminDashti/Sauron/ci.yml?branch=main" alt="CI"></a>
  <a href="https://insights.linuxfoundation.org/project/sauron"><img src="https://insights.linuxfoundation.org/api/badge/health-score?project=sauron"></a>
  <a href="https://repology.org/project/sauron-cli/versions"><img src="https://repology.org/badge/tiny-repos/sauron-cli.svg" alt="Packaging status"></a>
</p>

<a href="https://trendshift.io/repositories/25298?utm_source=repository-badge&amp;utm_medium=badge&amp;utm_campaign=badge-repository-25298" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/repositories/25298" alt="ArminDashti%2FSauron | Trendshift" width="250" height="55"/></a>

</div>


Sauron is a general-purpose AI agent that runs on your machine. Not just for code — use it for research, writing, automation, data analysis, or anything you need to get done.

A native desktop app for macOS, Linux, and Windows. A full CLI for terminal workflows. An API to embed it anywhere. Built in Rust for performance and portability.

Sauron works with 15+ providers — Anthropic, OpenAI, Google, Ollama, OpenRouter, Azure, Bedrock, and more. Use API keys or your existing Claude, ChatGPT, or Gemini subscriptions via [ACP](https://goose-docs.ai/docs/guides/acp-providers). Connect to 70+ extensions via the [Model Context Protocol](https://modelcontextprotocol.io/) open standard.

Sauron is derived from [goose](https://github.com/aaif-goose/goose), an AI agent of the [Agentic AI Foundation (AAIF)](https://aaif.io/) at the Linux Foundation.

# Get started

**[Download the desktop app](https://goose-docs.ai/docs/getting-started/installation)** for macOS, Linux, and Windows.

Or install the CLI:

```bash
curl -fsSL https://github.com/ArminDashti/Sauron/releases/download/stable/download_cli.sh | bash
```

# Quick links
- [Quickstart](https://goose-docs.ai/docs/quickstart)
- [Installation](https://goose-docs.ai/docs/getting-started/installation)
- [Tutorials](https://goose-docs.ai/docs/category/tutorials)
- [Documentation](https://goose-docs.ai/docs/category/getting-started)
- [Governance](https://github.com/ArminDashti/Sauron/blob/main/GOVERNANCE.md)
- [Custom Distributions](https://github.com/ArminDashti/Sauron/blob/main/CUSTOM_DISTROS.md) — build your own sauron distro with preconfigured providers, extensions, and branding

## Need help?
- [Diagnostics & Reporting](https://goose-docs.ai/docs/troubleshooting/diagnostics-and-reporting)
- [Known Issues](https://goose-docs.ai/docs/troubleshooting/known-issues)

# a little sauron humor 🪿

> Why did the developer choose sauron as their AI agent?
> 
> Because it always helps them "migrate" their code to production! 🚀

# sauron around with us
- [Discord](https://discord.gg/n8R5VaWDAn)
- [YouTube](https://www.youtube.com/@sauron-oss)
- [LinkedIn](https://www.linkedin.com/company/sauron-oss)
- [Twitter/X](https://x.com/sauron_oss)

## Web app development

The repository root contains a Vite + React web app with hot module replacement:

```sh
npm install
npm run dev
```

Edits under `src/` apply instantly in the browser without a reload. Other scripts: `npm run build` (type-check and production build), `npm run lint`, `npm run preview`.
