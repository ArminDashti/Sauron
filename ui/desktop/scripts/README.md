# Saurony

Put `saurony` in your $PATH if you want to launch via:

```
saurony .
```

This will open sauron GUI from any path you specify

# Unregister Deeplink Protocols (macos only)

`unregister-deeplink-protocols.js` is a script to unregister the deeplink protocol used by sauron like `sauron://`.
This is handy when you want to test deeplinks with the development version of Sauron.

# Usage

To unregister the deeplink protocols, run the following command in your terminal:
Then launch Sauron again and your deeplinks should work from the latest launched sauron application as it is registered on startup.

```bash
node scripts/unregister-deeplink-protocols.js
```

