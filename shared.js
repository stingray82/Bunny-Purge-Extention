const Bunny = {
  async data() {
    const data = await chrome.storage.local.get({ sites: [], history: [] });
    return data;
  },
  normalHost(value) {
    try {
      let raw = value.trim();
      if (!raw.includes('://')) raw = 'https://' + raw;
      const url = new URL(raw);
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      return url.hostname.toLowerCase().replace(/\.$/, '');
    } catch { return ''; }
  },
  match(sites, url) {
    let host;
    try { host = new URL(url).hostname.toLowerCase().replace(/\.$/, ''); } catch { return null; }
    // Longest domain wins; a site's subdomains are optional.
    return [...sites].filter(site => {
      const domain = Bunny.normalHost(site.domain);
      return domain && (host === domain || (site.subdomains !== false && host.endsWith('.' + domain)));
    }).sort((a, b) => Bunny.normalHost(b.domain).length - Bunny.normalHost(a.domain).length)[0] || null;
  },
  async message(request) {
    const result = await chrome.runtime.sendMessage(request);
    if (!result?.ok) throw new Error(result?.error || 'Request failed');
    return result;
  },
  formatDate(ts) { return new Date(ts).toLocaleString(); }
};
