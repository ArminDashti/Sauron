use anyhow::Result;
use futures::future::BoxFuture;
use std::collections::HashMap;
use std::path::PathBuf;

use crate::acp::{
    configured_model_for_provider, extension_configs_to_mcp_servers, AcpProvider,
    AcpProviderConfig, ACP_CURRENT_MODEL,
};
use crate::config::search_path::SearchPaths;
use crate::config::{Config, SauronMode};
use crate::providers::base::{
    current_working_dir, ProviderDef, ProviderDescriptor, ProviderMetadata,
};
use crate::providers::catalog::ProviderSetupMetadata;

pub(crate) const OPENCODE_ACP_PROVIDER_NAME: &str = "opencode-acp";
const OPENCODE_ACP_DOC_URL: &str = "https://opencode.ai/docs/acp/";
pub(crate) const OPENCODE_ACP_BINARY: &str = "opencode";

pub struct OpenCodeAcpProvider;

impl sauron_providers::base::ProviderDescriptor for OpenCodeAcpProvider {
    fn metadata() -> ProviderMetadata {
        ProviderMetadata::new(
            OPENCODE_ACP_PROVIDER_NAME,
            "OpenCode",
            "Use sauron with OpenCode via its ACP mode (`opencode acp`).",
            ACP_CURRENT_MODEL,
            vec![],
            OPENCODE_ACP_DOC_URL,
            vec![],
        )
        .with_setup_steps(vec![
            "Install the OpenCode CLI: `npm install -g opencode-ai`",
            "Authenticate with your provider: run `opencode auth login`",
        ])
        .with_setup(
            ProviderSetupMetadata::cli_agent(
                OPENCODE_ACP_BINARY,
                &["opencode-acp", "opencode_cli", "opencode"],
            )
            .with_acp()
            .with_docs_url(OPENCODE_ACP_DOC_URL)
            .with_capabilities(true, true, false),
        )
    }
}

impl OpenCodeAcpProvider {
    fn create(
        extensions: Vec<crate::config::McpServerConfig>,
        working_dir: PathBuf,
        use_default_model: bool,
    ) -> BoxFuture<'static, Result<AcpProvider>> {
        Box::pin(async move {
            let config = Config::global();
            // with_npm() includes npm global bin dir (desktop app PATH may not)
            let resolved_command = SearchPaths::builder()
                .with_npm()
                .resolve(OPENCODE_ACP_BINARY)?;
            let sauron_mode = config.get_sauron_mode().unwrap_or(SauronMode::Auto);
            let model = if use_default_model {
                ACP_CURRENT_MODEL.to_string()
            } else {
                configured_model_for_provider(config, OPENCODE_ACP_PROVIDER_NAME)
            };

            let session_config_options = if model == ACP_CURRENT_MODEL {
                vec![]
            } else {
                vec![("model".to_string(), model)]
            };

            let provider_config = AcpProviderConfig {
                command: resolved_command,
                args: vec!["acp".to_string()],
                env: vec![],
                env_remove: vec![],
                work_dir: working_dir,
                mcp_servers: extension_configs_to_mcp_servers(&extensions),
                session_mode_id: None,
                session_config_options,
                model_config_option_id: Some("model".to_string()),
                mode_mapping: HashMap::new(),
                notification_callback: None,
            };

            let metadata = Self::metadata();
            AcpProvider::connect(metadata.name, sauron_mode, provider_config).await
        })
    }
}

impl ProviderDef for OpenCodeAcpProvider {
    type Provider = AcpProvider;

    fn from_env(
        extensions: Vec<crate::config::McpServerConfig>,
        tls_config: Option<crate::providers::api_client::TlsConfig>,
    ) -> BoxFuture<'static, Result<AcpProvider>> {
        Self::from_env_with_working_dir(extensions, current_working_dir(), tls_config)
    }

    fn from_env_with_working_dir(
        extensions: Vec<crate::config::McpServerConfig>,
        working_dir: PathBuf,
        _tls_config: Option<crate::providers::api_client::TlsConfig>,
    ) -> BoxFuture<'static, Result<AcpProvider>> {
        Self::create(extensions, working_dir, false)
    }

    fn from_env_with_default_model(
        extensions: Vec<crate::config::McpServerConfig>,
        _tls_config: Option<crate::providers::api_client::TlsConfig>,
    ) -> BoxFuture<'static, Result<AcpProvider>> {
        Self::create(extensions, current_working_dir(), true)
    }
}
