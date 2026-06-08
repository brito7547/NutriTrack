// ══════════════════════════════════════
//   NutriTrack — App Logic
// ══════════════════════════════════════

const STORAGE_KEY = 'nutritrack_data';

// ── DATA MODEL ──────────────────────────
function defaultData() {
  return {
    perfil: { nome: '', idade: 0, altura: 0, pesoAtual: 0, metaPeso: 0, foto: '' },
    historicoPeso: [],
    registrosAlimentares: {},
    configuracoes: { tema: 'escuro' }
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

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

// ── SCREENS ──────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── MODALS ───────────────────────────────
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.querySelectorAll('.close-btn').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.modal));
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// ── CALENDAR STATE ────────────────────────
let calYear, calMonth;

function initCalDate() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
}

// ── DATE UTILS ────────────────────────────
function fmtDate(d) {
  // returns YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

function fmtDateDisplay(str) {
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function fmtDateTimeDisplay(str) {
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── MEAL COLOR LOGIC ──────────────────────
function getMealColor(registro) {
  if (!registro) return null;
  const { cafe, almoco, jantar, lanche } = registro;
  const hasCafe = cafe && cafe.desc && cafe.desc.trim();
  const hasAlmoco = almoco && almoco.desc && almoco.desc.trim();
  const hasJantar = jantar && jantar.desc && jantar.desc.trim();
  const hasLanche = lanche && lanche.desc && lanche.desc.trim();
  const principais = [hasCafe, hasAlmoco, hasJantar];
  const count = principais.filter(Boolean).length;
  if (count === 3 && hasLanche) return 'c-blue';
  if (count === 3) return 'c-green';
  if (count === 2) return 'c-yellow';
  if (count <= 1) return 'c-red';
  return null;
}

// ── RENDER CALENDAR ───────────────────────
function renderCalendar() {
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  document.getElementById('cal-month-label').textContent = `${monthNames[calMonth]} ${calYear}`;

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  const today = fmtDate(new Date());
  const todayDate = new Date();

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  // Empty cells
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.textContent = d;
    let cls = 'cal-day';
    if (dateStr === today) cls += ' today';

    const cellDate = new Date(calYear, calMonth, d);
    if (cellDate > todayDate) {
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

// ── RENDER HEADER ─────────────────────────
function renderHeader() {
  const p = appData.perfil;
  document.getElementById('greeting-name').textContent = p.nome || '—';
  document.getElementById('header-peso').textContent = p.pesoAtual ? p.pesoAtual : '—';
  const imc = calcIMC(p.pesoAtual, p.altura);
  if (imc) {
    document.getElementById('header-imc').textContent = imc.toFixed(1);
    document.getElementById('header-imc-class').textContent = imcClass(imc);
  } else {
    document.getElementById('header-imc').textContent = '—';
    document.getElementById('header-imc-class').textContent = '—';
  }
  // Avatar
  updateAvatarDisplay('header-avatar', 'header-avatar-icon', p.foto);
}

function updateAvatarDisplay(imgId, iconId, foto) {
  const img = document.getElementById(imgId);
  const icon = document.getElementById(iconId);
  if (foto) {
    img.src = foto;
    img.style.display = 'block';
    if (icon) icon.style.display = 'none';
  } else {
    img.style.display = 'none';
    if (icon) icon.style.display = 'block';
  }
}

// ── WEIGHT HISTORY ────────────────────────
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
    div.innerHTML = `
      <span class="wi-val">${entry.peso}</span>
      <span class="wi-unit">kg</span>
      <span class="wi-date">${fmtDateDisplay(entry.data)} ${entry.hora || ''}</span>
      ${diffHtml}
    `;
    container.appendChild(div);
  });
}

// ── ONBOARDING ────────────────────────────
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
      preview.src = data;
      preview.style.display = 'block';
      if (icon) icon.style.display = 'none';
      if (callback) callback(data);
    };
    reader.readAsDataURL(file);
  });
}

let obFotoData = '';
let profileFotoData = '';

setupAvatarUpload('ob-foto', 'ob-avatar-preview', 'ob-avatar-icon', d => { obFotoData = d; });

document.getElementById('btn-onboarding-save').addEventListener('click', () => {
  const nome = document.getElementById('ob-nome').value.trim();
  const idade = parseInt(document.getElementById('ob-idade').value);
  const altura = parseFloat(document.getElementById('ob-altura').value);
  const peso = parseFloat(document.getElementById('ob-peso').value);
  const meta = parseFloat(document.getElementById('ob-meta').value) || 0;

  if (!nome || !idade || !altura || !peso) {
    showToast('Preencha todos os campos obrigatórios.', 'error');
    return;
  }

  appData.perfil = { nome, idade, altura, pesoAtual: peso, metaPeso: meta, foto: obFotoData };
  appData.historicoPeso.push({ data: fmtDate(new Date()), hora: new Date().toTimeString().slice(0,5), peso });
  saveData(appData);
  initMain();
  showScreen('screen-main');
});

// ── PROFILE MODAL ─────────────────────────
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

  if (!nome || !idade || !altura || !peso) {
    showToast('Preencha todos os campos.', 'error');
    return;
  }

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

// ── WEIGHT MODAL ──────────────────────────
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

// ── MEAL MODAL ────────────────────────────
let currentMealDate = '';

document.getElementById('btn-quick-meal').addEventListener('click', () => {
  openMealForDate(fmtDate(new Date()));
});

function openMealForDate(dateStr) {
  currentMealDate = dateStr;
  document.getElementById('meal-date-label').textContent = fmtDateDisplay(dateStr);
  const reg = appData.registrosAlimentares[dateStr] || {};

  document.getElementById('m-cafe-hora').value = reg.cafe?.hora || '';
  document.getElementById('m-cafe-desc').value = reg.cafe?.desc || '';
  document.getElementById('m-almoco-hora').value = reg.almoco?.hora || '';
  document.getElementById('m-almoco-desc').value = reg.almoco?.desc || '';
  document.getElementById('m-jantar-hora').value = reg.jantar?.hora || '';
  document.getElementById('m-jantar-desc').value = reg.jantar?.desc || '';
  document.getElementById('m-lanche-hora').value = reg.lanche?.hora || '';
  document.getElementById('m-lanche-desc').value = reg.lanche?.desc || '';
  document.getElementById('m-obs').value = reg.obs || '';

  openModal('modal-meal');
}

document.getElementById('btn-save-meal').addEventListener('click', () => {
  appData.registrosAlimentares[currentMealDate] = {
    cafe: { hora: document.getElementById('m-cafe-hora').value, desc: document.getElementById('m-cafe-desc').value },
    almoco: { hora: document.getElementById('m-almoco-hora').value, desc: document.getElementById('m-almoco-desc').value },
    jantar: { hora: document.getElementById('m-jantar-hora').value, desc: document.getElementById('m-jantar-desc').value },
    lanche: { hora: document.getElementById('m-lanche-hora').value, desc: document.getElementById('m-lanche-desc').value },
    obs: document.getElementById('m-obs').value
  };
  saveData(appData);
  renderCalendar();
  closeModal('modal-meal');
  showToast('Refeições salvas!', 'success');
});

// ── HISTORY MODAL ─────────────────────────
document.getElementById('btn-show-history').addEventListener('click', () => {
  renderWeightHistory('history-full-list', null);
  openModal('modal-history');
});

// ── SETTINGS ──────────────────────────────
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

// BACKUP
document.getElementById('btn-backup').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `nutritrack-backup-${ts}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup criado!', 'success');
});

// RESTORE
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
        showToast('Arquivo de backup inválido.', 'error');
        return;
      }
      appData = parsed;
      saveData(appData);
      location.reload();
    } catch {
      showToast('Erro ao ler o backup.', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// CLEAR DATA
document.getElementById('btn-clear-data').addEventListener('click', () => {
  if (!confirm('Isso apagará TODOS os seus dados permanentemente. Tem certeza?')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

// ── CALENDAR NAV ──────────────────────────
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

// ── INIT ──────────────────────────────────
function initMain() {
  initCalDate();
  renderHeader();
  renderCalendar();
  renderWeightHistory('weight-history-list', 3);
  applyTheme(appData.configuracoes.tema || 'escuro');
}

function boot() {
  if (!appData.perfil || !appData.perfil.nome) {
    showScreen('screen-onboarding');
  } else {
    initMain();
    showScreen('screen-main');
  }
  applyTheme(appData.configuracoes?.tema || 'escuro');
}

boot();

// ── SERVICE WORKER ────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
