const $ = id => document.getElementById(id);
let sites = [], matched = null, activeUrl = '';
function notice(msg, error = false) { const el = $('notice'); el.textContent = msg; el.className = 'toast' + (error ? ' error' : ''); }
async function run(btn, site, mode, url) {
  if (!site) return;
  const text = mode === 'zone' ? `Purge the ENTIRE Bunny CDN Pull Zone for "${site.name}"? All cached files in this zone will be invalidated.` : `Purge this exact page URL from "${site.name}"?`;
  if (!confirm(text)) return;
  btn.disabled = true;
  const original = btn.textContent; btn.textContent = 'Purging…';
  try { await Bunny.message({ type: 'PURGE', siteId: site.id, mode, pageUrl: url }); notice(`✓ Bunny accepted the ${mode === 'zone' ? 'full zone' : 'URL'} purge for ${site.name}.`); }
  catch (err) { notice(err.message, true); }
  finally { btn.disabled = false; btn.textContent = original; }
}
async function init() {
  ({ sites } = await Bunny.data());
  $('count').textContent = `${sites.length} site${sites.length === 1 ? '' : 's'}`;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeUrl = tab?.url || '';
  matched = Bunny.match(sites, activeUrl);
  $('currentUrl').textContent = activeUrl ? (Bunny.normalHost(activeUrl) || 'Chrome internal page') : 'Unable to read current tab';
  $('currentName').textContent = matched ? matched.name : 'No matching site';
  $('currentStatus').textContent = matched ? '✓ Site configured' : 'Not configured';
  $('currentStatus').className = 'status' + (matched ? '' : ' no');
  $('purgeZone').disabled = $('purgeUrl').disabled = !matched;
  $('purgeZone').onclick = () => run($('purgeZone'), matched, 'zone');
  $('purgeUrl').onclick = () => run($('purgeUrl'), matched, 'url', activeUrl);
  $('selectSite').replaceChildren();
  for (const site of sites) { const option = document.createElement('option'); option.value = site.id; option.textContent = `${site.name} — ${Bunny.normalHost(site.domain)}`; $('selectSite').append(option); }
  $('purgeSelected').disabled = !sites.length;
  $('purgeSelected').onclick = () => run($('purgeSelected'), sites.find(s => s.id === $('selectSite').value), 'zone');
  $('shortcuts').onclick = async e => { e.preventDefault(); await chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }); };
}
init().catch(err => notice(err.message, true));
