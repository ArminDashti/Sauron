use rmcp::model::ServerNotification;
use sauron_provider_types::conversation::{
    message::{Message, MessageUsage},
    token_usage::ProviderUsage,
    Conversation,
};

#[derive(Clone, Debug)]
pub enum AgentEvent {
    Message(Message),
    Usage(ProviderUsage),
    MessageUsage {
        message_id: Option<String>,
        usage: MessageUsage,
    },
    McpNotification((String, ServerNotification)),
    HistoryReplaced(Conversation),
}
