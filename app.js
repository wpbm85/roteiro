// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = "https://vgjxorgortxouxjojgtn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnanhvcmdvcnR4b3V4am9qZ3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NjQzNDgsImV4cCI6MjEwNDM0MDM0OH0.IelNiUMUA04-mhWQl9j57qRKOXEfleHb8zYEyS_D1o8";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let session = null;
let euroMedio = 5.98;
let currentTab = 'roteiro';
let currentFilter = "TODAS";
let currentSelectedDay = null; 
let showDone = "ALL";

let roteiroData = [];
let orcamentoData = [];
let gastosData = [];

const DIAS_TRADUCAO = {
  'MON': 'SEG', 'TUE': 'TER', 'WED': 'QUA', 'THU': 'QUI', 'FRI': 'SEX', 'SAT': 'SÁB', 'SUN': 'DOM'
};

// --- AUTENTICAÇÃO ---
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await _supabase.auth.getSession();
  if (data.session) {
    session = data.session;
    startApp();
  }
});

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-senha").value;
  const errBox = document.getElementById("login-error");

  errBox.style.display = "none";

  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    errBox.innerText = `Erro: ${error.message}`;
    errBox.style.display = "block";
  } else {
    session = data.session;
    startApp();
  }
}

async function logout() {
  await _supabase.auth.signOut();
  window.location.reload();
}

async function startApp() {
  document.getElementById("modal-login").classList.remove("active");
  document.getElementById("main-content").style.display = "block";
  document.getElementById("fab-btn").style.display = "flex";
  document.getElementById("bottom-nav").style.display = "flex";

  await loadAllData();
}

// --- CARREGAR DADOS DO SUPABASE ---
async function loadAllData() {
  const { data: rot } = await _supabase.from('roteiro').select('*').order('ordem', { ascending: true });
  const { data: orc } = await _supabase.from('orcamento').select('*');
  const { data: gas } = await _supabase.from('gastos').select('*');

  roteiroData = rot || [];
  orcamentoData = orc || [];
  gastosData = gas || [];

  autoSelectToday();
  populateSelects();
  renderDaysCarousel();
  renderCityChips();
  renderTimeline();
  renderOrcamento();
  renderGastos();
}

// --- UTILITÁRIOS DE TRADUÇÃO E DATAS ---
function formatDayLabel(dayStr) {
  if (!dayStr) return { num: '--', name: 'DIA', full: '' };
  const parts = dayStr.split(" ");
  const dayNum = parts[0] || "--";
  let dayName = parts[1] ? parts[1].toUpperCase() : "";
  if (DIAS_TRADUCAO[dayName]) dayName = DIAS_TRADUCAO[dayName];
  return { num: dayNum.split("/")[0], name: dayName, full: `${dayNum} ${dayName}` };
}

function parseDateForSort(dayStr) {
  if (!dayStr) return 9999;
  const match = dayStr.match(/(\d{2})\/(\d{2})/);
  if (match) {
    return parseInt(match[2]) * 100 + parseInt(match[1]);
  }
  return 9999;
}

function autoSelectToday() {
  const hoje = new Date();
  const diaMes = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const targetDay = roteiroData.find(i => i.dia && i.dia.startsWith(diaMes));
  
  if (targetDay) {
    currentSelectedDay = targetDay.dia;
  } else {
    const uniqueDays = [...new Set(roteiroData.map(item => item.dia).filter(Boolean))];
    uniqueDays.sort((a, b) => parseDateForSort(a) - parseDateForSort(b));
    currentSelectedDay = uniqueDays[0] || "";
  }
}

function populateSelects() {
  const uniqueDays = [...new Set(roteiroData.map(item => item.dia).filter(Boolean))];
  uniqueDays.sort((a, b) => parseDateForSort(a) - parseDateForSort(b));

  const rotDia = document.getElementById("rot-dia");
  if(rotDia) rotDia.innerHTML = uniqueDays.map(d => `<option value="${d}">${d}</option>`).join("");

  const cidadesFixas = ["GERAL", "AMSTERDAM", "BRUXELAS", "GENT", "BRUGES", "PARIS", "ROTERDAM", "DELFT", "HAIA"];
  const categoriasFixas = ["VOO", "TREM", "HOTEL", "ALIMENTAÇÃO", "INGRESSOS", "TRANSPORTE", "COMPRAS", "MERCADO", "OUTROS"];

  const rotCity = document.getElementById("rot-cidade");
  const gasCity = document.getElementById("gas-cidade");
  if(rotCity) rotCity.innerHTML = cidadesFixas.map(c => `<option value="${c}">${c}</option>`).join("");
  if(gasCity) gasCity.innerHTML = cidadesFixas.map(c => `<option value="${c}">${c}</option>`).join("");

  const gasCat = document.getElementById("gas-cat");
  const orcCat = document.getElementById("orc-cat");
  if(gasCat) gasCat.innerHTML = categoriasFixas.map(c => `<option value="${c}">${c}</option>`).join("");
  if(orcCat) orcCat.innerHTML = categoriasFixas.map(c => `<option value="${c}">${c}</option>`).join("");
}

function switchTab(tabName, btn) {
  currentTab = tabName;
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById(`tab-${tabName}`).classList.add("active");
  btn.classList.add("active");
}

function openContextModal() {
  document.getElementById("rot-id").value = "";
  document.getElementById(`modal-${currentTab}`).classList.add("active");
}
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

// --- ROTEIRO ---
function renderDaysCarousel() {
  const container = document.getElementById("days-carousel-container");
  container.innerHTML = "";
  let uniqueDays = [...new Set(roteiroData.map(item => item.dia).filter(Boolean))];
  
  if (currentFilter !== "TODAS") {
    uniqueDays = [...new Set(roteiroData.filter(i => i.cidade === currentFilter).map(item => item.dia))];
  }

  uniqueDays.sort((a, b) => parseDateForSort(a) - parseDateForSort(b));

  uniqueDays.forEach(dayStr => {
    const formatted = formatDayLabel(dayStr);
    const card = document.createElement("div");
    card.className = `day-card ${dayStr === currentSelectedDay ? 'active' : ''}`;
    card.onclick = () => { currentSelectedDay = dayStr; renderDaysCarousel(); renderCityChips(); renderTimeline(); };
    card.innerHTML = `<span class="day-name">${formatted.name}</span><span class="day-num">${formatted.num}</span>`;
    container.appendChild(card);
  });
}

function renderCityChips() {
  const cityBar = document.getElementById("city-bar");
  let validCities = [...new Set(roteiroData.map(i => i.cidade ? i.cidade.toUpperCase() : "").filter(Boolean))];
  
  if (currentSelectedDay) {
    validCities = [...new Set(roteiroData.filter(i => i.dia === currentSelectedDay).map(i => i.cidade ? i.cidade.toUpperCase() : ""))];
  }
  
  if (currentFilter !== "TODAS" && !validCities.includes(currentFilter)) {
    currentFilter = "TODAS";
  }

  cityBar.innerHTML = `<button class="chip ${currentFilter === "TODAS" ? 'active' : ''}" onclick="filterCity('TODAS')">Todas</button>`;
  validCities.forEach(city => {
    cityBar.innerHTML += `<button class="chip ${city === currentFilter ? 'active' : ''}" onclick="filterCity('${city}')">${city.charAt(0) + city.slice(1).toLowerCase()}</button>`;
  });
}

function filterCity(city) {
  currentFilter = city; 
  renderCityChips(); 
  renderDaysCarousel();
  renderTimeline();
}

function setDoneFilter(type) {
  showDone = type;
  document.getElementById("btn-ver-tudo").classList.toggle("active", type === "ALL");
  document.getElementById("btn-ver-falta").classList.toggle("active", type === "PENDING");
  renderTimeline();
}

async function toggleDone(id) {
  const item = roteiroData.find(i => i.id === id);
  if(item) { 
    item.feito = !item.feito; 
    await _supabase.from('roteiro').update({ feito: item.feito }).eq('id', id);
    renderTimeline(); 
  }
}

async function deleteItem(id, type) {
  if(!confirm("Tem certeza que deseja excluir?")) return;
  await _supabase.from(type).delete().eq('id', id);
  await loadAllData();
}

function openMaps(link, atracao, endereco) {
  if (link && link.startsWith("http")) {
    window.open(link, '_blank');
  } else {
    const query = encodeURIComponent(`${atracao} ${endereco || ''}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  }
}

function editRoteiro(id) {
  const item = roteiroData.find(i => i.id === id);
  if(!item) return;
  document.getElementById("rot-id").value = item.id;
  document.getElementById("rot-dia").value = item.dia;
  document.getElementById("rot-cidade").value = item.cidade;
  document.getElementById("rot-categoria").value = item.categoria === "MARCO" ? "DESTAQUE" : item.categoria;
  document.getElementById("rot-atracao").value = item.atracao;
  document.getElementById("rot-regiao").value = item.regiao || "";
  document.getElementById("rot-horario").value = item.horario || "";
  document.getElementById("rot-endereco").value = item.endereco || "";
  document.getElementById("rot-custo").value = item.custo || "";
  document.getElementById("rot-link").value = item.link || "";
  document.getElementById("rot-obs").value = item.obs || "";
  document.getElementById("modal-roteiro").classList.add("active");
}

function renderTimeline() {
  const container = document.getElementById("timeline-container");
  container.innerHTML = "";

  let filtered = roteiroData.filter(i => i.dia === currentSelectedDay);
  if (currentFilter !== "TODAS") filtered = filtered.filter(i => i.cidade === currentFilter);
  if (showDone === "PENDING") filtered = filtered.filter(i => !i.feito);
  
  filtered.sort((a,b) => (a.ordem || 99) - (b.ordem || 99));

  filtered.forEach(item => {
    let catDisplay = item.categoria === "MARCO" ? "DESTAQUE" : item.categoria;
    let catBg = "var(--cat-default)";
    if(catDisplay === "MUSEU") catBg = "var(--cat-museu)";
    if(catDisplay === "HOTEL") catBg = "var(--cat-hotel)";
    if(catDisplay === "RESTAURANTE") catBg = "var(--cat-restaurante)";
    if(catDisplay === "DESTAQUE") catBg = "var(--cat-marco)";

    const isFeito = item.feito ? 'feito' : '';
    const btnFeitoClass = item.feito ? 'active' : '';

    container.innerHTML += `
      <div class="card ${isFeito}" data-id="${item.id}">
        <div class="card-top" style="display:flex; justify-content:space-between; align-items:center;">
          <div class="card-top-left">
            <span class="badge-cat" style="background: ${catBg}">${catDisplay}</span>
            <span class="card-time">${item.horario || ''}</span>
          </div>
          <span class="card-cost">${item.custo ? '€ ' + parseFloat(item.custo).toFixed(2) : ''}</span>
        </div>
        
        <div class="card-title" style="margin-top:6px;">${item.atracao}</div>
        ${item.endereco || item.regiao ? `<div class="card-address"><i class="fa-solid fa-location-dot"></i> ${item.endereco || ''} ${item.regiao ? '• '+item.regiao : ''}</div>` : ''}
        ${item.obs ? `<div class="card-obs"><i class="fa-solid fa-circle-exclamation"></i> ${item.obs}</div>` : ''}
        
        <div class="card-actions" style="margin-top:10px; display:flex; justify-content:flex-end;">
          <div class="action-group" style="display:flex; gap:6px; align-items:center;">
             <button class="btn-act done-btn ${btnFeitoClass}" onclick="toggleDone(${item.id})" title="Check"><i class="fa-solid fa-check"></i></button>
             <button class="btn-act" onclick="openMaps('${item.link || ''}', '${item.atracao}', '${item.endereco || ''}')" title="Google Maps"><i class="fa-solid fa-map-location-dot"></i></button>
             <button class="btn-act" onclick="editRoteiro(${item.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
             <button class="btn-act del-btn" onclick="deleteItem(${item.id}, 'roteiro')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
             <button class="btn-act drag-handle" title="Reordenar"><i class="fa-solid fa-grip-vertical"></i></button>
          </div>
        </div>
      </div>`;
  });

  // Habilitar Drag & Drop para Desktop e Mobile
  new Sortable(container, {
    handle: '.drag-handle',
    animation: 150,
    delay: 150,
    delayOnTouchOnly: true,
    touchStartThreshold: 5,
    onEnd: async function () {
      const cards = container.children;
      for (let index = 0; index < cards.length; index++) {
        const id = parseInt(cards[index].getAttribute('data-id'));
        const target = roteiroData.find(r => r.id === id);
        if(target) {
          target.ordem = index + 1;
          await _supabase.from('roteiro').update({ ordem: index + 1 }).eq('id', id);
        }
      }
    }
  });
}

async function handleRoteiroSubmit(e) {
  e.preventDefault();
  const idStr = document.getElementById("rot-id").value;
  let catVal = document.getElementById("rot-categoria").value;
  
  const payload = {
    dia: document.getElementById("rot-dia").value, 
    cidade: document.getElementById("rot-cidade").value,
    atracao: document.getElementById("rot-atracao").value, 
    categoria: catVal === "DESTAQUE" ? "MARCO" : catVal,
    regiao: document.getElementById("rot-regiao").value, 
    horario: document.getElementById("rot-horario").value,
    endereco: document.getElementById("rot-endereco").value, 
    custo: parseFloat(document.getElementById("rot-custo").value) || 0,
    link: document.getElementById("rot-link").value, 
    obs: document.getElementById("rot-obs").value
  };

  if(idStr) {
    await _supabase.from('roteiro').update(payload).eq('id', parseInt(idStr));
  } else {
    payload.ordem = 99;
    payload.feito = false;
    await _supabase.from('roteiro').insert([payload]);
  }
  
  closeModal('modal-roteiro'); 
  e.target.reset();
  await loadAllData();
}

// --- ORÇAMENTO E GASTOS ---
function updateEuro() {
  euroMedio = parseFloat(document.getElementById("euro-input").value) || 5.98;
  renderOrcamento(); renderGastos();
}

function renderOrcamento() {
  const container = document.getElementById("orcamento-list");
  container.innerHTML = "";
  let projTot = 0, efetTot = 0;
  let catTotals = {};

  orcamentoData.forEach(item => {
    let projEur = item.moeda === "BRL" ? (item.projetado_eur / euroMedio) : item.projetado_eur;
    
    // Soma gastos reais lançados nesta categoria
    let gastosDaCategoria = gastosData.filter(g => g.categoria === item.categoria && g.item === item.item);
    let calcEfetEur = 0;
    
    if (gastosDaCategoria.length > 0) {
      gastosDaCategoria.forEach(g => {
        calcEfetEur += g.moeda === "BRL" ? (g.valor_brl / euroMedio) : g.valor_eur;
      });
    } else {
      if(item.status === "PAGO") calcEfetEur = projEur; 
    }

    projTot += projEur || 0;
    efetTot += calcEfetEur || 0;

    // Subtotais por Categoria
    if (!catTotals[item.categoria]) {
      catTotals[item.categoria] = { proj: 0, efet: 0 };
    }
    catTotals[item.categoria].proj += projEur || 0;
    catTotals[item.categoria].efet += calcEfetEur || 0;

    // Definição de Cores conforme solicitação
    let statusColor = "var(--text-main)";
    if (item.status === "PAGO") statusColor = "#059669"; // Verde
    else if (item.status === "A PAGAR") statusColor = "#d97706"; // Amarelo/Dourado
    else if (item.status === "PROJETADO") statusColor = "#ea580c"; // Laranja

    let displayValEur = calcEfetEur > 0 ? calcEfetEur : (projEur || 0);
    let displayValBrl = displayValEur * euroMedio;

    container.innerHTML += `
      <div class="list-item" style="padding:10px 0; border-bottom:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center;">
        <div class="list-item-left">
          <div style="font-weight:600;">${item.item}</div>
          <div style="font-size:0.8rem; color:#6b7280;">${item.categoria} • <span style="color:${statusColor}; font-weight:600;">${item.status}</span></div>
        </div>
        <div class="list-item-right" style="text-align:right;">
          <div style="font-weight:700; color:${statusColor}">€ ${displayValEur.toFixed(2)}</div>
          <div style="font-size:0.75rem; color:#6b7280;">R$ ${displayValBrl.toFixed(2)}</div>
          <div style="margin-top:4px; display:flex; gap:4px; justify-content:flex-end;">
            <button class="btn-act" onclick="editOrcamento(${item.id})" style="padding:2px 6px; font-size:0.7rem;"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-act del-btn" onclick="deleteItem(${item.id}, 'orcamento')" style="padding:2px 6px; font-size:0.7rem;"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>`;
  });

  // Atualizar Métricas do Topo
  document.getElementById("metric-proj-eur").innerText = `€ ${projTot.toFixed(2)}`;
  document.getElementById("metric-proj-brl").innerText = `R$ ${(projTot * euroMedio).toFixed(2)}`;
  document.getElementById("metric-efet-eur").innerText = `€ ${efetTot.toFixed(2)}`;
  document.getElementById("metric-efet-brl").innerText = `R$ ${(efetTot * euroMedio).toFixed(2)}`;

  // Renderizar Quadro de Subtotais por Categoria
  renderSubtotaisOrcamento(catTotals);
}

function renderSubtotaisOrcamento(catTotals) {
  let subContainer = document.getElementById("orcamento-subtotais");
  if (!subContainer) {
    subContainer = document.createElement("div");
    subContainer.id = "orcamento-subtotais";
    subContainer.style.marginTop = "20px";
    subContainer.style.padding = "12px";
    subContainer.style.background = "#f9fafb";
    subContainer.style.borderRadius = "8px";
    document.getElementById("tab-orcamento").appendChild(subContainer);
  }

  let html = `<h4 style="margin-bottom:10px; font-size:0.9rem; color:#374151;">RESUMO POR CATEGORIA</h4>`;
  for (const [cat, vals] of Object.entries(catTotals)) {
    html += `
      <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #d1d5db; font-size:0.85rem;">
        <span><strong>${cat}</strong></span>
        <div style="text-align:right;">
          <span style="color:#059669; font-weight:600;">€ ${vals.efet.toFixed(2)} pago</span>
          <div style="font-size:0.75rem; color:#ea580c;">Projetado: € ${vals.proj.toFixed(2)}</div>
        </div>
      </div>`;
  }
  subContainer.innerHTML = html;
}

function editOrcamento(id) {
  const item = orcamentoData.find(i => i.id === id);
  if(!item) return;
  document.getElementById("orc-cat").value = item.categoria;
  document.getElementById("orc-item").value = item.item;
  document.getElementById("orc-status").value = item.status;
  document.getElementById("orc-moeda").value = item.moeda;
  document.getElementById("orc-proj").value = item.projetado_eur;
  document.getElementById("modal-orcamento").classList.add("active");
}

async function handleOrcamentoSubmit(e) {
  e.preventDefault();
  const payload = {
    categoria: document.getElementById("orc-cat").value, 
    item: document.getElementById("orc-item").value,
    status: document.getElementById("orc-status").value, 
    moeda: document.getElementById("orc-moeda").value,
    projetado_eur: parseFloat(document.getElementById("orc-proj").value) || 0
  };
  await _supabase.from('orcamento').insert([payload]);
  closeModal('modal-orcamento'); 
  e.target.reset();
  await loadAllData();
}

function renderGastos() {
  const container = document.getElementById("gastos-list");
  container.innerHTML = "";
  gastosData.forEach(item => {
    let eur = item.moeda === "BRL" ? (item.valor_brl / euroMedio) : item.valor_eur;
    let brl = item.moeda === "EUR" ? (item.valor_eur * euroMedio) : item.valor_brl;
    
    container.innerHTML += `
      <div class="list-item" style="padding:10px 0; border-bottom:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center;">
        <div class="list-item-left">
          <span class="list-item-title" style="font-weight:600;">${item.item}</span>
          <div class="list-item-sub" style="font-size:0.8rem; color:#6b7280;">${item.data} • ${item.categoria} (${item.cidade || ''})</div>
        </div>
        <div class="list-item-right" style="text-align:right;">
          <div class="list-item-val" style="font-weight:700;">€ ${eur.toFixed(2)}</div>
          <div class="list-item-brl" style="font-size:0.75rem; color:#6b7280;">R$ ${brl.toFixed(2)}</div>
          <div style="margin-top:4px; display:flex; gap:4px; justify-content:flex-end;">
            <button class="btn-act" onclick="editGasto(${item.id})" style="padding:2px 6px; font-size:0.7rem;"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-act del-btn" onclick="deleteItem(${item.id}, 'gastos')" style="padding:2px 6px; font-size:0.7rem;"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>`;
  });
}

function editGasto(id) {
  const item = gastosData.find(i => i.id === id);
  if(!item) return;
  document.getElementById("gas-data").value = item.data;
  document.getElementById("gas-cidade").value = item.cidade;
  document.getElementById("gas-cat").value = item.categoria;
  document.getElementById("gas-item").value = item.item;
  document.getElementById("gas-moeda").value = item.moeda;
  document.getElementById("gas-valor").value = item.moeda === "EUR" ? item.valor_eur : item.valor_brl;
  document.getElementById("modal-gastos").classList.add("active");
}

async function handleGastosSubmit(e) {
  e.preventDefault();
  const moeda = document.getElementById("gas-moeda").value;
  const valor = parseFloat(document.getElementById("gas-valor").value) || 0;
  
  const payload = {
    data: document.getElementById("gas-data").value, 
    cidade: document.getElementById("gas-cidade").value,
    categoria: document.getElementById("gas-cat").value, 
    item: document.getElementById("gas-item").value,
    moeda: moeda, 
    valor_eur: moeda === "EUR" ? valor : 0, 
    valor_brl: moeda === "BRL" ? valor : 0
  };

  await _supabase.from('gastos').insert([payload]);
  closeModal('modal-gastos'); 
  e.target.reset();
  await loadAllData();
}