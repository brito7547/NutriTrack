// ══════════════════════════════════════
//   NutriTrack v2 — App Logic
// ══════════════════════════════════════

const STORAGE_KEY = 'nutritrack_data';

function defaultData() {
  return {
    perfil: { nome: '', idade: 0, altura: 0, pesoAtual: 0, metaPeso: 0, foto: '' },
    historicoPeso: [],
    registrosAlimentares: {},
    configuracoes: { tema: 'escuro' }
  };
}

function loadData() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function saveData(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }

let appData = loadData() || defaultData();

// ── IMC ──────────────────────────────────
function calcIMC(peso, alturacm) {
  const h = alturacm / 100;
  if (!h || !peso) return null;
  return peso / (h * h);
}
function imcClass(imc) {
  if (imc < 18.5) return 'Abaixo do peso';
  if (imc < 25) return 'Peso normal';
  if (imc < 30) return 'Sobrepeso';
  return 'Obesidade';
}

// ── THEME ────────────────────────────────
function applyTheme(tema) {
  document.documentElement.setAttribute('data-theme', tema);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === tema);
  });
}

// ── TOAST ────────────────────────────────
let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast hidden'; }, 2800);
}

// ── SCREENS / MODALS ─────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.querySelectorAll('.close-btn').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.modal));
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay.id); });
});

// ── DATE UTILS ───────────────────────────
function fmtDate(d) { return d.toISOString().slice(0, 10); }
function fmtDateDisplay(str) {
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}
function fmtDateLong(str) {
  const d = new Date(str + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

// ── CALENDAR STATE ───────────────────────
let calYear, calMonth;
function initCalDate() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
}

// ── MEAL COLOR LOGIC ─────────────────────
function getMealColor(registro) {
  if (!registro) return null;
  const puladas = registro.puladas || [];
  const { cafe, almoco, jantar, lanches } = registro;

  const cafePulado = puladas.includes('cafe');
  const almocoPulado = puladas.includes('almoco');
  const jantarPulado = puladas.includes('jantar');

  const hasCafe = cafePulado || (cafe && cafe.desc && cafe.desc.trim());
  const hasAlmoco = almocoPulado || (almoco && almoco.desc && almoco.desc.trim());
  const hasJantar = jantarPulado || (jantar && jantar.desc && jantar.desc.trim());
  const hasLanche = lanches && lanches.some(l => l.desc && l.desc.trim());

  const count = [hasCafe, hasAlmoco, hasJantar].filter(Boolean).length;
  if (count === 3 && hasLanche) return 'c-blue';
  if (count === 3) return 'c-green';
  if (count === 2) return 'c-yellow';
  if (count <= 1) return 'c-red';
  return null;
}

// ── RENDER CALENDAR ──────────────────────
function renderCalendar() {
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  document.getElementById('cal-month-label').textContent = `${monthNames[calMonth]} ${calYear}`;
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';
  const today = fmtDate(new Date());
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const e = document.createElement('div');
    e.className = 'cal-day empty';
    grid.appendChild(e);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.textContent = d;
    let cls = 'cal-day';
    if (dateStr === today) cls += ' today';
    const cellDate = new Date(calYear, calMonth, d);
    if (cellDate > new Date()) {
      cls += ' future';
    } else {
      const reg = appData.registrosAlimentares[dateStr];
      const color = getMealColor(reg);
      if (color) cls += ' ' + color;
    }
    cell.className = cls;
    cell.addEventListener('click', () => openMealForDate(dateStr));
    grid.appendChild(cell);
  }
}

// ── RENDER HEADER ────────────────────────
function renderHeader() {
  const p = appData.perfil;
  document.getElementById('greeting-name').textContent = p.nome || '—';
  document.getElementById('header-peso').textContent = p.pesoAtual || '—';
  const imc = calcIMC(p.pesoAtual, p.altura);
  if (imc) {
    document.getElementById('header-imc').textContent = imc.toFixed(1);
    document.getElementById('header-imc-class').textContent = imcClass(imc);
  } else {
    document.getElementById('header-imc').textContent = '—';
    document.getElementById('header-imc-class').textContent = '—';
  }
  updateAvatarDisplay('header-avatar', 'header-avatar-icon', p.foto);
}

function updateAvatarDisplay(imgId, iconId, foto) {
  const img = document.getElementById(imgId);
  const icon = document.getElementById(iconId);
  if (foto) { img.src = foto; img.style.display = 'block'; if (icon) icon.style.display = 'none'; }
  else { img.style.display = 'none'; if (icon) icon.style.display = 'block'; }
}

// ── WEIGHT HISTORY ───────────────────────
function renderWeightHistory(containerId, limit) {
  const container = document.getElementById(containerId);
  const history = [...appData.historicoPeso].reverse();
  const items = limit ? history.slice(0, limit) : history;
  if (!items.length) {
    container.innerHTML = '<p class="empty-state">Nenhum peso registrado ainda.</p>';
    return;
  }
  container.innerHTML = '';
  items.forEach((entry, i) => {
    const div = document.createElement('div');
    div.className = 'weight-item';
    const prev = items[i + 1];
    let diffHtml = '';
    if (prev) {
      const diff = entry.peso - prev.peso;
      const sign = diff > 0 ? '+' : '';
      const cls = diff < 0 ? 'down' : diff > 0 ? 'up' : 'same';
      diffHtml = `<span class="wi-diff ${cls}">${sign}${diff.toFixed(1)}</span>`;
    }
    // Find real index in original array for deletion
    const realIdx = appData.historicoPeso.length - 1 - (limit
      ? appData.historicoPeso.slice().reverse().indexOf(entry)
      : i);
    const origIdx = appData.historicoPeso.indexOf(entry);
    div.innerHTML = `
      <span class="wi-val">${entry.peso}</span>
      <span class="wi-unit">kg</span>
      <span class="wi-date">${fmtDateDisplay(entry.data)} ${entry.hora || ''}</span>
      ${diffHtml}
      <button class="wi-del" data-idx="${origIdx}" title="Remover">🗑</button>
    `;
    container.appendChild(div);
  });
  // Bind delete buttons
  container.querySelectorAll('.wi-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      if (!confirm('Remover este registro de peso?')) return;
      appData.historicoPeso.splice(idx, 1);
      // Update pesoAtual to latest
      if (appData.historicoPeso.length > 0) {
        appData.perfil.pesoAtual = appData.historicoPeso[appData.historicoPeso.length - 1].peso;
      }
      saveData(appData);
      renderHeader();
      renderWeightHistory('weight-history-list', 3);
      if (containerId === 'history-full-list') renderWeightHistory('history-full-list', null);
      showToast('Registro removido.', '');
    });
  });
}

// ── AVATAR UPLOAD ────────────────────────
function setupAvatarUpload(inputId, previewId, iconId, callback) {
  const input = document.getElementById(inputId);
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const data = e.target.result;
      const preview = document.getElementById(previewId);
      const icon = document.getElementById(iconId);
      preview.src = data; preview.style.display = 'block';
      if (icon) icon.style.display = 'none';
      if (callback) callback(data);
    };
    reader.readAsDataURL(file);
  });
}

let obFotoData = '';
let profileFotoData = '';
setupAvatarUpload('ob-foto', 'ob-avatar-preview', 'ob-avatar-icon', d => { obFotoData = d; });

// ── ONBOARDING ───────────────────────────
document.getElementById('btn-onboarding-save').addEventListener('click', () => {
  const nome = document.getElementById('ob-nome').value.trim();
  const idade = parseInt(document.getElementById('ob-idade').value);
  const altura = parseFloat(document.getElementById('ob-altura').value);
  const peso = parseFloat(document.getElementById('ob-peso').value);
  const meta = parseFloat(document.getElementById('ob-meta').value) || 0;
  if (!nome || !idade || !altura || !peso) { showToast('Preencha todos os campos obrigatórios.', 'error'); return; }
  appData.perfil = { nome, idade, altura, pesoAtual: peso, metaPeso: meta, foto: obFotoData };
  appData.historicoPeso.push({ data: fmtDate(new Date()), hora: new Date().toTimeString().slice(0,5), peso });
  saveData(appData);
  initMain();
  showScreen('screen-main');
});

// ── PROFILE MODAL ────────────────────────
document.getElementById('btn-open-profile').addEventListener('click', () => {
  const p = appData.perfil;
  document.getElementById('p-nome').value = p.nome;
  document.getElementById('p-idade').value = p.idade;
  document.getElementById('p-altura').value = p.altura;
  document.getElementById('p-peso').value = p.pesoAtual;
  document.getElementById('p-meta').value = p.metaPeso || '';
  profileFotoData = p.foto || '';
  const preview = document.getElementById('profile-avatar-preview');
  const icon = document.getElementById('profile-avatar-icon');
  if (p.foto) { preview.src = p.foto; preview.style.display = 'block'; icon.style.display = 'none'; }
  else { preview.style.display = 'none'; icon.style.display = 'block'; }
  openModal('modal-profile');
});

setupAvatarUpload('profile-foto', 'profile-avatar-preview', 'profile-avatar-icon', d => { profileFotoData = d; });

document.getElementById('btn-save-profile').addEventListener('click', () => {
  const nome = document.getElementById('p-nome').value.trim();
  const idade = parseInt(document.getElementById('p-idade').value);
  const altura = parseFloat(document.getElementById('p-altura').value);
  const peso = parseFloat(document.getElementById('p-peso').value);
  const meta = parseFloat(document.getElementById('p-meta').value) || 0;
  if (!nome || !idade || !altura || !peso) { showToast('Preencha todos os campos.', 'error'); return; }
  const oldPeso = appData.perfil.pesoAtual;
  appData.perfil = { nome, idade, altura, pesoAtual: peso, metaPeso: meta, foto: profileFotoData };
  if (peso !== oldPeso) {
    appData.historicoPeso.push({ data: fmtDate(new Date()), hora: new Date().toTimeString().slice(0,5), peso });
  }
  saveData(appData);
  renderHeader();
  renderWeightHistory('weight-history-list', 3);
  renderCalendar();
  closeModal('modal-profile');
  showToast('Perfil atualizado!', 'success');
});

// ── WEIGHT MODAL ─────────────────────────
document.getElementById('btn-quick-weight').addEventListener('click', openWeightModal);
function openWeightModal() {
  const now = new Date();
  document.getElementById('w-peso').value = appData.perfil.pesoAtual || '';
  document.getElementById('w-data').value = fmtDate(now);
  document.getElementById('w-hora').value = now.toTimeString().slice(0,5);
  openModal('modal-weight');
}
document.getElementById('btn-save-weight').addEventListener('click', () => {
  const peso = parseFloat(document.getElementById('w-peso').value);
  const data = document.getElementById('w-data').value;
  const hora = document.getElementById('w-hora').value;
  if (!peso || !data) { showToast('Preencha o peso e a data.', 'error'); return; }
  appData.historicoPeso.push({ data, hora, peso });
  appData.perfil.pesoAtual = peso;
  saveData(appData);
  renderHeader();
  renderWeightHistory('weight-history-list', 3);
  closeModal('modal-weight');
  showToast('Peso registrado!', 'success');
});

// ── MEAL MODAL ───────────────────────────
let currentMealDate = '';
let puladasAtivas = new Set();
let currentHumor = '';

// vontade por refeição: { cafe: 0, almoco: 0, jantar: 0, lanche_N: 0 }
let vontadesAtivas = {};

const vontadeDescs = ['', 'Pouquíssima', 'Pouca', 'Normal', 'Bastante', 'Muita!'];

function setVontadeRef(ref, v) {
  vontadesAtivas[ref] = v;
  const container = document.querySelector(`.vdots-inline[data-ref="${ref}"]`);
  if (!container) return;
  container.querySelectorAll('.vdot').forEach(dot => {
    dot.classList.toggle('active', parseInt(dot.dataset.v) <= v);
  });
}

function bindVontadeContainer(container) {
  const ref = container.dataset.ref;
  container.querySelectorAll('.vdot').forEach(dot => {
    dot.addEventListener('click', () => setVontadeRef(ref, parseInt(dot.dataset.v)));
  });
}

// Bind static refeição vontade containers
document.querySelectorAll('.vdots-inline').forEach(c => bindVontadeContainer(c));

// Humor
document.querySelectorAll('.humor-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentHumor = btn.dataset.humor;
    document.querySelectorAll('.humor-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

function renderPuladasMotivos() {
  const container = document.getElementById('puladas-motivos');
  container.innerHTML = '';
  puladasAtivas.forEach(ref => {
    const nomes = { cafe: 'Café da Manhã', almoco: 'Almoço', jantar: 'Jantar' };
    const wrap = document.createElement('div');
    wrap.className = 'pulada-motivo-wrap';
    wrap.innerHTML = `<label>Motivo — ${nomes[ref]}</label><textarea id="pulada-motivo-${ref}" placeholder="Por que pulou? (opcional)"></textarea>`;
    container.appendChild(wrap);
  });
}

function updateMealBlockDim() {
  ['cafe','almoco','jantar'].forEach(ref => {
    const block = document.getElementById('mblock-' + ref);
    if (block) block.classList.toggle('pulada-dim', puladasAtivas.has(ref));
  });
}

document.querySelectorAll('.pulada-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const ref = chip.dataset.refeicao;
    if (puladasAtivas.has(ref)) puladasAtivas.delete(ref);
    else puladasAtivas.add(ref);
    chip.classList.toggle('pulada-ativa', puladasAtivas.has(ref));
    renderPuladasMotivos();
    updateMealBlockDim();
  });
});

// Lanches dinâmicos
function addLancheItem(hora = '', desc = '', vontade = 0) {
  const lista = document.getElementById('lanches-lista');
  const idx = lista.children.length;
  const ref = 'lanche_' + idx;
  vontadesAtivas[ref] = vontade;
  const item = document.createElement('div');
  item.className = 'lanche-item';
  item.dataset.ref = ref;
  item.innerHTML = `
    <div class="lanche-item-fields">
      <input type="time" value="${hora}" placeholder="Horário" />
      <textarea placeholder="O que você comeu?">${desc}</textarea>
      <div class="vontade-inline">
        <span class="vontade-inline-label">Vontade</span>
        <div class="vdots-inline" data-ref="${ref}">
          <button class="vdot" data-v="1">●</button><button class="vdot" data-v="2">●</button><button class="vdot" data-v="3">●</button><button class="vdot" data-v="4">●</button><button class="vdot" data-v="5">●</button>
        </div>
      </div>
    </div>
    <button class="btn-rm-lanche" title="Remover">✕</button>
  `;
  const vdotsContainer = item.querySelector('.vdots-inline');
  bindVontadeContainer(vdotsContainer);
  // Set initial vontade
  if (vontade > 0) {
    vdotsContainer.querySelectorAll('.vdot').forEach(dot => {
      dot.classList.toggle('active', parseInt(dot.dataset.v) <= vontade);
    });
  }
  item.querySelector('.btn-rm-lanche').addEventListener('click', () => {
    delete vontadesAtivas[ref];
    item.remove();
  });
  lista.appendChild(item);
}

document.getElementById('btn-add-lanche').addEventListener('click', () => addLancheItem());

function getLanchesFromDOM() {
  const items = document.querySelectorAll('#lanches-lista .lanche-item');
  return Array.from(items).map(item => ({
    hora: item.querySelector('input[type="time"]').value,
    desc: item.querySelector('textarea').value,
    vontade: vontadesAtivas[item.dataset.ref] || 0
  })).filter(l => l.desc.trim());
}

document.getElementById('btn-quick-meal').addEventListener('click', () => {
  openMealForDate(fmtDate(new Date()));
});

function openMealForDate(dateStr) {
  currentMealDate = dateStr;
  document.getElementById('meal-date-label').textContent = fmtDateDisplay(dateStr);
  const reg = appData.registrosAlimentares[dateStr] || {};

  // Sono
  document.getElementById('m-dormiu').value = reg.sono?.dormiu || '';
  document.getElementById('m-acordou').value = reg.sono?.acordou || '';

  // Puladas
  puladasAtivas = new Set(reg.puladas || []);
  document.querySelectorAll('.pulada-chip').forEach(chip => {
    chip.classList.toggle('pulada-ativa', puladasAtivas.has(chip.dataset.refeicao));
  });
  renderPuladasMotivos();
  if (reg.puladasMotivos) {
    Object.entries(reg.puladasMotivos).forEach(([ref, motivo]) => {
      const el = document.getElementById('pulada-motivo-' + ref);
      if (el) el.value = motivo;
    });
  }
  updateMealBlockDim();

  // Refeições
  document.getElementById('m-cafe-hora').value = reg.cafe?.hora || '';
  document.getElementById('m-cafe-desc').value = reg.cafe?.desc || '';
  document.getElementById('m-almoco-hora').value = reg.almoco?.hora || '';
  document.getElementById('m-almoco-desc').value = reg.almoco?.desc || '';
  document.getElementById('m-jantar-hora').value = reg.jantar?.hora || '';
  document.getElementById('m-jantar-desc').value = reg.jantar?.desc || '';
  document.getElementById('m-obs').value = reg.obs || '';

  // Vontades por refeição
  vontadesAtivas = Object.assign({ cafe: 0, almoco: 0, jantar: 0 }, reg.vontades || {});
  ['cafe','almoco','jantar'].forEach(ref => setVontadeRef(ref, vontadesAtivas[ref] || 0));

  // Humor
  currentHumor = reg.humor || '';
  document.querySelectorAll('.humor-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.humor === currentHumor);
  });

  // Lanches
  document.getElementById('lanches-lista').innerHTML = '';
  const lanches = reg.lanches || [];
  if (lanches.length > 0) {
    lanches.forEach(l => addLancheItem(l.hora, l.desc, l.vontade || 0));
  }

  openModal('modal-meal');
}

document.getElementById('btn-save-meal').addEventListener('click', () => {
  const puladasMotivos = {};
  puladasAtivas.forEach(ref => {
    const el = document.getElementById('pulada-motivo-' + ref);
    if (el) puladasMotivos[ref] = el.value;
  });

  appData.registrosAlimentares[currentMealDate] = {
    sono: {
      dormiu: document.getElementById('m-dormiu').value,
      acordou: document.getElementById('m-acordou').value
    },
    humor: currentHumor,
    vontades: Object.assign({}, vontadesAtivas),
    puladas: Array.from(puladasAtivas),
    puladasMotivos,
    cafe: { hora: document.getElementById('m-cafe-hora').value, desc: document.getElementById('m-cafe-desc').value },
    almoco: { hora: document.getElementById('m-almoco-hora').value, desc: document.getElementById('m-almoco-desc').value },
    jantar: { hora: document.getElementById('m-jantar-hora').value, desc: document.getElementById('m-jantar-desc').value },
    lanches: getLanchesFromDOM(),
    obs: document.getElementById('m-obs').value
  };
  saveData(appData);
  renderCalendar();
  closeModal('modal-meal');
  showToast('Refeições salvas!', 'success');
});

// ── HISTORY MODAL ────────────────────────
document.getElementById('btn-show-history').addEventListener('click', () => {
  renderWeightHistory('history-full-list', null);
  openModal('modal-history');
});

// ── CALENDAR NAV ─────────────────────────
document.getElementById('cal-prev').addEventListener('click', () => {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
});
document.getElementById('cal-next').addEventListener('click', () => {
  const now = new Date();
  if (calYear === now.getFullYear() && calMonth === now.getMonth()) return;
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
});

// ── SETTINGS ─────────────────────────────
document.getElementById('btn-open-settings').addEventListener('click', () => {
  applyTheme(appData.configuracoes.tema);
  openModal('modal-settings');
});
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    appData.configuracoes.tema = btn.dataset.theme;
    saveData(appData);
    applyTheme(btn.dataset.theme);
  });
});

document.getElementById('btn-backup').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nutritrack-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup criado!', 'success');
});

document.getElementById('btn-restore-trigger').addEventListener('click', () => {
  document.getElementById('restore-file-input').click();
});
document.getElementById('restore-file-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  if (!confirm('Esta ação substituirá todos os dados atuais. Deseja continuar?')) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (!parsed.perfil || !parsed.historicoPeso || !parsed.registrosAlimentares) {
        showToast('Arquivo de backup inválido.', 'error'); return;
      }
      appData = parsed; saveData(appData); location.reload();
    } catch { showToast('Erro ao ler o backup.', 'error'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('btn-clear-data').addEventListener('click', () => {
  if (!confirm('Isso apagará TODOS os seus dados permanentemente. Tem certeza?')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

// ── RELATÓRIO ────────────────────────────
let reportMode = 'all';

document.getElementById('btn-open-report').addEventListener('click', () => {
  reportMode = 'all';
  document.getElementById('rep-btn-all').classList.add('active');
  document.getElementById('rep-btn-custom').classList.remove('active');
  document.getElementById('rep-custom-range').style.display = 'none';
  openModal('modal-report');
});

document.getElementById('rep-btn-all').addEventListener('click', () => {
  reportMode = 'all';
  document.getElementById('rep-btn-all').classList.add('active');
  document.getElementById('rep-btn-custom').classList.remove('active');
  document.getElementById('rep-custom-range').style.display = 'none';
});

document.getElementById('rep-btn-custom').addEventListener('click', () => {
  reportMode = 'custom';
  document.getElementById('rep-btn-custom').classList.add('active');
  document.getElementById('rep-btn-all').classList.remove('active');
  document.getElementById('rep-custom-range').style.display = 'block';
});

document.getElementById('btn-generate-report').addEventListener('click', () => {
  let fromDate = null, toDate = null;
  if (reportMode === 'custom') {
    fromDate = document.getElementById('rep-from').value;
    toDate = document.getElementById('rep-to').value;
    if (!fromDate || !toDate) { showToast('Escolha as datas.', 'error'); return; }
  }
  generateReport(fromDate, toDate);
  closeModal('modal-report');
});

function generateReport(fromDate, toDate) {
  const p = appData.perfil;
  const regs = appData.registrosAlimentares;
  const pesos = appData.historicoPeso;

  // Filter days
  let dias = Object.keys(regs).sort();
  if (fromDate) dias = dias.filter(d => d >= fromDate && d <= toDate);
  // Remove completely empty days
  dias = dias.filter(d => {
    const r = regs[d];
    const temRefeicao = (r.cafe?.desc || r.almoco?.desc || r.jantar?.desc || (r.lanches && r.lanches.length > 0) || (r.puladas && r.puladas.length > 0));
    return temRefeicao;
  });

  // Filter pesos
  let pesosRel = pesos;
  if (fromDate) pesosRel = pesos.filter(p => p.data >= fromDate && p.data <= toDate);

  const vLabels = ['', '😞 Pouquíssima', '😕 Pouca', '😐 Normal', '🙂 Bastante', '😄 Muita'];  const refeicaoNome = { cafe: 'Café da Manhã', almoco: 'Almoço', jantar: 'Jantar' };

  let html = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"/>
<title>Relatório NutriTrack</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;color:#1a1a2e;background:#fff;font-size:14px}
  h1{font-size:2rem;color:#b07d30;border-bottom:2px solid #b07d30;padding-bottom:8px;margin-bottom:4px}
  .subtitle{color:#888;font-size:0.85rem;margin-bottom:30px}
  h2{font-size:1rem;color:#555;text-transform:uppercase;letter-spacing:0.08em;margin:28px 0 10px;border-bottom:1px solid #eee;padding-bottom:4px}
  .dia-header{background:#faf7f2;border-left:3px solid #b07d30;padding:8px 12px;margin:18px 0 6px;border-radius:0 6px 6px 0}
  .dia-header h3{margin:0;font-size:0.95rem;color:#b07d30}
  .dia-header .vontade{font-size:0.78rem;color:#888;margin-top:2px}
  .refeicao{margin:6px 0 6px 12px}
  .ref-nome{font-weight:600;font-size:0.82rem;text-transform:uppercase;color:#555;letter-spacing:0.04em}
  .ref-hora{color:#aaa;font-size:0.78rem;margin-left:6px}
  .ref-desc{color:#333;margin:2px 0 0 0;font-size:0.88rem}
  .pulada{color:#c0892a;font-style:italic;font-size:0.85rem;margin:4px 0 4px 12px}
  .obs{background:#f9f9f9;border:1px solid #eee;border-radius:6px;padding:8px 10px;margin:6px 0 0 12px;font-size:0.82rem;color:#666}
  .peso-table{width:100%;border-collapse:collapse;margin-top:8px}
  .peso-table th{background:#faf7f2;text-align:left;padding:6px 10px;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.05em;color:#888;border-bottom:1px solid #eee}
  .peso-table td{padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:0.88rem}
  .diff-down{color:#52c87a;font-weight:600}
  .diff-up{color:#ff5f5f;font-weight:600}
  .stats{display:flex;gap:12px;flex-wrap:wrap;margin:10px 0}
  .stat-box{background:#faf7f2;border:1px solid #e8dcc8;border-radius:8px;padding:10px 14px;flex:1;min-width:120px}
  .stat-box .sv{font-size:1.4rem;color:#b07d30;font-weight:700}
  .stat-box .sl{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;color:#aaa;margin-top:2px}
  footer{margin-top:40px;padding-top:12px;border-top:1px solid #eee;color:#bbb;font-size:0.75rem;text-align:center}
  @media print{body{margin:10px}}
</style>
</head><body>
<h1>📊 Relatório NutriTrack</h1>
<p class="subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR', {day:'2-digit',month:'long',year:'numeric'})} · ${p.nome}</p>`;

  // Stats
  const totalDias = dias.length;
  const diasCompletos = dias.filter(d => {
    const r = regs[d];
    const puladas = r.puladas || [];
    return ['cafe','almoco','jantar'].every(ref =>
      puladas.includes(ref) || (r[ref]?.desc?.trim())
    );
  }).length;
  const pesoInicial = pesosRel.length ? pesosRel[0].peso : null;
  const pesoFinal = pesosRel.length ? pesosRel[pesosRel.length-1].peso : null;
  const variacaoPeso = (pesoInicial && pesoFinal) ? (pesoFinal - pesoInicial).toFixed(1) : null;

  html += `<h2>Resumo</h2><div class="stats">
    <div class="stat-box"><div class="sv">${totalDias}</div><div class="sl">Dias registrados</div></div>
    <div class="stat-box"><div class="sv">${diasCompletos}</div><div class="sl">Dias completos</div></div>
    ${pesoFinal ? `<div class="stat-box"><div class="sv">${pesoFinal} kg</div><div class="sl">Último peso</div></div>` : ''}
    ${variacaoPeso !== null ? `<div class="stat-box"><div class="sv ${variacaoPeso > 0 ? 'diff-up' : 'diff-down'}">${variacaoPeso > 0 ? '+' : ''}${variacaoPeso} kg</div><div class="sl">Variação no período</div></div>` : ''}
  </div>`;

  // Histórico de peso
  if (pesosRel.length > 0) {
    html += `<h2>Histórico de Peso</h2><table class="peso-table">
      <tr><th>Data</th><th>Hora</th><th>Peso</th><th>Variação</th></tr>`;
    pesosRel.forEach((entry, i) => {
      const prev = pesosRel[i-1];
      let diff = '';
      if (prev) {
        const d = entry.peso - prev.peso;
        const sign = d > 0 ? '+' : '';
        diff = `<span class="${d < 0 ? 'diff-down' : d > 0 ? 'diff-up' : ''}">${sign}${d.toFixed(1)}</span>`;
      }
      html += `<tr><td>${fmtDateDisplay(entry.data)}</td><td>${entry.hora || '—'}</td><td><strong>${entry.peso} kg</strong></td><td>${diff}</td></tr>`;
    });
    html += '</table>';
  }

  // Dias
  if (dias.length > 0) {
    html += `<h2>Registros Alimentares</h2>`;
    dias.forEach(dateStr => {
      const r = regs[dateStr];
      const puladas = r.puladas || [];
      html += `<div class="dia-header"><h3>${fmtDateLong(dateStr)}</h3>`;
      if (r.humor) html += `<div class="vontade">Humor: ${r.humor}</div>`;
      if (r.sono?.dormiu || r.sono?.acordou) html += `<div class="vontade">🌙 Sono: dormiu ${r.sono.dormiu || '?'} / acordou ${r.sono.acordou || '?'}</div>`;
      html += `</div>`;

      ['cafe','almoco','jantar'].forEach(ref => {
        const nome = refeicaoNome[ref];
        const icons = { cafe: '☕', almoco: '🌞', jantar: '🌙' };
        const vontade = r.vontades?.[ref];
        if (puladas.includes(ref)) {
          const motivo = r.puladasMotivos?.[ref];
          html += `<div class="pulada">⏭ ${nome} pulado${motivo ? ` — ${motivo}` : ''}</div>`;
        } else if (r[ref]?.desc?.trim()) {
          html += `<div class="refeicao"><span class="ref-nome">${icons[ref]} ${nome}</span><span class="ref-hora">${r[ref].hora || ''}</span>${vontade ? `<span class="ref-hora"> · Vontade: ${vLabels[vontade]}</span>` : ''}<p class="ref-desc">${r[ref].desc}</p></div>`;
        }
      });

      if (r.lanches && r.lanches.length > 0) {
        r.lanches.forEach(l => {
          if (l.desc?.trim()) {
            html += `<div class="refeicao"><span class="ref-nome">🍎 Lanche</span><span class="ref-hora">${l.hora || ''}</span>${l.vontade ? `<span class="ref-hora"> · Vontade: ${vLabels[l.vontade]}</span>` : ''}<p class="ref-desc">${l.desc}</p></div>`;
          }
        });
      }

      if (r.obs?.trim()) {
        html += `<div class="obs">📝 ${r.obs.replace(/\n/g,'<br/>')}</div>`;
      }
    });
  }

  html += `<footer>NutriTrack · Relatório gerado automaticamente</footer></body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nutritrack-relatorio-${new Date().toISOString().slice(0,10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Relatório gerado!', 'success');
}

// ── INIT ─────────────────────────────────
function initMain() {
  initCalDate();
  renderHeader();
  renderCalendar();
  renderWeightHistory('weight-history-list', 3);
  applyTheme(appData.configuracoes.tema || 'escuro');
}

function boot() {
  if (!appData.perfil || !appData.perfil.nome) { showScreen('screen-onboarding'); }
  else { initMain(); showScreen('screen-main'); }
  applyTheme(appData.configuracoes?.tema || 'escuro');
}

boot();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
