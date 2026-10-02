package io.github.aaif_sauron.providers.anthropic

public fun provider(
    apiKey: String,
    baseUrl: String? = null,
    betaHeaders: List<String> = emptyList(),
): io.github.aaif_sauron.Provider = io.github.aaif_sauron.anthropicProvider(apiKey, baseUrl, betaHeaders)

public fun defaultModel(): String = io.github.aaif_sauron.anthropicDefaultModel()
