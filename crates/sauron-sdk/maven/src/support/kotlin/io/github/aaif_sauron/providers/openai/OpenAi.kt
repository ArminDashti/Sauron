package io.github.aaif_sauron.providers.openai

public fun provider(
    apiKey: String,
    baseUrl: String? = null,
): io.github.aaif_sauron.Provider = io.github.aaif_sauron.openaiProvider(apiKey, baseUrl)

public fun defaultModel(): String = io.github.aaif_sauron.openaiDefaultModel()
