package io.github.aaif_sauron.providers.groq

public fun provider(apiKey: String): io.github.aaif_sauron.Provider = io.github.aaif_sauron.groqProvider(apiKey)

public fun defaultModel(): String = io.github.aaif_sauron.groqDefaultModel()
