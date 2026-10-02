package io.github.aaif_sauron.providers.databricks

public fun provider(host: String, token: String): io.github.aaif_sauron.Provider =
    io.github.aaif_sauron.databricksProvider(host, token)

public fun defaultModel(): String = io.github.aaif_sauron.databricksDefaultModel()
