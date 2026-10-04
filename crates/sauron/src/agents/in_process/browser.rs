use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use crate::agents::mcp_client::{
    ConnectContext, Error, McpClient, McpClientTrait, SauronMcpClientCapabilities,
};
use crate::agents::mcp_manager::connect_playwright_mcp;
use crate::agents::mcp_server::InProcessContext;
use crate::agents::tool_execution::ToolCallContext;
use crate::config::search_path::SearchPaths;
use async_trait::async_trait;
use indoc::indoc;
use rmcp::model::{
    CallToolResult, Implementation, InitializeResult, JsonObject, ListToolsResult,
    ServerCapabilities, ServerNotification,
};
use tokio::sync::Mutex;
use tokio_util::sync::CancellationToken;

pub static EXTENSION_NAME: &str = "browser";

const DEFAULT_TIMEOUT_SECS: u64 = 300;

/// Whether Node/npx is available to launch the Playwright MCP server.
pub fn is_playwright_mcp_launchable() -> bool {
    SearchPaths::builder().with_npm().resolve("npx").is_ok()
}

pub struct BrowserClient {
    context: InProcessContext,
    inner: Mutex<Option<Arc<McpClient>>>,
    static_info: InitializeResult,
}

impl BrowserClient {
    pub fn new(context: InProcessContext) -> anyhow::Result<Self> {
        let static_info = InitializeResult::new(ServerCapabilities::builder().enable_tools().build())
            .with_server_info(
                Implementation::new(EXTENSION_NAME.to_string(), "1.0.0".to_string())
                    .with_title("Browser"),
            )
            .with_instructions(browser_instructions());

        Ok(Self {
            context,
            inner: Mutex::new(None),
            static_info,
        })
    }

    fn connect_context(&self) -> ConnectContext {
        let working_dir = self
            .context
            .session
            .as_ref()
            .and_then(|session| session.working_dir.clone())
            .or_else(|| std::env::var("SAURON_WORKING_DIR").ok().map(PathBuf::from))
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

        ConnectContext {
            timeout: Duration::from_secs(DEFAULT_TIMEOUT_SECS),
            client_name: "sauron-browser".to_string(),
            capabilities: SauronMcpClientCapabilities::default(),
            working_dir,
            docker_container: None,
            action_required: self.context.session_manager.action_required(),
            mcp_manager: self
                .context
                .mcp_manager
                .clone()
                .unwrap_or_else(std::sync::Weak::new),
        }
    }

    async fn ensure_inner(&self) -> Result<Arc<McpClient>, Error> {
        let mut slot = self.inner.lock().await;
        if let Some(client) = slot.as_ref() {
            return Ok(Arc::clone(client));
        }

        if !is_playwright_mcp_launchable() {
            return Err(Error::TransportClosed);
        }

        let client = connect_playwright_mcp(self.connect_context())
            .await
            .map_err(|_| Error::TransportClosed)?;

        let client = Arc::new(client);
        *slot = Some(Arc::clone(&client));
        Ok(client)
    }
}

fn browser_instructions() -> String {
    indoc! {"
        Browser automation via Playwright MCP (Chromium). Requires Node.js (`npx`) and a Chromium
        install (`npx playwright install chromium`).

        Prefer curl or shell fetch for simple pages; use these tools when JavaScript or interaction
        is required.

        Flow: navigate → snapshot or screenshot → interact → re-snapshot before each click/type.
        Do not submit forms or create accounts unless the user asked.
    "}
    .to_string()
}

#[async_trait]
impl McpClientTrait for BrowserClient {
    async fn list_tools(
        &self,
        session_id: &str,
        next_cursor: Option<String>,
        cancel_token: CancellationToken,
    ) -> Result<ListToolsResult, Error> {
        let inner = self.ensure_inner().await?;
        inner.list_tools(session_id, next_cursor, cancel_token).await
    }

    async fn call_tool(
        &self,
        ctx: &ToolCallContext,
        name: &str,
        arguments: Option<JsonObject>,
        cancel_token: CancellationToken,
    ) -> Result<CallToolResult, Error> {
        let inner = self.ensure_inner().await?;
        inner.call_tool(ctx, name, arguments, cancel_token).await
    }

    fn get_info(&self) -> Option<&InitializeResult> {
        Some(&self.static_info)
    }

    fn get_instructions(&self) -> Option<String> {
        if let Ok(guard) = self.inner.try_lock() {
            if let Some(inner) = guard.as_ref() {
                return inner.get_instructions();
            }
        }
        self.static_info.instructions.clone()
    }

    async fn subscribe(&self) -> tokio::sync::mpsc::Receiver<ServerNotification> {
        if let Ok(inner) = self.ensure_inner().await {
            return inner.subscribe().await;
        }
        tokio::sync::mpsc::channel(1).1
    }

    async fn update_working_dir(&self, new_dir: PathBuf) -> Result<(), Error> {
        if let Ok(inner) = self.ensure_inner().await {
            return inner.update_working_dir(new_dir).await;
        }
        Ok(())
    }
}
