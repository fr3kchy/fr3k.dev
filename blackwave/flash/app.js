
// BLACKWAVE flasher — app.js
// Modules: store, manifest, ui, terminal, detection, evidence, release, pwa
// Public API: window.BLACKWAVE.{openDevice, detect, getManifest, ...}

const BW = (window.BLACKWAVE = window.BLACKWAVE || {});

// ---------- store ----------
const store = (BW.store = {
  state: { device: null, release: null, downloadProgress: 0, detected: null, log: [] },
  listeners: new Set(),
  get(){ return this.state; },
  set(patch){ Object.assign(this.state, patch); this.listeners.forEach(fn => fn(this.state)); },
  subscribe(fn){ this.listeners.add(fn); return () => this.listeners.delete(fn); },
  log(line, cls){
    const ts = new Date().toISOString().split('T')[1].slice(0,12);
    this.state.log.push({ts, line, cls: cls||''});
    term && term.writeln(line, cls);
  },
});

// ---------- manifest ----------
const manifest = (BW.manifest = {
  data: null,
  async load(){
    const r = await fetch('manifest.json', {cache:'no-store'});
    this.data = await r.json();
    return this.data;
  },
  get(){ return this.data; },
  findDevice(slug){ return (this.data?.devices||[]).find(d => d.slug === slug); },
});

// ---------- terminal (advanced console) ----------
const term = (BW.terminal = {
  el: null,
  init(){
    this.el = document.getElementById('terminal');
    if (!this.el) return;
    this.el.innerHTML = '<span class="dim">// terminal ready — connect a device to begin</span>\n';
  },
  writeln(line, cls){
    if (!this.el) return;
    const span = document.createElement('span');
    if (cls) span.className = cls;
    span.textContent = '> ' + line + '\n';
    this.el.appendChild(span);
    this.el.scrollTop = this.el.scrollHeight;
  },
  clear(){ if (this.el) this.el.innerHTML = ''; },
});

// ---------- ui ----------
const ui = (BW.ui = {
  init(){
    document.querySelectorAll('[data-open-device]').forEach(b =>
      b.addEventListener('click', () => openDevice(b.dataset.openDevice)));
    document.querySelectorAll('[data-close]').forEach(b =>
      b.addEventListener('click', () => b.closest('.console-overlay').removeAttribute('data-open')));
    document.querySelectorAll('.console-overlay').forEach(o =>
      o.addEventListener('click', e => { if (e.target === o) o.removeAttribute('data-open'); }));
    term.init();
  },
  renderDeviceConsole(slug){
    const d = manifest.findDevice(slug);
    if (!d) return;
    const overlay = document.getElementById('consoleOverlay');
    const body = document.getElementById('consoleBody');
    const evidenceClass = ({
      'BLOCKED':'chip--blocked', 'PROBED/PARTIAL':'chip--probed',
      'BUILT':'chip--built', 'SOURCE_CONFIRMED':'chip--source',
    })[d.evidence] || '';
    const fl = d.artifacts.length, auth = d.artifacts.filter(a => a.flash_authorized).length;
    body.innerHTML = `
      <div class="console__section">
        <h4>Target</h4>
        <div class="console__row"><div class="k">Codename</div><div class="v">${d.codename}</div></div>
        <div class="console__row"><div class="k">Model</div><div class="v">${d.model}</div></div>
        <div class="console__row"><div class="k">Class</div><div class="v">${d.target_class}</div></div>
        <div class="console__row"><div class="k">Expected</div><div class="v">${d.expected_peripherals.join(' · ')}</div></div>
        <div class="console__row"><div class="k">Notes</div><div class="v">${d.notes}</div></div>
      </div>
      <div class="console__section">
        <h4>Current evidence</h4>
        <div class="console__row"><div class="k">State</div><div class="v"><span class="chip ${evidenceClass}">${d.evidence}</span></div></div>
        <div class="console__row"><div class="k">Details</div><div class="v">${d.evidence_details}</div></div>
      </div>
      <div class="console__section">
        <h4>Firmware artifacts</h4>
        ${d.artifacts.length === 0
          ? '<div class="console__row"><div class="k">Artifacts</div><div class="v v--warn">No artifacts registered for this target.</div></div>'
          : d.artifacts.map((a,i) => `
            <div class="console__row">
              <div class="k">#${i+1} ${a.flash_authorized ? 'AUTHORIZED' : 'QUARANTINED'}</div>
              <div class="v">
                <div>${a.path}</div>
                <div class="v--hash">sha256: ${a.sha256}</div>
                <div>provenance: ${a.provenance_status}</div>
              </div>
            </div>`).join('')}
        <div class="console__row"><div class="k">Summary</div><div class="v">${auth}/${fl} flash-authorized</div></div>
      </div>
      <div class="console__section">
        <h4>Flash flow (preflight)</h4>
        <div class="console__row"><div class="k">1. Connect</div><div class="v v--warn">WebSerial/WebUSB required. Browser must be Chromium-class.</div></div>
        <div class="console__row"><div class="k">2. Identify</div><div class="v v--warn">Confidence-scored probe. AMBIGUOUS halts the flow.</div></div>
        <div class="console__row"><div class="k">3. Verify</div><div class="v v--warn">SHA-256 must match <code class="v--hash">${d.artifacts[0]?.sha256?.slice(0,16)||'—'}</code>…</div></div>
        <div class="console__row"><div class="k">4. Backup</div><div class="v v--warn">Optional where flash geometry permits.</div></div>
        <div class="console__row"><div class="k">5. Flash</div><div class="v v--warn">Requires ${fl} artifact(s) verified; one partition-map render below.</div></div>
      </div>
      <div class="console__section">
        <h4>Partition map (reference)</h4>
        <div class="partition">
          <div class="partition__cell"><b>bootloader</b>0x1000</div>
          <div class="partition__cell"><b>partition-table</b>0x8000</div>
          <div class="partition__cell"><b>ota_0</b>0x10000</div>
          <div class="partition__cell"><b>ota_1</b>shifted</div>
          <div class="partition__cell"><b>filesystem</b>varies</div>
          <div class="partition__cell"><b>NVS</b>preserved</div>
        </div>
      </div>
      <div class="console__section">
        <h4>Never modify by default</h4>
        <ul class="console__row" style="display:block;padding-left:1rem;color:var(--amber)">
          <li>eFuses</li><li>permanent security bits</li><li>calibration</li>
          <li>private keys</li><li>identity region</li><li>RF transmission</li>
        </ul>
      </div>
      <div class="console__section">
        <h4>Action</h4>
        <div class="hero__cta">
          <button class="btn btn--primary" disabled>FLASH (simulated)</button>
          <button class="btn btn--ghost" disabled>BACKUP (simulated)</button>
          <button class="btn btn--ghost" disabled>VALIDATE (simulated)</button>
          <button class="btn btn--danger" disabled>RECOVERY (simulated)</button>
        </div>
        <p class="muted" style="margin-top:.6rem;font-size:.78rem">Phase A is the console + manifest + evidence surface. Real WebSerial/WebUSB wiring lands in Phase B/C.</p>
      </div>
    `;
    overlay.setAttribute('data-open','true');
  },
});

// ---------- detection (Phase B stub) ----------
const detection = (BW.detection = {
  async probe(){
    store.log('detection probe requested (Phase B)', 'warn');
    store.log('WebSerial supported: ' + (('serial' in navigator) ? 'yes' : 'no'), 'dim');
    store.log('WebUSB supported:    ' + (('usb' in navigator) ? 'yes' : 'no'), 'dim');
    return { confidence: 'NONE', evidence: [] };
  },
});

// ---------- evidence export ----------
const evidence = (BW.evidence = {
  export(slug){
    const d = manifest.findDevice(slug);
    if (!d) return;
    const record = {
      schema: 'blackwave-validation-record/v1',
      session_id: crypto.randomUUID(),
      device: slug,
      codename: d.codename,
      model: d.model,
      target_class: d.target_class,
      evidence_state: d.evidence,
      timestamp: new Date().toISOString(),
      tests: {},
      // Per mission: any actual hardware evidence would land here, but Phase A
      // has no real hardware behind it, so this is an empty template.
      note: 'Phase A: no physical tests executed. Template only.',
    };
    const blob = new Blob([JSON.stringify(record, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `blackwave-validation-${slug}-template.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
});

// ---------- open device ----------
function openDevice(slug){
  store.set({ device: slug });
  ui.renderDeviceConsole(slug);
  store.log('opened device console: ' + slug);
  store.log('manifest entry: ' + JSON.stringify({
    evidence: manifest.findDevice(slug)?.evidence,
    artifacts: manifest.findDevice(slug)?.artifacts.length,
  }), 'dim');
}

// ---------- PWA registration ----------
BW.initPWA = function(){
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
};

// ---------- boot ----------
window.addEventListener('DOMContentLoaded', async () => {
  try {
    await manifest.load();
    store.log('manifest loaded — ' + manifest.data.devices.length + ' devices', 'ok');
  } catch (e) {
    store.log('manifest load failed: ' + e.message, 'err');
  }
  ui.init();
  BW.initPWA();
});
