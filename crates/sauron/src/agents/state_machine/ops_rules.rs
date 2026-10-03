//! Makes user-authored rules always-on by adding them to inference prompts.

use anyhow::Result;
use async_trait::async_trait;
use std::path::Path;

use crate::agents::state_machine::effects::SauronEffect;
use crate::agents::state_machine::Operation;
use crate::conversation::Conversation;
use crate::session::Session;

pub struct RuleOperation;

#[async_trait]
impl Operation<Session, SauronEffect> for RuleOperation {
    fn name(&self) -> &'static str {
        "rules"
    }

    async fn prompt_parts(
        &self,
        session: &Session,
        _conversation: &Conversation,
    ) -> Result<Vec<(String, String)>> {
        Ok(crate::rules::rules_instructions(
            session.working_dir.as_deref().unwrap_or(Path::new(".")),
        )
        .map(|instructions| ("rules".to_string(), instructions))
        .into_iter()
        .collect())
    }
}
