//! MCP servers that ship with sauron and are served in-process over a duplex
//! transport. Registered into the builtin server registry by the CLI.
use once_cell::sync::Lazy;
#[cfg(any(
    feature = "autovisualiser",
    feature = "computer-controller",
    feature = "memory-server",
    feature = "tutorial-server"
))]
use rmcp::{ServerHandler, ServiceExt};
use std::collections::HashMap;

#[cfg(feature = "autovisualiser")]
pub mod autovisualiser;
#[cfg(feature = "computer-controller")]
pub mod computercontroller;
#[cfg(any(
    feature = "autovisualiser",
    feature = "computer-controller",
    feature = "memory-server",
    feature = "tutorial-server"
))]
pub mod mcp_server_runner;
#[cfg(feature = "memory-server")]
mod memory;
#[cfg(all(target_os = "macos", feature = "computer-controller"))]
pub mod peekaboo;
#[cfg(feature = "tutorial-server")]
pub mod tutorial;

#[cfg(feature = "autovisualiser")]
pub use autovisualiser::AutoVisualiserRouter;
#[cfg(feature = "computer-controller")]
pub use computercontroller::ComputerControllerServer;
#[cfg(feature = "memory-server")]
pub use memory::MemoryServer;
#[cfg(feature = "tutorial-server")]
pub use tutorial::TutorialServer;

pub type SpawnServerFn = fn(tokio::io::DuplexStream, tokio::io::DuplexStream);

#[cfg(any(
    feature = "autovisualiser",
    feature = "computer-controller",
    feature = "memory-server",
    feature = "tutorial-server"
))]
fn spawn_and_serve<S>(
    name: &'static str,
    server: S,
    transport: (tokio::io::DuplexStream, tokio::io::DuplexStream),
) where
    S: ServerHandler + Send + 'static,
{
    tokio::spawn(async move {
        match server.serve(transport).await {
            Ok(running) => {
                let _ = running.waiting().await;
            }
            Err(e) => tracing::error!(builtin = name, error = %e, "server error"),
        }
    });
}

#[cfg(any(
    feature = "autovisualiser",
    feature = "computer-controller",
    feature = "memory-server",
    feature = "tutorial-server"
))]
macro_rules! builtin {
    ($name:ident, $server_ty:ty) => {{
        fn spawn(r: tokio::io::DuplexStream, w: tokio::io::DuplexStream) {
            spawn_and_serve(stringify!($name), <$server_ty>::new(), (r, w));
        }
        (stringify!($name), spawn as SpawnServerFn)
    }};
}

pub static BUILTIN_SERVERS: Lazy<HashMap<&'static str, SpawnServerFn>> = Lazy::new(|| {
    #[allow(unused_mut)]
    let mut servers = HashMap::new();
    #[cfg(feature = "autovisualiser")]
    servers.extend([builtin!(autovisualiser, AutoVisualiserRouter)]);
    #[cfg(feature = "computer-controller")]
    servers.extend([builtin!(computercontroller, ComputerControllerServer)]);
    #[cfg(feature = "memory-server")]
    servers.extend([builtin!(memory, MemoryServer)]);
    #[cfg(feature = "tutorial-server")]
    servers.extend([builtin!(tutorial, TutorialServer)]);
    servers
});
