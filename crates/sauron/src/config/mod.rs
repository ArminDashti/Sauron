pub mod base;
pub mod declarative_providers;
mod experiments;
pub mod mcp_servers;
mod migrations;
pub mod paths;
pub mod permission;
pub mod providers;
pub mod search_path;
pub mod signup_openrouter;
pub mod signup_tetrate;
pub mod tls;

pub use crate::agents::McpServerConfig;
pub use base::{merge_config_values, Config, ConfigError};
pub use declarative_providers::DeclarativeProviderConfig;
pub use experiments::ExperimentManager;
pub use mcp_servers::{
    get_all_mcp_server_names, get_all_mcp_servers, get_available_mcp_servers,
    get_enabled_mcp_servers, get_mcp_server_by_name, get_warnings, is_mcp_server_enabled,
    remove_mcp_server, resolve_mcp_servers_for_new_session, set_extension, set_mcp_server_enabled,
    McpServerEntry,
};
pub use permission::PermissionManager;
pub use sauron_providers::sauron_mode::SauronMode;
pub use signup_openrouter::configure_openrouter;
pub use signup_tetrate::configure_tetrate;

pub use mcp_servers::DEFAULT_DISPLAY_NAME;
pub use mcp_servers::DEFAULT_EXTENSION;
pub use mcp_servers::DEFAULT_EXTENSION_DESCRIPTION;
pub use mcp_servers::DEFAULT_EXTENSION_TIMEOUT;
pub use providers::{
    clear_active_provider, get_active_model, get_active_provider, get_provider_entry,
    set_active_provider, set_provider_entry, ProviderEntry,
};
