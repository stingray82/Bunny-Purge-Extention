const $ = id => document.getElementById(id);
let sites = [];
function notify(msg, error = false) { const n = $('notice'); n.textContent = msg; n.className = 'toast' + (error ? ' error' : ''); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function reset() { $('siteForm').reset(); $('siteId').value = ''; $('apiKey').required = true; $('formTitle').textContent = 'Add a website'; $('save').textContent = 'Save website'; $('cancel').classList.add('hidden'); $('subdomains').checked = true; $('apiKey').type = 'password'; $('showKey').textContent = 'Show'; }
function edit(id) {
  const site = sites.find(s => s.id === id); if (!site) return;
  $('siteId').value = site.id; $('name').value = site.name; $('domain').value = site.domain; $('zoneId').value = site.zoneId;
  $('apiKey').value = ''; $('apiKey').required = false; $('apiKey').placeholder = 'Leave blank to keep existing key';
  $('subdomains').checked = site.subdomains !== false; $('formTitle').textContent = 'Edit website'; $('save').textContent = 'Update website'; $('cancel').classList.remove('hidden'); window.scrollTo({ top: 0, behavior: 'smooth' });
}
async function remove(id) {
  const site = sites.find(s => s.id === id); if (!site || !confirm(`Remove ${site.name} and its locally saved API key?`)) return;
  sites = sites.filter(s => s.id !== id); await chrome.storage.local.set({ sites }); render(); if ($('siteId').value === id) reset(); notify('Website removed.');
}
function render() {
  $('siteCount').textContent = `${sites.length} configured`;
  const list = $('siteList'); list.replaceChildren();
  if (!sites.length) list.textContent = 'No websites configured yet.';
  sites.forEach(site => {
    const row = document.createElement('div'); row.className = 'site-row';
    const info = document.createElement('div'); const title = document.createElement('strong'); title.textContent = site.name;
    const subtitle = document.createElement('small'); subtitle.textContent = `${site.domain} · Zone ${site.zoneId}`; info.append(title, subtitle);
    const actions = document.createElement('div'); actions.className = 'inline';
    const editBtn = document.createElement('button'); editBtn.className = 'btn'; editBtn.textContent = 'Edit'; editBtn.onclick = () => edit(site.id);
    const delBtn = document.createElement('button'); delBtn.className = 'btn danger'; delBtn.textContent = 'Remove'; delBtn.onclick = () => remove(site.id);
    actions.append(editBtn, delBtn); row.append(info, actions); list.append(row);
  });
}
async function renderHistory() {
  const { history = [] } = await chrome.storage.local.get('history');
  const list = $('historyList'); list.replaceChildren(); if (!history.length) { list.textContent = 'No purges yet.'; return; }
  history.forEach(item => {
    const row = document.createElement('div'); row.className = 'history-row';
    const text = document.createElement('strong'); text.className = item.ok ? 'good' : 'bad'; text.textContent = `${item.ok ? '✓' : '✗'} ${item.site} — ${item.mode === 'zone' ? 'Full Pull Zone' : 'Single URL'}`;
    const sub = document.createElement('div'); sub.className = 'muted'; sub.textContent = `${Bunny.formatDate(item.date)}${item.url ? ' · ' + item.url : ''}${item.error ? ' · ' + item.error : ''}`;
    row.append(text, sub); list.append(row);
  });
}
$('siteForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = $('siteId').value;
  const domain = Bunny.normalHost($('domain').value);
  if (!domain || !domain.includes('.') || domain === 'localhost') return notify('Enter a valid public website domain.', true);
  if (!/^[1-9]\d*$/.test($('zoneId').value.trim())) return notify('Enter a valid positive Pull Zone ID.', true);
  const existing = sites.find(s => s.id === id);
  const key = $('apiKey').value.trim() || existing?.apiKey;
  if (!key) return notify('Enter your Bunny account API key.', true);
  if (sites.some(s => s.id !== id && Bunny.normalHost(s.domain) === domain)) return notify('That domain already exists. Edit the existing website instead.', true);
  const site = { id: id || crypto.randomUUID(), name: $('name').value.trim(), domain, zoneId: $('zoneId').value.trim(), apiKey: key, subdomains: $('subdomains').checked };
  if (!site.name) return notify('Enter a site label.', true);
  if (existing) sites = sites.map(s => s.id === id ? site : s); else sites.push(site);
  await chrome.storage.local.set({ sites }); reset(); render(); notify(existing ? 'Website updated.' : 'Website saved. You can now purge it from the toolbar.');
});
$('cancel').onclick = reset;
$('showKey').onclick = () => { const shown = $('apiKey').type === 'password'; $('apiKey').type = shown ? 'text' : 'password'; $('showKey').textContent = shown ? 'Hide' : 'Show'; };
$('clearHistory').onclick = async () => { if (!confirm('Clear the purge history?')) return; await chrome.storage.local.set({ history: [] }); await renderHistory(); };
(async () => { ({ sites } = await Bunny.data()); reset(); render(); await renderHistory(); })().catch(err => notify(err.message, true));
