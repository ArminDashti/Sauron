# sauron-providers

Provider implementations for sauron. The trait they implement and the conversation
types they exchange live in [`sauron-provider-types`](../sauron-provider-types),
which this crate re-exports — depend on this crate when you want working
providers, and on the types crate when you only need the contract.

## Native providers

| Module | Provider |
| --- | --- |
| `anthropic` | Anthropic |
| `openai` | OpenAI |
| `openai_compatible` | Any OpenAI-compatible endpoint |
| `google` | Google Gemini |
| `databricks`, `databricks_v2`, `databricks_auth` | Databricks, including OAuth |
| `azure_foundry` | Azure AI Foundry |
| `snowflake` | Snowflake Cortex |
| `ollama` | Ollama |
| `local_inference` | On-device models (requires `local-inference`) |

## Declarative providers

Most OpenAI-compatible services don't need Rust code — they're a JSON file in
`src/declarative/definitions/` (Groq, Mistral, Together, Cerebras, DeepSeek,
Perplexity, LM Studio, Vercel AI Gateway, and ~30 more). Each definition declares
its engine, base URL, env vars, and models.

`declarative` exposes the same shape at runtime:

- `deserialize_provider_config` / `from_json` — build a `DeclarativeProviderConfig`
  from JSON.
- `load_custom_providers(dir)` — load user-supplied definitions from disk.
- `fixed_provider_configs` — the bundled set.

```bash
cargo run -p sauron-providers --example declarative
cargo run -p sauron-providers --example streaming
```

## Features

Default is `[]`.

- **TLS (pick one):** `rustls-tls` or `native-tls`.
- `local-inference` — on-device inference (see below).
- `local-inference-hf-hub` — implies `local-inference` and adds Hugging Face model
  discovery, downloads, cache inventory, and management APIs. Without it, models
  can still be loaded directly from paths.
- `cuda`, `vulkan`, `mlx` — GPU/accelerator backends; each implies
  `local-inference`.

## Local inference

`local_inference` runs models on-device: GGUF through `llama.cpp` (via
`llama-cpp-2`), with an optional MLX backend on Apple silicon. It exposes
`LocalInferenceProvider` as an ordinary `Provider`.

The `llama.cpp` backends compile native code, so a C/C++ toolchain is required,
plus the CUDA or Vulkan SDK when selecting those features.

```bash
cargo build -p sauron-providers --features local-inference
cargo build -p sauron-providers --features local-inference-hf-hub
cargo build -p sauron-providers --features mlx
```

What it handles:

- **Runtime and placement** — `InferenceRuntime` describes the machine and
  `available_inference_memory_bytes` helps choose a cached model that will fit.
- **Model lifecycle** — `is_model_loaded`, `loaded_model_ids`, and `evict_model`
  manage what's resident. With `local-inference-hf-hub` enabled, `hf_models`
  uses the Hugging Face cache as the model inventory, `management` exposes it to
  clients, and `huggingface_auth` handles gated repos.
- **Prompt formatting** — `prompt_template` applies the model's chat template;
  `builtin_chat_template_names()` lists the bundled ones.
- **Tool calling** — `native_tool_parsing` and `tool_parsing` extract tool calls
  from model output, and `tool_emulation` (toolshim) fills in for models with no
  native tool support.
- **Richer outputs** — `thinking_output` separates reasoning blocks from the
  answer; `multimodal` handles image input.
- **Config** — `config_resolver` and `provider_utils` resolve settings such as
  `LOCAL_LLM_MODEL`.

### Loading models from a path

Set the model name to a local path to bypass the Hugging Face cache. A `.gguf`
file uses the llama.cpp backend. An MLX model directory containing
`config.json`, `tokenizer.json`, and SafeTensors weights uses the MLX backend;
a path to one of its `.safetensors` files is accepted as well. Relative paths
are resolved from the process working directory.

Models loaded this way remain user-owned: Sauron can load and evict them from
memory, but does not include them in the cached-model inventory or delete their
files.

## Shared plumbing

`api_client` (HTTP with auth and retries), `http_status` (mapping responses to
`ProviderError`), and the re-exported `retry`, `cache_semantics`, `thinking`, and
`formats` modules are what the provider implementations are built from — start
there when adding a new one.
