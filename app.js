const SUPABASE_URL = "https://vgjxorgortxouxjojgtn.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnanhvcmdvcnR4b3V4am9qZ3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NjQzNDgsImV4cCI6MjEwNDM0MDM0OH0.IelNiUMUA04-mhWQl9j57qRKOXEfleHb8zYEyS_D1o8";
//   let euroMedio = 5.98;
let currentTab = 'roteiro';
let currentFilter = "TODAS";
let currentSelectedDay = "10/05 mon";

// DADOS EXTRAÍDOS DIRETAMENTE DA SUA PLANILHA (EUROPA 2027_APP.xlsx)
let roteiroData = [
  {"DATA / DIA": "10/05 mon", "CIDADE": "AMSTERDAM", "REGIÃO": "", "CATEGORIA": "AEROPORTO", "ATRAÇÃO": "AMSTERDAM SCHIPHOL", "HORÁRIO": "10h50", "ENDEREÇO": "", "CUSTO": 0, "OBS": ""},
  {"DATA / DIA": "10/05 mon", "CIDADE": "AMSTERDAM", "REGIÃO": "BULLEWIJK", "CATEGORIA": "HOTEL", "ATRAÇÃO": "Hampton by Hilton Arena Boulevard", "HORÁRIO": "", "ENDEREÇO": "Hoekenrode 1", "CUSTO": 0, "OBS": "Checkin 15h; depósito malas"},
  {"DATA / DIA": "10/05 mon", "CIDADE": "AMSTERDAM", "REGIÃO": "DE WALLEN", "CATEGORIA": "MUSEU", "ATRAÇÃO": "NEMO Science Center", "HORÁRIO": "10-17h30", "ENDEREÇO": "Oosterdok 2", "CUSTO": 49.5, "OBS": "Renzo Piano"},
  {"DATA / DIA": "10/05 mon", "CIDADE": "AMSTERDAM", "REGIÃO": "JORDAAN", "CATEGORIA": "MUSEU", "ATRAÇÃO": "Casa de Anne Frank", "HORÁRIO": "9-22h", "ENDEREÇO": "Westermarkt 20", "CUSTO": 34, "OBS": ""},
  {"DATA / DIA": "11/05 tue", "CIDADE": "AMSTERDAM", "REGIÃO": "MUSEUMKWARTIER", "CATEGORIA": "MUSEU", "ATRAÇÃO": "Museu van Gogh", "HORÁRIO": "9-18h", "ENDEREÇO": "Museumplein 6", "CUSTO": 50, "OBS": ""},
  {"DATA / DIA": "12/05 wed", "CIDADE": "AMSTERDAM", "REGIÃO": "ZAANSE SCHANS", "CATEGORIA": "MARCO", "ATRAÇÃO": "Moinhos", "HORÁRIO": "", "ENDEREÇO": "", "CUSTO": 0, "OBS": ""},
  {"DATA / DIA": "13/05 thu", "CIDADE": "BRUXELAS", "REGIÃO": "BRUXELLES MIDI", "CATEGORIA": "ESTAÇÃO", "ATRAÇÃO": "BRUXELLES MIDI", "HORÁRIO": "15h11", "ENDEREÇO": "Av. Fonsny 47B", "CUSTO": 0, "OBS": ""},
  {"DATA / DIA": "13/05 thu", "CIDADE": "BRUXELAS", "REGIÃO": "", "CATEGORIA": "MARCO", "ATRAÇÃO": "Grand Place", "HORÁRIO": "24h", "ENDEREÇO": "Rue des Harengs 6, 1000", "CUSTO": 0, "OBS": ""},
  {"DATA / DIA": "14/05 fri", "CIDADE": "GENT", "REGIÃO": "", "CATEGORIA": "HOTEL", "ATRAÇÃO": "OsTi", "HORÁRIO": "14h", "ENDEREÇO": "Citadellaan 48", "CUSTO": 0, "OBS": ""},
  {"DATA / DIA": "15/05 sat", "CIDADE": "BRUGES", "REGIÃO": "", "CATEGORIA": "MARCO", "ATRAÇÃO": "Igreja de N. Senhora", "HORÁRIO": "", "ENDEREÇO": "Mariastraat", "CUSTO": 0, "OBS": ""},
  {"DATA / DIA": "20/05 thu", "CIDADE": "PARIS", "REGIÃO": "", "CATEGORIA": "MUSEU", "ATRAÇÃO": "Museu do Louvre", "HORÁRIO": "", "ENDEREÇO": "", "CUSTO": 22, "OBS": "Fechado 3a"}
]; // (Resumido no código fonte para exibição visual limpa, aceita adição dinâmica)

let orcamentoData = [
  {"CATEGORIA": "VOO", "ITEM": "LATAM", "PROJETADO (€)": 2759.20, "EFETIVADO (€)": 2435.21, "STATUS": "PAGO"},
  {"CATEGORIA": "TREM", "ITEM": "AMSTERDAM > BRUXELAS", "PROJETADO (€)": 60.0, "EFETIVADO (€)": 60.0, "STATUS": "PAGO"},
  {"CATEGORIA": "HOTEL", "ITEM": "HOTEL PARIS", "PROJETADO (€)": 1050.0, "EFETIVADO (€)": 759.85, "STATUS": "PAGO"},
  {"CATEGORIA": "ALIMENTAÇÃO", "ITEM": "ALIMENTAÇÃO AMSTERDAM", "PROJETADO (€)": 180.0, "EFETIVADO (€)": 0.0, "STATUS": "PROJETADO"}
];

let gastosData = [
  {"DATA": "10/05", "CIDADE": "AMSTERDAM", "CATEGORIA": "ALIMENTAÇÃO", "DESCRIÇÃO": "Almoço Rápido", "VALOR (€)": 35.0},
  {"DATA": "11/05", "CIDADE": "AMSTERDAM", "CATEGORIA": "COMPRAS", "DESCRIÇÃO": "Lembranças", "VALOR (€)": 15.0}
];

document.addEventListener("DOMContentLoaded", () => {
  renderDaysCarousel();
  renderCityChips();
  renderTimeline();
  renderOrcamento();
  renderGastos();
});

// NAVEGAÇÃO DE TABS E BOTÃO (+) CONTEXTUAL
function switchTab(tabName, btn) {
  currentTab = tabName;
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById(`tab-${tabName}`).classList.add("active");
  btn.classList.add("active");
}

function openContextModal() {
  document.getElementById(`modal-${currentTab}`).classList.add("active");
}
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

// ATUALIZAÇÃO DO EURO MÉDIO GLOBAL
function updateEuro() {
  euroMedio = parseFloat(document.getElementById("euro-input").value) || 5.98;
  renderOrcamento();
  renderGastos();
}

// === RENDERIZAÇÃO: ROTEIRO ===
function renderDaysCarousel() {
  const container = document.getElementById("days-carousel-container");
  container.innerHTML = "";
  const uniqueDays = [...new Set(roteiroData.map(item => item["DATA / DIA"]).filter(Boolean))];

  uniqueDays.forEach(dayStr => {
    const parts = dayStr.split(" ");
    const dayNum = parts[0] ? parts[0].split("/")[0] : "--";
    const dayName = parts[1] ? parts[1].toUpperCase() : "DIA";

    const card = document.createElement("div");
    card.className = `day-card ${dayStr === currentSelectedDay ? 'active' : ''}`;
    card.onclick = () => { currentSelectedDay = dayStr; renderDaysCarousel(); renderTimeline(); };
    card.innerHTML = `<span class="day-name">${dayName}</span><span class="day-num">${dayNum}</span>`;
    container.appendChild(card);
  });
}

function renderCityChips() {
  const cityBar = document.getElementById("city-bar");
  const cities = ["TODAS", ...new Set(roteiroData.map(i => i.CIDADE.toUpperCase()).filter(Boolean))];
  cityBar.innerHTML = "";
  cities.forEach(city => {
    const chip = document.createElement("button");
    chip.className = `chip ${city === currentFilter ? 'active' : ''}`;
    chip.innerText = city.charAt(0) + city.slice(1).toLowerCase();
    chip.onclick = () => { currentFilter = city; renderCityChips(); renderTimeline(); };
    cityBar.appendChild(chip);
  });
}

function renderTimeline() {
  const container = document.getElementById("timeline-container");
  container.innerHTML = "";

  let filtered = roteiroData.filter(i => i["DATA / DIA"] === currentSelectedDay);
  if (currentFilter !== "TODAS") filtered = filtered.filter(i => i.CIDADE === currentFilter);

  filtered.forEach(item => {
    if (item.CATEGORIA === "ESTAÇÃO" || item.CATEGORIA === "TREM") {
      container.innerHTML += `<div class="train-strip"><div class="train-info"><i class="fa-solid fa-train"></i> <span>${item.ATRAÇÃO} ${item.HORÁRIO ? '('+item.HORÁRIO+')' : ''}</span></div><span>€ ${item.CUSTO || 0}</span></div>`;
      return;
    }
    
    let catBg = "var(--cat-default)";
    if(item.CATEGORIA === "MUSEU") catBg = "var(--cat-museu)";
    if(item.CATEGORIA === "HOTEL") catBg = "var(--cat-hotel)";
    if(item.CATEGORIA === "RESTAURANTE") catBg = "var(--cat-restaurante)";

    container.innerHTML += `
      <div class="card" style="margin-bottom:10px;">
        <div class="card-top">
          <span class="badge-cat" style="background: ${catBg}">${item.CATEGORIA}</span>
          <span class="card-time">${item.HORÁRIO || ''}</span>
        </div>
        <div class="card-title">${item.ATRAÇÃO}</div>
        ${item.ENDEREÇO ? `<div class="card-address"><i class="fa-solid fa-location-dot"></i> ${item.ENDEREÇO}</div>` : ''}
        ${item.OBS ? `<div class="card-obs"><i class="fa-regular fa-lightbulb"></i> ${item.OBS}</div>` : ''}
      </div>`;
  });
}

function handleRoteiroSubmit(e) {
  e.preventDefault();
  roteiroData.push({
    "DATA / DIA": document.getElementById("rot-dia").value, "CIDADE": document.getElementById("rot-cidade").value,
    "ATRAÇÃO": document.getElementById("rot-atracao").value, "CATEGORIA": document.getElementById("rot-categoria").value,
    "CUSTO": parseFloat(document.getElementById("rot-custo").value) || 0
  });
  renderDaysCarousel(); renderTimeline(); closeModal('modal-roteiro'); e.target.reset();
}

// === RENDERIZAÇÃO: ORÇAMENTO ===
function renderOrcamento() {
  const container = document.getElementById("orcamento-list");
  container.innerHTML = "";
  let projTot = 0, efetTot = 0;

  orcamentoData.forEach(item => {
    projTot += parseFloat(item["PROJETADO (€)"] || 0);
    efetTot += parseFloat(item["EFETIVADO (€)"] || 0);

    const valEur = item.STATUS === "PAGO" ? item["EFETIVADO (€)"] : item["PROJETADO (€)"];
    const valBrl = valEur * euroMedio;
    const color = item.STATUS === "PAGO" ? "#059669" : "var(--text-main)";

    container.innerHTML += `
      <div class="list-item">
        <div class="list-item-left">
          <span class="list-item-title">${item.ITEM}</span>
          <span class="list-item-sub">${item.CATEGORIA} • ${item.STATUS}</span>
        </div>
        <div class="list-item-right">
          <div class="list-item-val" style="color:${color}">€ ${valEur.toFixed(2)}</div>
          <div class="list-item-brl">R$ ${valBrl.toFixed(2)}</div>
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
    "CATEGORIA": document.getElementById("orc-cat").value, "ITEM": document.getElementById("orc-item").value,
    "PROJETADO (€)": parseFloat(document.getElementById("orc-proj").value) || 0,
    "EFETIVADO (€)": parseFloat(document.getElementById("orc-efet").value) || 0,
    "STATUS": document.getElementById("orc-status").value
  });
  renderOrcamento(); closeModal('modal-orcamento'); e.target.reset();
}

// === RENDERIZAÇÃO: GASTOS ===
function renderGastos() {
  const container = document.getElementById("gastos-list");
  container.innerHTML = "";
  gastosData.forEach(item => {
    const brl = item["VALOR (€)"] * euroMedio;
    container.innerHTML += `
      <div class="list-item">
        <div class="list-item-left">
          <span class="list-item-title">${item.DESCRIÇÃO}</span>
          <span class="list-item-sub">${item.DATA} • ${item.CIDADE} • ${item.CATEGORIA}</span>
        </div>
        <div class="list-item-right">
          <div class="list-item-val">€ ${item["VALOR (€)"].toFixed(2)}</div>
          <div class="list-item-brl">R$ ${brl.toFixed(2)}</div>
        </div>
      </div>`;
  });
}

function handleGastosSubmit(e) {
  e.preventDefault();
  gastosData.push({
    "DATA": document.getElementById("gas-data").value, "CIDADE": document.getElementById("gas-cidade").value,
    "CATEGORIA": "GERAL", "DESCRIÇÃO": document.getElementById("gas-desc").value,
    "VALOR (€)": parseFloat(document.getElementById("gas-valor").value) || 0
  });
  renderGastos(); closeModal('modal-gastos'); e.target.reset();
}
