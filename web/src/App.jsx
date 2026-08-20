import React, { useEffect, useMemo, useRef, useState } from 'react';

const enc = (rel) => rel.split('/').map(encodeURIComponent).join('/');
const fname = (rel) => rel.split('/').pop();

async function api(path, opts) {
  const res = await fetch(path, opts && {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const PROVIDER_META = {
  gemini: { icon: '🍌', name: 'Nano Banana' },
  fal: { icon: '🌀', name: 'GPT Image 2 · fal' },
  openai: { icon: '⚡', name: 'GPT Image 2 · 官方' },
  mock: { icon: '🧪', name: '測試（假圖）' }
};
const pickDefaultProvider = (cfg, mock) =>
  cfg.keys.fal ? 'fal' : cfg.keys.openai ? 'openai' : cfg.keys.gemini ? 'gemini' : mock ? 'mock' : 'fal';
const TIERS = [
  { id: 'low', name: '慳錢' },
  { id: 'std', name: '標準' },
  { id: 'high', name: '高清 2K' },
  { id: 'ultra', name: '超清 4K' }
];
const ASPECTS = ['1:1', '4:3', '3:4', '16:9', '9:16'];
const KIND_LABEL = {
  single: '單張', building: '3 級 + 陰影', chest: '4 狀態', part: '部件套（定位+淨件）', series: '成套（鏈式一致）', ninepatch: '九宮格（可拉伸）'
};

function perImageCost(provider, tier, cfg) {
  if (provider === 'gemini') return /flash/i.test(cfg?.geminiModel || '') ? 0.03 : tier === 'ultra' ? 0.24 : 0.134;
  if (provider === 'openai' || provider === 'fal') return tier === 'low' ? 0.01 : tier === 'std' ? 0.05 : 0.17;
  return 0;
}

export default function App() {
  const [tab, setTab] = useState('blueprint');
  const [cfg, setCfg] = useState(null);
  const [bp, setBp] = useState(null);
  const [sp, setSp] = useState(null);
  const [dirs, setDirs] = useState([]);
  const [openPacks, setOpenPacks] = useState({});
  const [curDir, setCurDir] = useState(null);
  const [files, setFiles] = useState([]);
  const [q, setQ] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [refs, setRefs] = useState([]);
  const [form, setForm] = useState({
    prompt: '', styleId: 'casual-glossy', categoryId: 'icon',
    aspect: '1:1', tier: 'std', count: 1, transparent: true,
    gemini: true, openai: false, fal: true
  });
  const [busy, setBusy] = useState(false);
  const [batches, setBatches] = useState([]);
  const [pending, setPending] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [setItem, setSetItem] = useState(null); // blueprint item being generated
  const [lightbox, setLightbox] = useState(null);
  const [toast, setToast] = useState(null);
  const searchTimer = useRef(null);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3600);
  };

  const loadBlueprint = () => api('/api/blueprint').then(setBp).catch(() => notify('讀取藍圖失敗'));

  useEffect(() => {
    api('/api/config').then(setCfg).catch(() => notify('讀取設定失敗'));
    loadBlueprint();
    api('/api/starparts').then(setSp).catch(() => {});
    api('/api/packs').then((d) => {
      setDirs(d.dirs);
      const names = [...new Set(d.dirs.map((x) => x.dir.split('/')[0]))];
      if (names.length) setOpenPacks({ [names[0]]: true });
    }).catch(() => notify('讀取素材庫失敗'));
    api('/api/history').then((d) => setBatches(d.batches)).catch(() => {});
  }, []);

  const packs = useMemo(() => {
    const g = {};
    for (const d of dirs) {
      const top = d.dir.split('/')[0];
      (g[top] ??= []).push(d);
    }
    return g;
  }, [dirs]);

  const openDir = (dir) => {
    setCurDir(dir);
    setSearchResults(null);
    setQ('');
    api(`/api/files?dir=${enc(dir)}`).then((d) => setFiles(d.files)).catch(() => setFiles([]));
  };

  const onSearch = (val) => {
    setQ(val);
    clearTimeout(searchTimer.current);
    if (val.trim().length < 2) { setSearchResults(null); return; }
    searchTimer.current = setTimeout(() => {
      api(`/api/search?q=${encodeURIComponent(val.trim())}`).then((d) => setSearchResults(d.files));
    }, 300);
  };

  const toggleRef = (rel) => {
    setRefs((r) => r.includes(rel) ? r.filter((x) => x !== rel) : r.length >= 8 ? (notify('參考圖最多 8 張'), r) : [...r, rel]);
  };

  const generate = async () => {
    const providers = [form.gemini && 'gemini', form.fal && 'fal', form.openai && 'openai'].filter(Boolean);
    if (!providers.length) return notify('至少揀一個模型');
    if (!form.prompt.trim()) return notify('寫低你想生成乜先');
    setBusy(true);
    setPending({ providers, prompt: form.prompt, count: form.count });
    try {
      const meta = await api('/api/generate', {
        providers, prompt: form.prompt, styleId: form.styleId, categoryId: form.categoryId,
        refs, count: form.count, aspect: form.aspect, tier: form.tier, transparent: form.transparent
      });
      setBatches((b) => [meta, ...b]);
      const fails = meta.results.filter((r) => !r.ok);
      if (fails.length) notify(`${fails.map((f) => PROVIDER_META[f.provider]?.name || f.provider).join('、')} 出錯，詳情喺結果度`);
    } catch (e) {
      notify(`生成失敗：${e.message}`);
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const removeBg = async (rel) => {
    try {
      const d = await api('/api/removebg', { path: rel });
      if (!d.changed) return notify('呢張圖本身已經係透明背景');
      setLightbox(d.path);
      notify('去背完成，已存入 Generated/edits');
    } catch (e) {
      notify(`去背失敗：${e.message}`);
    }
  };

  const useAsRef = (rel) => {
    if (!refs.includes(rel)) setRefs((r) => [...r, rel].slice(0, 8));
    setTab('free');
    notify('已加入參考圖（去咗「自由生成」）');
  };

  const grid = searchResults ?? files;
  const keysMissing = cfg && !cfg.keys.gemini && !cfg.keys.openai && !cfg.keys.fal;

  return (
    <div className="app">
      <header>
        <div className="logo">🎨 ArtPack Studio {cfg?.version && <span className="hint" style={{ fontSize: 12, fontWeight: 400 }}>v{cfg.version}</span>}</div>
        <nav className="tabs">
          <button className={tab === 'blueprint' ? 'sel' : ''} onClick={() => setTab('blueprint')}>⚽ 足球藍圖</button>
          <button className={tab === 'starparts' ? 'sel' : ''} onClick={() => setTab('starparts')}>👤 球星零件</button>
          <button className={tab === 'free' ? 'sel' : ''} onClick={() => setTab('free')}>🖌️ 自由生成</button>
        </nav>
        <div className="header-right">
          <button className="ghost sm" title="拉最新版並重啟（約一分鐘）" onClick={async () => {
            if (!confirm('更新 studio 去最新版？會斷線約一分鐘。')) return;
            try {
              const r = await fetch('/api/update', { method: 'POST' }).then((x) => x.json());
              notify(r.ok ? '更新緊… 一分鐘後 refresh 呢頁' : '唔得：' + r.error);
            } catch {
              notify('更新請求發唔出');
            }
          }}>🔄</button>
          <a className="ghost sm" href="/api/export.zip" title="下載生成品 zip（Football Pack）" style={{ textDecoration: 'none', padding: '6px 10px' }}>⬇️ 出品</a>
          {cfg && (
            <span className="keychips">
              <span className={cfg.keys.gemini ? 'on' : 'off'}>🍌 {cfg.keys.gemini ? '已連接' : '未設定'}</span>
              <span className={cfg.keys.fal ? 'on' : 'off'}>🌀 {cfg.keys.fal ? '已連接' : '未設定'}</span>
            </span>
          )}
          <button className="ghost" onClick={() => setSettingsOpen(true)}>⚙️ 設定</button>
        </div>
      </header>

      {keysMissing && (
        <div className="banner">
          仲未設定任何 API key — 撳右上角「⚙️ 設定」貼上 fal.ai 或者 Gemini 條 key 就可以開始生成。{bp?.mock && ' 而家可以用 🧪 測試模式行流程（出假圖）。'}
        </div>
      )}

      <div className="main">
        <aside>
          <input className="search" placeholder="🔍 搜尋 6,000+ 素材…" value={q} onChange={(e) => onSearch(e.target.value)} />
          <div className="packlist">
            {Object.entries(packs).map(([pack, list]) => (
              <div key={pack}>
                <div className="pack" onClick={() => setOpenPacks((o) => ({ ...o, [pack]: !o[pack] }))}>
                  <span>{openPacks[pack] ? '▾' : '▸'} {pack}</span>
                  <span className="cnt">{list.reduce((s, d) => s + d.count, 0)}</span>
                </div>
                {openPacks[pack] && list.map((d) => (
                  <div key={d.dir} className={'dir' + (curDir === d.dir ? ' active' : '')} onClick={() => { openDir(d.dir); setTab('free'); }}>
                    <span className="dirname">{d.dir.split('/').slice(1).join('/') || '（根目錄）'}</span>
                    <span className="cnt">{d.count}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {tab === 'blueprint' && (
          <section className="content">
            <div className="card intro">
              <b>小朋友足球遊戲素材藍圖</b> — 每個項目撳「生成」就會出<b>成套部件</b>：建築有 3 級＋自動陰影、寶箱有 4 個狀態、角色部件有「頭上定位版＋淨部件版＋染色灰階版」，全部跟返你現有 pack 嘅檔案結構存入 <code>Football Pack/</code>，並自動攞相關現有素材做風格參考。
              <div className="hint" style={{ marginTop: 6 }}>球星部件係「特徵描述」生成（唔會send真人名俾AI）；如果隻game會商業上架，記住真人肖像要另外處理授權。</div>
            </div>
            {bp && bp.categories.map((cat) => (
              <div key={cat} className="card">
                <div className="gridhead">{cat} <span className="hint">（{bp.items.filter((i) => i.cat === cat && i.done).length}/{bp.items.filter((i) => i.cat === cat).length} 完成）</span></div>
                <div className="bpgrid">
                  {bp.items.filter((i) => i.cat === cat).map((item) => (
                    <div key={item.id} className={'bpitem' + (item.done ? ' done' : '')}>
                      <div className="bptitle">
                        {item.done ? '✅ ' : ''}{item.name}
                        <span className="kind">{KIND_LABEL[item.kind]}</span>
                      </div>
                      <div className="bpparts">{item.steps.map((s) => s.file).join(' · ')}</div>
                      <div className="bpactions">
                        <button className="ghost sm" onClick={() => setSetItem(item)}>{item.done ? '再生成' : '✨ 生成'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!bp && <div className="card hint pad">載入藍圖中…</div>}
          </section>
        )}

        {tab === 'starparts' && (
          <StarPartsView sp={sp} cfg={cfg} mock={bp?.mock} onPreview={setLightbox} notify={notify}
            reload={() => api('/api/starparts').then(setSp).catch(() => {})} />
        )}

        {tab === 'free' && (
          <section className="content">
            <div className="composer card">
              <div className="refbar">
                <span className="label">參考圖（喺下面素材庫㩒圖加入）：</span>
                {refs.length === 0 && <span className="hint">未揀 — AI 會純靠文字描述</span>}
                {refs.map((r) => (
                  <span key={r} className="refchip" title={r}>
                    <img src={`/thumb/96/${enc(r)}`} alt="" />
                    <button onClick={() => toggleRef(r)}>×</button>
                  </span>
                ))}
              </div>

              <div className="row chips">
                {cfg?.categories.map((cat) => (
                  <button key={cat.id}
                    className={'chip' + (form.categoryId === cat.id ? ' sel' : '')}
                    onClick={() => setForm((f) => ({ ...f, categoryId: cat.id }))}>{cat.name}</button>
                ))}
              </div>

              <textarea
                placeholder="想生成乜？例如：一個紫色魔法藥水樽，玻璃樽身，木塞頂，內裡發光"
                value={form.prompt}
                onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate(); }}
              />

              <div className="row opts">
                <label>風格
                  <select value={form.styleId} onChange={(e) => setForm((f) => ({ ...f, styleId: e.target.value }))}>
                    {cfg?.styles.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                <label>比例
                  <select value={form.aspect} onChange={(e) => setForm((f) => ({ ...f, aspect: e.target.value }))}>
                    {ASPECTS.map((a) => <option key={a}>{a}</option>)}
                  </select>
                </label>
                <label>質素
                  <select value={form.tier} onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}>
                    {TIERS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
                <label>張數
                  <select value={form.count} onChange={(e) => setForm((f) => ({ ...f, count: +e.target.value }))}>
                    {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <label className="check">
                  <input type="checkbox" checked={form.transparent}
                    onChange={(e) => setForm((f) => ({ ...f, transparent: e.target.checked }))} />
                  透明背景（自動去背）
                </label>
              </div>

              <div className="row bottom">
                <div className="providers">
                  {['gemini', 'fal', 'openai'].map((id) => (
                    <button key={id}
                      className={'provider' + (form[id] ? ' sel' : '')}
                      onClick={() => setForm((f) => ({ ...f, [id]: !f[id] }))}>
                      {PROVIDER_META[id].icon} {PROVIDER_META[id].name}
                    </button>
                  ))}
                  {['gemini', 'fal', 'openai'].filter((id) => form[id]).length >= 2 && <span className="pk">⚔️ PK 模式</span>}
                </div>
                <div className="go">
                  <span className="cost">≈ US${cfg ? (['gemini', 'fal', 'openai'].reduce((s, id) => s + (form[id] ? perImageCost(id, form.tier, cfg) : 0), 0) * form.count).toFixed(2) : '–'}</span>
                  <button className="primary" disabled={busy} onClick={generate}>
                    {busy ? '生成中…' : '✨ 生成'}
                  </button>
                </div>
              </div>
            </div>

            {pending && (
              <div className="card batch">
                <div className="batchhead"><b>{pending.prompt}</b></div>
                <div className="cols" style={{ '--n': pending.providers.length }}>
                  {pending.providers.map((p) => (
                    <div key={p} className="col">
                      <div className="colhead">{PROVIDER_META[p].icon} {PROVIDER_META[p].name}</div>
                      <div className="spinner">🎨 畫緊… 通常 5–30 秒</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {batches.map((b) => (
              <div key={b.id} className="card batch">
                <div className="batchhead">
                  <b>{b.userPrompt}</b>
                  <span className="meta">{new Date(b.ts).toLocaleString('zh-HK')} · {b.aspect} · {TIERS.find((t) => t.id === b.tier)?.name}{b.refs?.length ? ` · ${b.refs.length} 張參考圖` : ''}</span>
                </div>
                <div className="cols" style={{ '--n': Math.max(1, b.results.length) }}>
                  {b.results.map((r) => (
                    <div key={r.provider} className="col">
                      <div className="colhead">
                        {PROVIDER_META[r.provider]?.icon} {PROVIDER_META[r.provider]?.name}
                        {r.ok && <span className="ms">{(r.ms / 1000).toFixed(1)}s</span>}
                      </div>
                      {!r.ok && <div className="error">⚠️ {r.error}</div>}
                      <div className="imgs">
                        {r.images.map((im) => (
                          <div key={im.path} className="genimg checker">
                            <img src={`/file/${enc(im.path)}`} alt="" onClick={() => setLightbox(im.path)} />
                            <div className="actions">
                              <button title="用呢張做參考圖再生成" onClick={() => useAsRef(im.path)}>📎 做參考</button>
                              <button title="再去一次背景" onClick={() => removeBg(im.path)}>✂️ 去背</button>
                              <a href={`/file/${enc(im.path)}`} download={fname(im.path)}>⬇️ 下載</a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="card">
              <div className="gridhead">
                {searchResults ? `搜尋「${q}」— ${searchResults.length} 個結果` : curDir ? `${curDir}（${files.length}）` : '素材庫 — 左邊揀個資料夾，㩒圖就加入參考'}
              </div>
              <div className="assetgrid">
                {grid.map((rel) => (
                  <div key={rel}
                    className={'asset checker' + (refs.includes(rel) ? ' sel' : '')}
                    title={fname(rel)}
                    onClick={() => toggleRef(rel)}>
                    <img loading="lazy" src={`/thumb/96/${enc(rel)}`} alt="" />
                    {refs.includes(rel) && <span className="badge">{refs.indexOf(rel) + 1}</span>}
                  </div>
                ))}
                {grid.length === 0 && <div className="hint pad">呢度暫時冇圖</div>}
              </div>
            </div>
          </section>
        )}
      </div>

      {setItem && cfg && bp && (
        <SetModal item={setItem} cfg={cfg} mock={bp.mock}
          onClose={() => { setSetItem(null); loadBlueprint(); }}
          onPreview={setLightbox} notify={notify} />
      )}

      {settingsOpen && cfg && (
        <Settings cfg={cfg} onClose={() => setSettingsOpen(false)}
          onSaved={(next) => { setCfg(next); notify('已儲存'); }} notify={notify} />
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <div className="lightbox-inner checker" onClick={(e) => e.stopPropagation()}>
            <img src={`/file/${enc(lightbox)}`} alt="" />
            <div className="actions">
              <button onClick={() => { useAsRef(lightbox); }}>📎 做參考</button>
              <button onClick={() => removeBg(lightbox)}>✂️ 去背</button>
              <a href={`/file/${enc(lightbox)}`} download={fname(lightbox)}>⬇️ 下載</a>
              <button onClick={() => setLightbox(null)}>關閉</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

const PART_GROUP = (file) =>
  file.startsWith('hair') ? '髮型' : file.startsWith('eyewear') ? '配飾' : file.startsWith('eye') ? '眼' : file.startsWith('brow') ? '眉' : file.startsWith('mouth') ? '嘴' : file.startsWith('beard') ? '鬍鬚' : '其他';

function StarPartsView({ sp, cfg, mock, onPreview, notify, reload }) {
  const [provider, setProvider] = useState(null);
  const [tier, setTier] = useState('std');
  const [batch, setBatch] = useState(null);
  const [starting, setStarting] = useState(false);
  const batchPoll = useRef(null);
  const wasRunning = useRef(false);

  const trackBatch = (b) => {
    setBatch(b);
    if (b && !b.done && !batchPoll.current) {
      wasRunning.current = true;
      batchPoll.current = setInterval(async () => {
        try {
          const cur = await api('/api/star-batch');
          if (cur.none) return;
          setBatch(cur);
          reload();
          if (cur.done) {
            clearInterval(batchPoll.current);
            batchPoll.current = null;
            const js = Object.values(cur.jobs);
            const fails = js.filter((j) => j.error || j.steps?.some((s) => s.status === 'error')).length;
            notify(fails ? `批量完成：${js.length - fails} 件成功、${fails} 件出錯（嗰啲卡撳「再生成」）` : `✅ 批量完成！${js.length} 件全部生成好`);
          }
        } catch {}
      }, 2000);
    }
  };

  useEffect(() => {
    // 淨係 resume 行緊嘅 batch；完成咗嘅唔好翻叮（file system 嘅 done 狀態先係真相）
    api('/api/star-batch').then((b) => { if (!b.none && !b.done) trackBatch(b); }).catch(() => {});
    return () => { clearInterval(batchPoll.current); batchPoll.current = null; };
  }, []);

  if (!sp || !cfg) return <section className="content"><div className="card hint pad">載入球星零件中…</div></section>;

  const prov = provider ?? pickDefaultProvider(cfg, mock);
  const per = (perImageCost(prov, tier, cfg) * 2).toFixed(2);
  const groups = {};
  for (const it of sp.items) (groups[PART_GROUP(it.file)] ??= []).push(it);
  const doneCount = sp.items.filter((i) => i.done).length;
  const pendingCount = sp.items.filter((i) => !i.done).length;
  const batchRunning = batch && !batch.done;
  const batchDoneCount = batch ? Object.values(batch.jobs).filter((j) => j.done).length : 0;

  const startBatch = async () => {
    setStarting(true);
    try {
      const b = await api('/api/star-batch', { provider: prov, tier });
      trackBatch(b);
      notify(`開始批量生成 ${b.total} 件（兩件並行）`);
    } catch (e) {
      notify(`開始失敗：${e.message}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <section className="content">
      <div className="card intro">
        <b>球星零件工場</b> — 五大類（髮型/眼/眉/嘴/鬍鬚）合共 <b>{sp.items.length} 款待生成</b>（完成 {doneCount}/{sp.items.length}），另有 {sp.coverage.length} 款直接沿用現有部件（見底部「已有」清單）。每件已預綁 reference（頭型模板＋同類風格參考）同詳細 prompt，撳「⚡ 一鍵生成」就出「定位版＋淨件版＋灰階染色版」，檔名直接續 pack 編號。
        <div className="row" style={{ marginTop: 10 }}>
          <label>模型&nbsp;
            <select value={prov} onChange={(e) => setProvider(e.target.value)}>
              <option value="fal">🌀 GPT Image 2 via fal（推薦）{cfg.keys.fal ? '' : '（未有 key）'}</option>
              <option value="gemini">🍌 Nano Banana{cfg.keys.gemini ? '' : '（未有 key）'}</option>
              <option value="openai">⚡ GPT Image 2 官方 OpenAI{cfg.keys.openai ? '' : '（未有 key）'}</option>
              {mock && <option value="mock">🧪 測試（假圖，免費）</option>}
            </select>
          </label>
          <label>質素&nbsp;
            <select value={tier} onChange={(e) => setTier(e.target.value)}>
              {TIERS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <span className="cost">每件 ≈ US${per}（2 次生成）</span>
          {!batchRunning && pendingCount > 0 && (
            <button className="primary" disabled={starting} onClick={startBatch}>
              {starting ? '開始緊…' : `⚡ 未生成一次過做晒（${pendingCount} 件 ≈ US$${(per * pendingCount).toFixed(2)}）`}
            </button>
          )}
          {batchRunning && (
            <>
              <span className="pk">🏭 批量生成緊 {batchDoneCount}/{batch.total}（兩件並行）</span>
              <button className="ghost" onClick={async () => { await api('/api/star-batch/stop', {}); notify('已停止排隊，行緊嗰兩件會完成'); }}>⏹ 停止</button>
            </>
          )}
        </div>
      </div>

      {Object.entries(groups).map(([g, items]) => (
        <div key={g} className="card">
          <div className="gridhead">{g}（{items.filter((i) => i.done).length}/{items.length}）</div>
          <div className="spgrid">
            {items.map((it) => (
              <StarPartCard key={it.id} item={it} provider={prov} tier={tier} onPreview={onPreview} notify={notify}
                batchJob={batch?.jobs?.[it.id]} />
            ))}
          </div>
        </div>
      ))}

      <div className="card">
        <details>
          <summary className="gridhead" style={{ cursor: 'pointer' }}>✅ 已有・唔使生成（{sp.coverage.length} 款 → 現有部件）</summary>
          <div className="covgrid">
            {sp.coverage.map((cv, i) => (
              <div key={i} className="covitem" onClick={() => cv.path && onPreview(cv.path)}>
                {cv.path && <img className="checker" src={`/thumb/96/${enc(cv.path)}`} alt="" />}
                <span>{cv.zh}<br /><code>{cv.file}</code></span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}

function StarPartCard({ item, provider, tier, onPreview, notify, batchJob }) {
  const [prompt, setPrompt] = useState(item.prompt);
  const [ownJob, setOwnJob] = useState(null);
  const [open, setOpen] = useState(false);
  const pollRef = useRef(null);
  useEffect(() => () => clearInterval(pollRef.current), []);
  const job = ownJob ?? batchJob ?? null;
  const setJob = setOwnJob;

  const start = async () => {
    try {
      const j = await api('/api/set-jobs', { itemId: item.id, provider, tier, customPrompt: prompt });
      setJob(j);
      pollRef.current = setInterval(async () => {
        try {
          const cur = await api(`/api/set-jobs/${j.id}`);
          setJob(cur);
          if (cur.done) {
            clearInterval(pollRef.current);
            const fails = cur.steps.filter((s) => s.status === 'error').length;
            notify(fails ? `${item.name}：有 ${fails} 步出錯` : `✅ ${item.name} 生成完成`);
          }
        } catch {}
      }, 1500);
    } catch (e) {
      notify(`開始失敗：${e.message}`);
    }
  };

  const running = job && !job.done;
  const outputs = job?.steps.flatMap((s) => s.images || []) ?? [];
  const isDone = job?.done && !job.steps.some((s) => s.status === 'error');

  return (
    <div className={'spcard' + (item.done || isDone ? ' done' : '')}>
      <div className="bptitle">
        {(item.done || isDone) ? '✅ ' : ''}{item.name}
        <span className="kind">{item.file}</span>
      </div>
      <div className="hint">俾：{item.zhFor}</div>
      <div className="sprefs">
        <span className="label">Ref：</span>
        {item.refs.map((r) => (
          <img key={r} className="checker" title={r} src={`/thumb/96/${enc(r)}`} onClick={() => onPreview(r)} alt="" />
        ))}
      </div>
      {open && (
        <textarea className="settext" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      )}
      {job?.error && <div className="error">⚠️ {job.error}</div>}
      {job && (
        <div className="spsteps">
          {(job.steps || []).map((s) => (
            <span key={s.key} className={'spstep ' + s.status}>
              {s.status === 'done' ? '✅' : s.status === 'running' ? '🎨' : s.status === 'error' ? '⚠️' : '⌛'} {s.name}
            </span>
          ))}
          {job.steps.filter((s) => s.status === 'error').map((s) => <div key={s.key} className="error">{s.error}</div>)}
        </div>
      )}
      {outputs.length > 0 && (
        <div className="sprefs">
          {outputs.map((p) => (
            <img key={p} className="checker" src={`/thumb/96/${enc(p)}?t=${job.done ? 'f' : Date.now()}`} onClick={() => onPreview(p)} alt="" />
          ))}
        </div>
      )}
      <div className="bpactions">
        <button className="ghost sm" onClick={() => setOpen((o) => !o)}>{open ? '收埋 prompt' : '✏️ 改 prompt'}</button>
        <button className="ghost sm primaryish" disabled={running} onClick={start}>
          {running ? '生成緊…' : (item.done || isDone) ? '再生成' : '⚡ 一鍵生成'}
        </button>
      </div>
    </div>
  );
}

function SetModal({ item, cfg, mock, onClose, onPreview, notify }) {
  const [provider, setProvider] = useState(pickDefaultProvider(cfg, mock));
  const [tier, setTier] = useState('std');
  const [prompt, setPrompt] = useState(item.prompt);
  const [job, setJob] = useState(null);
  const pollRef = useRef(null);

  const genSteps = item.steps.filter((s) => !s.local).length;
  const cost = (perImageCost(provider, tier, cfg) * genSteps).toFixed(2);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const start = async () => {
    try {
      const j = await api('/api/set-jobs', { itemId: item.id, provider, tier, customPrompt: prompt });
      setJob(j);
      pollRef.current = setInterval(async () => {
        try {
          const cur = await api(`/api/set-jobs/${j.id}`);
          setJob(cur);
          if (cur.done) {
            clearInterval(pollRef.current);
            const fails = cur.steps.filter((s) => s.status === 'error').length;
            notify(fails ? `完成，但有 ${fails} 步出錯` : `✅ 成套生成完成！已存入 ${cur.outDir}`);
          }
        } catch {}
      }, 1500);
    } catch (e) {
      notify(`開始失敗：${e.message}`);
    }
  };

  const STATUS_ICON = { pending: '⌛', running: '🎨', done: '✅', error: '⚠️' };

  return (
    <div className="lightbox" onClick={job && !job.done ? undefined : onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <h2>{item.name} <span className="kind">{KIND_LABEL[item.kind]}</span></h2>
        <p className="hint">會自動攞你現有 pack 相關素材做風格參考，出齊 {item.steps.length} 個部件，存入 <code>Football Pack/{item.cat}/</code></p>

        {!job && (
          <>
            {item.kind === 'series' ? (
              <p className="hint">成套項目每件嘅 prompt 喺 <code>lib/blueprint.js</code> 逐件定義（下面步驟列表就係嗰啲件）— 想改要改藍圖檔，呢度冇得改。</p>
            ) : (
              <label className="field">描述（可以自己改）
                <textarea className="settext" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              </label>
            )}
            <div className="row" style={{ marginTop: 10 }}>
              <label>模型&nbsp;
                <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                  <option value="fal">🌀 GPT Image 2 via fal{cfg.keys.fal ? '' : '（未有 key）'}</option>
                  <option value="gemini">🍌 Nano Banana{cfg.keys.gemini ? '' : '（未有 key）'}</option>
                  <option value="openai">⚡ GPT Image 2 官方{cfg.keys.openai ? '' : '（未有 key）'}</option>
                  {mock && <option value="mock">🧪 測試（假圖，免費）</option>}
                </select>
              </label>
              <label>質素&nbsp;
                <select value={tier} onChange={(e) => setTier(e.target.value)}>
                  {TIERS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <span className="cost">≈ US${cost}（{genSteps} 次生成）</span>
            </div>
          </>
        )}

        <div className="steps">
          {(job?.steps || item.steps.map((s) => ({ ...s, status: 'pending', images: [] }))).map((s) => (
            <div key={s.key} className={'steprow ' + s.status}>
              <span className="sicon">{STATUS_ICON[s.status]}</span>
              <span className="sname">{s.name}</span>
              <span className="sfile">{s.file}</span>
              {s.error && <span className="error">{s.error}</span>}
              <span className="sthumbs">
                {(s.images || []).map((p) => (
                  <img key={p} className="checker" src={`/thumb/96/${enc(p)}?t=${job?.done ? 1 : Date.now()}`} onClick={() => onPreview(p)} alt="" />
                ))}
              </span>
            </div>
          ))}
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          {!job && <button className="ghost" onClick={onClose}>取消</button>}
          {!job && <button className="primary" onClick={start}>✨ 開始成套生成</button>}
          {job && !job.done && <span className="hint">生成緊… 可以嘟住等，完成會有提示</span>}
          {job?.done && <button className="primary" onClick={onClose}>完成</button>}
        </div>
      </div>
    </div>
  );
}

function Settings({ cfg, onClose, onSaved, notify }) {
  const [gKey, setGKey] = useState('');
  const [oKey, setOKey] = useState('');
  const [fKey, setFKey] = useState('');
  const [gModel, setGModel] = useState(cfg.geminiModel);
  const [oModel, setOModel] = useState(cfg.openaiModel);
  const [fModel, setFModel] = useState(cfg.falModel || 'openai/gpt-image-2');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      if (gKey.trim() || oKey.trim() || fKey.trim()) {
        await api('/api/keys', {
          ...(gKey.trim() && { gemini: gKey.trim() }),
          ...(oKey.trim() && { openai: oKey.trim() }),
          ...(fKey.trim() && { fal: fKey.trim() })
        });
      }
      const next = await api('/api/config', { geminiModel: gModel.trim(), openaiModel: oModel.trim(), falModel: fModel.trim() });
      onSaved(next);
      onClose();
    } catch (e) {
      notify(`儲存失敗：${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lightbox" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>⚙️ 設定</h2>
        <p className="hint">API key 淨係會儲存喺你部機（studio/.env），唔會上傳去任何地方。</p>

        <label className="field">🌀 fal.ai API key（GPT Image 2 經 fal）{cfg.keys.fal && <em>（已設定 ✓ 留空 = 不變）</em>}
          <input type="password" placeholder="key id:secret…（fal.ai/dashboard/keys 度攞）" value={fKey} onChange={(e) => setFKey(e.target.value)} />
        </label>
        <label className="field">🍌 Gemini API key {cfg.keys.gemini && <em>（已設定 ✓ 留空 = 不變）</em>}
          <input type="password" placeholder="AIza…（aistudio.google.com/apikey 度攞）" value={gKey} onChange={(e) => setGKey(e.target.value)} />
        </label>
        <label className="field">⚡ OpenAI API key（官方直連，可以唔填）{cfg.keys.openai && <em>（已設定 ✓ 留空 = 不變）</em>}
          <input type="password" placeholder="sk-…（platform.openai.com/api-keys 度攞）" value={oKey} onChange={(e) => setOKey(e.target.value)} />
        </label>

        <div className="two">
          <label className="field">fal 模型
            <input value={fModel} onChange={(e) => setFModel(e.target.value)} />
          </label>
          <label className="field">Gemini 模型
            <input value={gModel} onChange={(e) => setGModel(e.target.value)} />
          </label>
        </div>
        <div className="two">
          <label className="field">OpenAI 模型
            <input value={oModel} onChange={(e) => setOModel(e.target.value)} />
          </label>
          <span />
        </div>
        <p className="hint">有參考圖時會自動行 <code>{(fModel || 'openai/gpt-image-2') + '/edit'}</code>。慳錢貼士：Gemini 模型改做 <code>gemini-3.1-flash-image</code>（Nano Banana 2，平 4 倍）試稿。</p>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button className="ghost" onClick={onClose}>取消</button>
          <button className="primary" disabled={saving} onClick={save}>{saving ? '儲存中…' : '儲存'}</button>
        </div>
      </div>
    </div>
  );
}
