# Bunny Purge — Chrome extension

A Manifest V3 extension to clear bunny.net CDN Pull Zones for multiple configured websites.

## Install in Chrome
1. Unzip `bunny-purge.zip` into a permanent folder.
2. Visit `chrome://extensions`, switch on **Developer mode**, and select **Load unpacked**.
3. Select the unzipped `bunny-purge` folder (the folder containing `manifest.json`).
4. Pin **Bunny Purge** to your Chrome toolbar.
5. Click the icon, then **Manage sites**; add a site name, domain, Bunny **Pull Zone ID** and Bunny **account API key**.
6. When visiting a configured domain, click the extension to purge the entire zone or the current page URL. Or select any saved site to purge its full zone.
7. Press **Ctrl+Shift+9** (Mac: **Command+Shift+9**) on a saved website to purge its entire zone. Configure/resolve shortcut conflicts at `chrome://extensions/shortcuts`.

## Bunny API
- Full zone: `POST https://api.bunny.net/pullzone/{id}/purgeCache`
- Exact page URL: `POST https://api.bunny.net/purge?url={encoded_url}&async=false`
- Authentication: `AccessKey` request header containing the Bunny account API key.

## Security and behavior
- Credentials are saved in **chrome.storage.local**, not synced and not encrypted with a separate passphrase. Anyone with access to the Chrome profile or extension data may be able to retrieve them. Use a separate browser profile on a shared machine.
- Data is not sent to third parties or to an extension developer server; purge requests go directly to `api.bunny.net`.
- Saved domains are matched on exact hostname or subdomains if enabled (e.g., example.com also matches www.example.com). Longest matching domain wins.
- Full-zone purge has a confirmation dialog in the popup. The shortcut directly triggers a full-zone purge (with a system notification afterward) because no confirmation dialog can be displayed by a background shortcut.
- URL purge is restricted to the current page on a matching configured domain and removes URL fragments.
- The extension never silently purges a different site if the current page does not match a saved domain.
- After full-zone purges, the origin can see temporary additional load as caches are refilled.
- Chrome notification display varies depending on OS/Chrome notification permissions.

## Development
All files are plain HTML, CSS and JavaScript. No build step, remote code, analytics, libraries or backend needed. After modifying the code, reload the extension from `chrome://extensions`.

## Limitations
- This tool handles bunny.net CDN / Pull Zones, not Bunny Stream libraries or Bunny Storage cache management.
- Single-URL purges use the URL of the visited site, which must be associated with the relevant Pull Zone in Bunny.
- There is no live API verification when saving a site; you'll receive API error feedback upon a purge attempt.
