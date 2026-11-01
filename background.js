importScripts('shared.js');

const MAX_LOGS = 40;
const busy = new Set();

async function logPurge(entry) {
  const { history = [] } = await chrome.storage.local.get('history');
  await chrome.storage.local.set({ history: [{ ...entry, date: Date.now() }, ...history].slice(0, MAX_LOGS) });
}

async function notify(title, message) {
  try {
    await chrome.notifications.create({
      type: 'basic', iconUrl: 'icons/icon128.png', title, message
    });
  } catch (err) { console.warn('Notification unavailable', err); }
}

async function purge(siteId, mode, pageUrl) {
  const { sites } = await Bunny.data();
  const site = sites.find(s => s.id === siteId);
  if (!site) throw new Error('This saved site no longer exists.');
  if (!site.apiKey?.trim()) throw new Error('Add an account API key in Settings.');
  if (mode !== 'zone' && mode !== 'url') throw new Error('Unknown purge mode.');
  if (mode === 'zone' && !/^[1-9]\d*$/.test(String(site.zoneId))) throw new Error('Enter a valid Pull Zone ID.');
  if (mode === 'url') {
    let parsed;
    try { parsed = new URL(pageUrl); } catch { throw new Error('Invalid page URL.'); }
    if (!['https:', 'http:'].includes(parsed.protocol) || !Bunny.match([site], pageUrl)) throw new Error('Page URL does not match the saved domain.');
    parsed.hash = '';
    pageUrl = parsed.toString();
  }
  const busyKey = siteId + ':' + mode;
  if (busy.has(busyKey)) throw new Error('A purge is already running for this site.');
  busy.add(busyKey);
  try {
    const endpoint = mode === 'zone'
      ? `https://api.bunny.net/pullzone/${site.zoneId}/purgeCache`
      : `https://api.bunny.net/purge?${new URLSearchParams({ url: pageUrl, async: 'false' })}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'AccessKey': site.apiKey.trim(),
        'Accept': 'application/json',
        ...(mode === 'zone' ? { 'Content-Type': 'application/json' } : {})
      },
      ...(mode === 'zone' ? { body: '{}' } : {}),
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) {
      const body = (await response.text().catch(() => '')).slice(0, 180);
      throw new Error(`Bunny API returned ${response.status}${body ? ': ' + body : ''}`);
    }
    await logPurge({ site: site.name, mode, url: mode === 'url' ? pageUrl : '', ok: true });
    return { ok: true, site: site.name };
  } catch (error) {
    await logPurge({ site: site.name, mode, url: mode === 'url' ? pageUrl : '', ok: false, error: String(error.message) });
    throw error;
  } finally { busy.delete(busyKey); }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'PURGE') {
    purge(message.siteId, message.mode, message.pageUrl)
      .then(sendResponse).catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});

chrome.commands.onCommand.addListener(async command => {
  if (command !== 'purge-current-site') return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const { sites } = await Bunny.data();
    const site = Bunny.match(sites, tab?.url || '');
    if (!site) { await notify('Bunny Purge', 'This page does not match a saved site.'); return; }
    // Shortcut always purges the full zone; no other site is ever selected as a fallback.
    await purge(site.id, 'zone');
    await notify('Bunny Purge — success', `Purged ${site.name}'s entire Pull Zone.`);
  } catch (error) {
    await notify('Bunny Purge — failed', error.message);
  }
});
