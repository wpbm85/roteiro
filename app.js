// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = "https://vgjxorgortxouxjojgtn.supabase.co/rest/v1/";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnanhvcmdvcnR4b3V4am9qZ3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NjQzNDgsImV4cCI6MjEwNDM0MDM0OH0.IelNiUMUA04-mhWQl9j57qRKOXEfleHb8zYEyS_D1o8";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let session = null;
let euroMedio = 5.98;
let currentTab = 'roteiro';
let currentFilter = "TODAS";
let currentSelectedDay = null; 
let showDone = "ALL"; // 'ALL' ou 'PENDING'

// DADOS EXTRAÍDOS DA NOVA PLANILHA
let roteiroData = [
  {"id":1, "DATA / DIA": "10/05 mon", "CIDADE": "AMSTERDAM", "REGIÃO": "", "ORDEM": 1, "CATEGORIA": "AEROPORTO", "ATRAÇÃO": "AMSTERDAM SCHIPHOL", "HORÁRIO": "10h50", "ENDEREÇO": "", "CUSTO": 0, "LINK": "", "OBS": "", "feito": false},
  {"id":2, "DATA / DIA": "10/05 mon", "CIDADE": "AMSTERDAM", "REGIÃO": "BULLEWIJK", "ORDEM": 2, "CATEGORIA": "HOTEL", "ATRAÇÃO": "Hampton by Hilton Arena Boulevard", "HORÁRIO": "", "ENDEREÇO": "Hoekenrode 1", "CUSTO": 0, "OBS": "Checkin 15h; depósito malas", "feito": false},
  {"id":3, "DATA / DIA": "10/05 mon", "CIDADE": "AMSTERDAM", "REGIÃO": "DE WALLEN", "ORDEM": 3, "CATEGORIA": "MUSEU", "ATRAÇÃO": "NEMO Science Center", "HORÁRIO": "10-17h30", "ENDEREÇO": "Oosterdok 2", "CUSTO": 49.5, "LINK": "https://maps.app.goo.gl/HQgHmEkUffjoBnrd9", "OBS": "Renzo Piano", "feito": false},
  {"id":4, "DATA / DIA": "13/05 thu", "CIDADE": "BRUXELAS", "REGIÃO": "BRUXELLES MIDI", "ORDEM": 1, "CATEGORIA": "ESTAÇÃO", "ATRAÇÃO": "AMSTERDAM ZUID > BRUXELLES MIDI", "HORÁRIO": "13h03 > 15h11", "ENDEREÇO": "Spoorslag 29", "CUSTO": 60, "OBS": "Já pago", "feito": false},
  {"id":5, "DATA / DIA": "13/05 thu", "CIDADE": "BRUXELAS", "REGIÃO": "", "ORDEM": 2, "CATEGORIA": "MARCO", "ATRAÇÃO": "Grand Place", "HORÁRIO": "24h", "ENDEREÇO": "Rue des Harengs 6, 1000", "CUSTO": 0, "OBS": "", "feito": false},
  {"id":6, "DATA / DIA": "17/05 mon", "CIDADE": "PARIS", "REGIÃO": "", "ORDEM": 1, "CATEGORIA": "HOTEL", "ATRAÇÃO": "AIRBNB", "HORÁRIO": "15h", "ENDEREÇO": "19, Avenue de Paris", "CUSTO": 0, "OBS": "CHECKIN 15h; MALAS", "feito": false},
  {"id":7, "DATA / DIA": "20/05 thu", "CIDADE": "PARIS", "REGIÃO": "", "ORDEM": 1, "CATEGORIA": "MUSEU", "ATRAÇÃO": "Museu do Louvre", "HORÁRIO": "9h-18h", "ENDEREÇO": "Rue de Rivoli", "CUSTO": 22, "OBS": "Fechado 3a", "feito": false}
]; // Estrutura resumida, adicionará tudo via modal facilmente.

let orcamentoData = [
  {"id":1, "CATEGORIA": "HOTEL", "ITEM": "HOTEL AMSTERDAM", "CIDADE": "AMSTERDAM", "PROJETADO (€)": 333.56, "STATUS": "A PAGAR", "MOEDA": "EUR"},
  {"id":2, "CATEGORIA": "HOTEL", "ITEM": "HOTEL PARIS", "CIDADE": "PARIS", "PROJETADO (€)": 1050, "STATUS": "PAGO", "MOEDA": "BRL"},
  {"id":3, "CATEGORIA": "TREM", "ITEM": "AMSTERDAM > BRUXELAS", "CIDADE": "BRUXELAS", "PROJETADO (€)": 60, "STATUS": "PAGO", "MOEDA": "EUR"}
];

let gastosData = [
  {"id":1, "DATA": "24/08 mon", "CIDADE": "GERAL", "CATEGORIA": "VOO", "ITEM": "LATAM", "MOEDA": "BRL", "VALOR (R$)": 14562.54, "VALOR (€)": 2435.20}
];

// --- AUTH & INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await _supabase.auth.getSession();
  if (data.session) {
    session = data.session;
    startApp();
  }
});

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-senha").value;
  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    document.getElementById("login-error").style.display = "block";
  } else {
    session = data.session;
    startApp();
  }
}

async function logout() {
  await _supabase.auth.signOut();
  window.location.reload();
}

function startApp() {
  document.getElementById("modal-login").classList.remove("active");
  document.getElementById("main-content").style.display = "block";
  document.getElementById("fab-btn").style.display = "flex";
  document.getElementById("bottom-nav").style.display = "flex";
  
  autoSelectToday(); // Seleciona o dia atual
  populateSelects(); // Preenche dropdowns dos formulários
  
  renderDaysCarousel();
  renderCityChips();
  renderTimeline();
  renderOrcamento();
  renderGastos();
}

// --- LÓGICA DE DATAS ---
function autoSelectToday() {
  const hoje = new Date();
  const diaMes = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  // Procura se a string do dia existe no roteiro (ex: "10/05")
  const targetDay = roteiroData.find(i => i["DATA / DIA"].startsWith(diaMes));
  
  if (targetDay) {
    currentSelectedDay = targetDay["DATA / DIA"];
  } else {
    // Se não for época da viagem, seleciona o 1º dia cadastrado cronologicamente
    const uniqueDays = [...new Set(roteiroData.map(item => item["DATA / DIA"]).filter(Boolean))];
    currentSelectedDay = uniqueDays[0] || "";
  }
}

// --- POPULAR DROPDOWNS DO SINAIS DE + ---
function populateSelects() {
  const uniqueDays = [...new Set(roteiroData.map(item => item["DATA / DIA"]).filter(Boolean))];
  const uniqueCities = [...new Set(roteiroData.map(item => item.CIDADE.toUpperCase()).filter(Boolean))];
  
  const rotDia = document.getElementById("rot-dia");
  const gasDia = document.getElementById("gas-data");
  rotDia.innerHTML = ""; gasDia.innerHTML = "";
  uniqueDays.forEach(d => {
    rotDia.innerHTML += `<option value="${d}">${d}</option>`;
    gasDia.innerHTML += `<option value="${d}">${d}</option>`;
  });

  const rotCity = document.getElementById("rot-cidade");
  const gasCity = document.getElementById("gas-cidade");
  rotCity.innerHTML = ""; gasCity.innerHTML = "";
  uniqueCities.forEach(c => {
    rotCity.innerHTML += `<option value="${c}">${c}</option>`;
    gasCity.innerHTML += `<option value="${c}">${c}</option>`;
  });
}

// --- NAVEGAÇÃO & UI ---
function switchTab(tabName, btn) {
  currentTab = tabName;
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById(`tab-${tabName}`).classList.add("active");
  btn.classList.add("active");
}

function openContextModal() {
  document.getElementById("rot-id").value = ""; // Limpa ID (modo criar)
  document.getElementById(`modal-${currentTab}`).classList.add("active");
}
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

// --- ROTEIRO COMPLETO ---
function renderDaysCarousel() {
  const container = document.getElementById("days-carousel-container");
  container.innerHTML = "";
  let uniqueDays = [...new Set(roteiroData.map(item => item["DATA / DIA"]).filter(Boolean))];
  
  // Se houver uma cidade filtrada, mostra só os dias em que a cidade está presente
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
  let validCities = [...new Set(roteiroData.map(i => i.CIDADE.toUpperCase()).filter(Boolean))];
  
  // O filtro de cidades só mostra as cidades contidas no dia selecionado
  if (currentSelectedDay) {
    validCities = [...new Set(roteiroData.filter(i => i["DATA / DIA"] === currentSelectedDay).map(i => i.CIDADE.toUpperCase()))];
  }
  
  // Se a cidade atual não faz parte deste dia, reseta para "TODAS"
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

function toggleDone(id) {
  const item = roteiroData.find(i => i.id === id);
  if(item) { item.feito = !item.feito; renderTimeline(); }
}

function deleteItem(id, type) {
  if(!confirm("Tem certeza que deseja excluir?")) return;
  if(type === 'roteiro') roteiroData = roteiroData.filter(i => i.id !== id);
  renderTimeline();
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
    // TRENS VISUAL
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
    
    // CARDS NORMAIS
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

  // Ativar Drag and Drop restrito apenas ao botão de Grip (handle)
  new Sortable(container, {
    handle: '.drag-handle',
    animation: 150,
    onEnd: function () {
      const cards = container.children;
      Array.from(cards).forEach((child, index) => {
        const id = parseInt(child.getAttribute('data-id'));
        const target = roteiroData.find(r => r.id === id);
        if(target) target.ORDEM = index + 1;
      });
    }
  });
}

function handleRoteiroSubmit(e) {
  e.preventDefault();
  const idStr = document.getElementById("rot-id").value;
  
  const payload = {
    "DATA / DIA": document.getElementById("rot-dia").value, "CIDADE": document.getElementById("rot-cidade").value,
    "ATRAÇÃO": document.getElementById("rot-atracao").value, "CATEGORIA": document.getElementById("rot-categoria").value,
    "REGIÃO": document.getElementById("rot-regiao").value, "HORÁRIO": document.getElementById("rot-horario").value,
    "ENDEREÇO": document.getElementById("rot-endereco").value, "CUSTO": parseFloat(document.getElementById("rot-custo").value) || 0,
    "LINK": document.getElementById("rot-link").value, "OBS": document.getElementById("rot-obs").value
  };

  if(idStr) {
    const item = roteiroData.find(i => i.id === parseInt(idStr));
    Object.assign(item, payload);
  } else {
    payload.id = Date.now();
    payload.ORDEM = 99;
    payload.feito = false;
    roteiroData.push(payload);
  }
  renderDaysCarousel(); renderCityChips(); renderTimeline(); closeModal('modal-roteiro'); e.target.reset();
}

// --- INTEGRAÇÃO ORÇAMENTO E GASTOS ---
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
    
    // O Efetivado agora busca dos gastos reais caso existam na mesma categoria
    let gastosDaCategoria = gastosData.filter(g => g.CATEGORIA === item.CATEGORIA && g.ITEM === item.ITEM);
    let calcEfetEur = 0;
    
    if (gastosDaCategoria.length > 0) {
      gastosDaCategoria.forEach(g => {
        calcEfetEur += g.MOEDA === "BRL" ? (g["VALOR (R$)"] / euroMedio) : g["VALOR (€)"];
      });
    } else {
      // Se não há gasto real, e estiver PAGO, assume o projetado.
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

function handleOrcamentoSubmit(e) {
  e.preventDefault();
  orcamentoData.push({
    id: Date.now(),
    "CATEGORIA": document.getElementById("orc-cat").value, "ITEM": document.getElementById("orc-item").value,
    "STATUS": document.getElementById("orc-status").value, "MOEDA": document.getElementById("orc-moeda").value,
    "PROJETADO (€)": parseFloat(document.getElementById("orc-proj").value) || 0
  });
  renderOrcamento(); closeModal('modal-orcamento'); e.target.reset();
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

function handleGastosSubmit(e) {
  e.preventDefault();
  const moeda = document.getElementById("gas-moeda").value;
  const valor = parseFloat(document.getElementById("gas-valor").value) || 0;
  
  gastosData.push({
    id: Date.now(), "DATA": document.getElementById("gas-data").value, "CIDADE": document.getElementById("gas-cidade").value,
    "CATEGORIA": document.getElementById("gas-cat").value, "ITEM": document.getElementById("gas-item").value,
    "MOEDA": moeda, "VALOR (€)": moeda === "EUR" ? valor : 0, "VALOR (R$)": moeda === "BRL" ? valor : 0
  });
  renderGastos(); renderOrcamento(); closeModal('modal-gastos'); e.target.reset();
}