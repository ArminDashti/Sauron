use std::collections::HashMap;

use super::super::container::Container;
use super::super::mcp_client::{ConnectContext, McpClient, McpClientTrait};
use super::super::mcp_server::{McpServerError, McpServerResult};
use super::stdio;
use crate::builtin_mcp_server::get_builtin_mcp_server;
use crate::config::mcp_servers::name_to_key;

pub(super) async fn connect(
    name: &str,
    container: Option<&Container>,
    mut ctx: ConnectContext,
) -> McpServerResult<Box<dyn McpClientTrait>> {
    let key = name_to_key(name);
    let extension_fn = get_builtin_mcp_server(&key)
        .ok_or_else(|| McpServerError::ConfigError(format!("Unknown extension: {}", name)))?;

    if let Some(container) = container {
        ctx.docker_container = Some(container.id().to_string());
        tracing::info!(
            container = %container.id(),
            builtin = %name,
            "Starting builtin extension inside Docker container"
        );
        let command = stdio::docker_exec(
            container,
            HashMap::new(),
            "sauron",
            &["mcp".to_string(), key],
        );
        return Ok(Box::new(stdio::spawn(command, ctx).await?));
    }

    let (server_read, client_write) = tokio::io::duplex(65536);
    let (client_read, server_write) = tokio::io::duplex(65536);
    extension_fn(server_read, server_write);
    Ok(Box::new(
        McpClient::connect((client_read, client_write), ctx).await?,
    ))
}
