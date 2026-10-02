use crate::conversation::message::Message;
use crate::conversation::Conversation;
use crate::providers::base::ProviderUsage;
use crate::recipe::Recipe;
use crate::session::McpServerData;
use sauron_agent::operation::{ConversationEffect, MachineEffect};

pub enum SauronEffect {
    Conversation(ConversationEffect),
    CompactConversation {
        conversation: Conversation,
        usage: Option<ProviderUsage>,
    },
    SetRecipe(Box<Option<Recipe>>),
    SetExtensionData(McpServerData),
    RecordUsage(ProviderUsage),
}

impl MachineEffect for SauronEffect {
    fn ensure_message_ids(&mut self) {
        match self {
            SauronEffect::Conversation(effect) => effect.ensure_message_ids(),
            SauronEffect::CompactConversation { conversation, .. } => {
                for message in conversation.messages_mut() {
                    if message.id.is_none() {
                        message.id = Some(format!("msg_{}", uuid::Uuid::new_v4()));
                    }
                }
            }
            _ => {}
        }
    }
}

impl From<ConversationEffect> for SauronEffect {
    fn from(effect: ConversationEffect) -> Self {
        SauronEffect::Conversation(effect)
    }
}

impl From<Message> for SauronEffect {
    fn from(message: Message) -> Self {
        ConversationEffect::from(message).into()
    }
}

impl From<Conversation> for SauronEffect {
    fn from(conversation: Conversation) -> Self {
        ConversationEffect::from(conversation).into()
    }
}
