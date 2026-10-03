//! Sauron-specific inference request preparation.

use std::path::Path;

#[cfg(feature = "code-mode")]
use crate::agents::McpManager;
use crate::agents::PromptManager;
use crate::config::SauronMode;
use crate::session::Session;
use crate::tool_inspection::ToolInspectionManager;
use anyhow::Result;
use async_trait::async_trait;
use sauron_agent::inference::{InferenceRequestPreparer, PreparedInferenceRequest};
use sauron_agent::operation::{messages_since_kickoff, InferenceInput};
use sauron_providers::conversation::message::Message;
use sauron_providers::conversation::Conversation;
#[cfg(feature = "code-mode")]
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct SauronInferenceRequestPreparer<'a> {
    #[cfg(feature = "code-mode")]
    pub(crate) mcp_manager: Arc<McpManager>,
    pub(crate) sauron_mode: &'a Mutex<SauronMode>,
    pub(crate) prompt_manager: &'a Mutex<PromptManager>,
    pub(crate) tool_inspection_manager: &'a ToolInspectionManager,
    pub(crate) context_limit: usize,
}

#[async_trait]
impl InferenceRequestPreparer<Session> for SauronInferenceRequestPreparer<'_> {
    async fn prepare(
        &self,
        session: &Session,
        conversation: &Conversation,
        input: InferenceInput,
    ) -> Result<PreparedInferenceRequest> {
        #[cfg(feature = "code-mode")]
        let code_execution_mode = self
            .mcp_manager
            .is_mcp_server_enabled(crate::agents::in_process::code_execution::EXTENSION_NAME)
            .await;
        #[cfg(not(feature = "code-mode"))]
        let code_execution_mode = false;

        let sauron_mode = *self.sauron_mode.lock().await;
        if sauron_mode == SauronMode::SmartApprove {
            self.tool_inspection_manager
                .apply_tool_annotations(&input.tools);
        }
        let tools =
            crate::agents::reply_parts::prepare_inference_tools(input.tools, code_execution_mode);
        let system_prompt = self.prompt_manager.lock().await.build_system_prompt(
            session.working_dir.as_deref().unwrap_or(Path::new(".")),
            input.prompt_parts,
            sauron_mode,
        );
        let turn = messages_since_kickoff(conversation)?;
        let turn_start = turn
            .first()
            .and_then(|message| chrono::DateTime::from_timestamp(message.created, 0))
            .map(|timestamp| timestamp.with_timezone(&chrono::Local))
            .unwrap_or_else(chrono::Local::now);
        let last = turn
            .iter()
            .rev()
            .find(|message| message.is_turn_context())
            .map(Message::as_concat_text);
        let context_limit = Some(self.context_limit);
        let additional_messages = crate::agents::moim::turn_context_event(
            session.working_dir.as_deref().unwrap_or(Path::new(".")),
            context_limit,
            input.moim_parts,
            turn_start,
        )
        .filter(|event| Some(event.as_concat_text()) != last)
        .into_iter()
        .collect();
        Ok(PreparedInferenceRequest {
            system_prompt,
            tools,
            additional_messages,
        })
    }
}
