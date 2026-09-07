// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = "https://vgjxorgortxouxjojgtn.supabase.co";
const SUPABASE_KEY = "sb_publishable_f7S6v6aWr2cEFjJjuMVZPg_P2uQi"; // Substitua caso copie a chave inteira do painel
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
  const { data: rot } = await _supabase.from('roteiro').select('*').order('ORDEM', { ascending: true });
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

// --- NAVEGAÇÃO & DATAS ---
function autoSelectToday() {
  const hoje = new Date();
  const diaMes = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const targetDay = roteiroData.find(i => i["DATA / DIA"] && i["DATA / DIA"].startsWith(diaMes));
  
  if (targetDay) {
    currentSelectedDay = targetDay["DATA / DIA"];
  } else {
    const uniqueDays = [...new Set(roteiroData.map(item => item["DATA / DIA"]).filter(Boolean))];
    currentSelectedDay = uniqueDays[0] || "";
  }
}

function populateSelects() {
  const uniqueDays = [...new Set(roteiroData.map(item => item["DATA / DIA"]).filter(Boolean))];
  const uniqueCities = [...new Set(roteiroData.map(item => item.CIDADE ? item.CIDADE.toUpperCase() : "").filter(Boolean))];
  
  const rotDia = document.getElementById("rot-dia");
  const gasDia = document.getElementById("gas-data");
  if(rotDia) rotDia.innerHTML = uniqueDays.map(d => `<option value="${d}">${d}</option>`).join("");
  if(gasDia) gasDia.innerHTML = uniqueDays.map(d => `<option value="${d}">${d}</option>`).join("");

  const rotCity = document.getElementById("rot-cidade");
  const gasCity = document.getElementById("gas-cidade");
  if(rotCity) rotCity.innerHTML = uniqueCities.map(c => `<option value="${c}">${c}</option>`).join("");
  if(gasCity) gasCity.innerHTML = uniqueCities.map(c => `<option value="${c}">${c}</option>`).join("");
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
  let uniqueDays = [...new Set(roteiroData.map(item => item["DATA / DIA"]).filter(Boolean))];
  
  if (currentFilter !== "TODAS") {
    uniqueDays = [...new Set(roteiroData.filter(i => i.CIDADE === currentFilter).map(item => item["DATA / DIA"]))];
  }

  uniqueDays.forEach(dayStr => {
    const parts = dayStr.split(" ");
    const dayNum = parts[0] ? parts[0].split("/")[0] : "--";
    const dayName = parts[1] ? parts[1].toUpperCase() : "DIA";

    const card = document.createElement("div");
    card.className = `day-card ${dayStr === currentSelectedDay ? 'active' : ''}`;
    card.onclick = () => { currentSelectedDay = dayStr; renderDaysCarousel(); renderCityChips(); renderTimeline(); };
    card.innerHTML = `<span class="day-name">${dayName}</span><span class="day-num">${dayNum}</span>`;
    container.appendChild(card);
  });
}

function renderCityChips() {
  const cityBar = document.getElementById("city-bar");
  let validCities = [...new Set(roteiroData.map(i => i.CIDADE ? i.CIDADE.toUpperCase() : "").filter(Boolean))];
  
  if (currentSelectedDay) {
    validCities = [...new Set(roteiroData.filter(i => i["DATA / DIA"] === currentSelectedDay).map(i => i.CIDADE ? i.CIDADE.toUpperCase() : ""))];
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

function editRoteiro(id) {
  const item = roteiroData.find(i => i.id === id);
  if(!item) return;
  document.getElementById("rot-id").value = item.id;
  document.getElementById("rot-dia").value = item["DATA / DIA"];
  document.getElementById("rot-cidade").value = item.CIDADE;
  document.getElementById("rot-categoria").value = item.CATEGORIA;
  document.getElementById("rot-atracao").value = item.ATRAÇÃO;
  document.getElementById("rot-regiao").value = item.REGIÃO || "";
  document.getElementById("rot-horario").value = item.HORÁRIO || "";
  document.getElementById("rot-endereco").value = item.ENDEREÇO || "";
  document.getElementById("rot-custo").value = item.CUSTO || "";
  document.getElementById("rot-link").value = item.LINK || "";
  document.getElementById("rot-obs").value = item.OBS || "";
  document.getElementById("modal-roteiro").classList.add("active");
}

function renderTimeline() {
  const container = document.getElementById("timeline-container");
  container.innerHTML = "";

  let filtered = roteiroData.filter(i => i["DATA / DIA"] === currentSelectedDay);
  if (currentFilter !== "TODAS") filtered = filtered.filter(i => i.CIDADE === currentFilter);
  if (showDone === "PENDING") filtered = filtered.filter(i => !i.feito);
  
  filtered.sort((a,b) => (a.ORDEM || 99) - (b.ORDEM || 99));

  filtered.forEach(item => {
    if (item.CATEGORIA === "ESTAÇÃO" || item.CATEGORIA === "TREM") {
      container.innerHTML += `
        <div class="train-strip" data-id="${item.id}">
          <div class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></div>
          <div class="train-info">
            <span class="train-title"><i class="fa-solid fa-train"></i> ${item.ATRAÇÃO}</span>
            <span class="train-route"><i class="fa-regular fa-clock"></i> ${item.HORÁRIO || 'Horário a definir'}</span>
          </div>
          <div class="action-group">
            <button class="btn-act del-btn" onclick="deleteItem(${item.id}, 'roteiro')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`;
      return;
    }
    
    let catBg = "var(--cat-default)";
    if(item.CATEGORIA === "MUSEU") catBg = "var(--cat-museu)";
    if(item.CATEGORIA === "HOTEL") catBg = "var(--cat-hotel)";
    if(item.CATEGORIA === "RESTAURANTE") catBg = "var(--cat-restaurante)";
    if(item.CATEGORIA === "MARCO") catBg = "var(--cat-marco)";

    const isFeito = item.feito ? 'feito' : '';
    const btnFeitoClass = item.feito ? 'active' : '';

    container.innerHTML += `
      <div class="card ${isFeito}" data-id="${item.id}">
        <div class="card-top">
          <div class="card-top-left">
            <span class="badge-cat" style="background: ${catBg}">${item.CATEGORIA}</span>
            <span class="card-time">${item.HORÁRIO || ''}</span>
          </div>
          <div class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></div>
        </div>
        <div class="card-title">${item.ATRAÇÃO}</div>
        ${item.ENDEREÇO || item.REGIÃO ? `<div class="card-address"><i class="fa-solid fa-location-dot"></i> ${item.ENDEREÇO || ''} ${item.REGIÃO ? '• '+item.REGIÃO : ''}</div>` : ''}
        ${item.OBS ? `<div class="card-obs"><i class="fa-solid fa-circle-exclamation"></i> ${item.OBS}</div>` : ''}
        <div class="card-actions">
          <span class="card-cost">${item.CUSTO ? '€ ' + parseFloat(item.CUSTO).toFixed(2) : ''}</span>
          <div class="action-group">
             <button class="btn-act done-btn ${btnFeitoClass}" onclick="toggleDone(${item.id})"><i class="fa-solid fa-check"></i></button>
             <button class="btn-act" onclick="editRoteiro(${item.id})"><i class="fa-solid fa-pen"></i></button>
             <button class="btn-act del-btn" onclick="deleteItem(${item.id}, 'roteiro')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>`;
  });

  new Sortable(container, {
    handle: '.drag-handle',
    animation: 150,
    onEnd: async function () {
      const cards = container.children;
      for (let index = 0; index < cards.length; index++) {
        const id = parseInt(cards[index].getAttribute('data-id'));
        const target = roteiroData.find(r => r.id === id);
        if(target) {
          target.ORDEM = index + 1;
          await _supabase.from('roteiro').update({ ORDEM: index + 1 }).eq('id', id);
        }
      }
    }
  });
}

async function handleRoteiroSubmit(e) {
  e.preventDefault();
  const idStr = document.getElementById("rot-id").value;
  
  const payload = {
    "DATA / DIA": document.getElementById("rot-dia").value, 
    "CIDADE": document.getElementById("rot-cidade").value,
    "ATRAÇÃO": document.getElementById("rot-atracao").value, 
    "CATEGORIA": document.getElementById("rot-categoria").value,
    "REGIÃO": document.getElementById("rot-regiao").value, 
    "HORÁRIO": document.getElementById("rot-horario").value,
    "ENDEREÇO": document.getElementById("rot-endereco").value, 
    "CUSTO": parseFloat(document.getElementById("rot-custo").value) || 0,
    "LINK": document.getElementById("rot-link").value, 
    "OBS": document.getElementById("rot-obs").value
  };

  if(idStr) {
    await _supabase.from('roteiro').update(payload).eq('id', parseInt(idStr));
  } else {
    payload.ORDEM = 99;
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

  orcamentoData.forEach(item => {
    let projEur = item.MOEDA === "BRL" ? (item["PROJETADO (€)"] / euroMedio) : item["PROJETADO (€)"];
    let gastosDaCategoria = gastosData.filter(g => g.CATEGORIA === item.CATEGORIA && g.ITEM === item.ITEM);
    let calcEfetEur = 0;
    
    if (gastosDaCategoria.length > 0) {
      gastosDaCategoria.forEach(g => {
        calcEfetEur += g.MOEDA === "BRL" ? (g["VALOR (R$)"] / euroMedio) : g["VALOR (€)"];
      });
    } else {
      if(item.STATUS === "PAGO") calcEfetEur = projEur; 
    }

    projTot += projEur || 0;
    efetTot += calcEfetEur || 0;
    
    const color = item.STATUS === "PAGO" || calcEfetEur > 0 ? "#059669" : "var(--text-main)";

    container.innerHTML += `
      <div class="list-item">
        <div class="list-item-left">
          <span class="list-item-title">${item.ITEM}</span>
          <span class="list-item-sub">${item.CATEGORIA} • ${item.STATUS}</span>
        </div>
        <div class="list-item-right">
          <div class="list-item-val" style="color:${color}">€ ${calcEfetEur > 0 ? calcEfetEur.toFixed(2) : (projEur || 0).toFixed(2)}</div>
        </div>
      </div>`;
  });

  document.getElementById("metric-proj-eur").innerText = `€ ${projTot.toFixed(2)}`;
  document.getElementById("metric-proj-brl").innerText = `R$ ${(projTot * euroMedio).toFixed(2)}`;
  document.getElementById("metric-efet-eur").innerText = `€ ${efetTot.toFixed(2)}`;
  document.getElementById("metric-efet-brl").innerText = `R$ ${(efetTot * euroMedio).toFixed(2)}`;
}

async function handleOrcamentoSubmit(e) {
  e.preventDefault();
  const payload = {
    "CATEGORIA": document.getElementById("orc-cat").value, 
    "ITEM": document.getElementById("orc-item").value,
    "STATUS": document.getElementById("orc-status").value, 
    "MOEDA": document.getElementById("orc-moeda").value,
    "PROJETADO (€)": parseFloat(document.getElementById("orc-proj").value) || 0
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
    let eur = item.MOEDA === "BRL" ? (item["VALOR (R$)"] / euroMedio) : item["VALOR (€)"];
    let brl = item.MOEDA === "EUR" ? (item["VALOR (€)"] * euroMedio) : item["VALOR (R$)"];
    
    container.innerHTML += `
      <div class="list-item">
        <div class="list-item-left">
          <span class="list-item-title">${item.ITEM}</span>
          <span class="list-item-sub">${item.DATA} • ${item.CATEGORIA}</span>
        </div>
        <div class="list-item-right">
          <div class="list-item-val">€ ${eur.toFixed(2)}</div>
          <div class="list-item-brl">R$ ${brl.toFixed(2)}</div>
        </div>
      </div>`;
  });
}

async function handleGastosSubmit(e) {
  e.preventDefault();
  const moeda = document.getElementById("gas-moeda").value;
  const valor = parseFloat(document.getElementById("gas-valor").value) || 0;
  
  const payload = {
    "DATA": document.getElementById("gas-data").value, 
    "CIDADE": document.getElementById("gas-cidade").value,
    "CATEGORIA": document.getElementById("gas-cat").value, 
    "ITEM": document.getElementById("gas-item").value,
    "MOEDA": moeda, 
    "VALOR (€)": moeda === "EUR" ? valor : 0, 
    "VALOR (R$)": moeda === "BRL" ? valor : 0
  };

  await _supabase.from('gastos').insert([payload]);
  closeModal('modal-gastos'); 
  e.target.reset();
  await loadAllData();
}
