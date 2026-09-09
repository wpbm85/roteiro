const SUPABASE_URL = "https://vgjxorgortxouxjojgtn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnanhvcmdvcnR4b3V4am9qZ3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NjQzNDgsImV4cCI6MjEwNDM0MDM0OH0.IelNiUMUA04-mhWQl9j57qRKOXEfleHb8zYEyS_D1o8";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let session = null;
let euroMedio = 5.98;
let currentTab = 'roteiro';
let currentFilter = "TODAS";
let currentSelectedDay = null; 
let showDone = "ALL";
let isInitialized = false;

let roteiroData = [];
let orcamentoData = [];
let gastosData = [];

const DIAS_TRADUCAO = {
  'MON': 'SEG', 'TUE': 'TER', 'WED': 'QUA', 'THU': 'QUI', 'FRI': 'SEX', 'SAT': 'SÁB', 'SUN': 'DOM'
};

function normalizeStr(str) {
  if (!str) return "";
  return str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function formatTimeMask(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length >= 3) {
    input.value = v.slice(0, 2) + ':' + v.slice(2, 4);
  } else {
    input.value = v;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  _supabase.auth.onAuthStateChange(async (event, currentSession) => {
    if (currentSession) {
      session = currentSession;
      if (!isInitialized) {
        isInitialized = true;
        startApp();
      }
    } else {
      session = null;
      isInitialized = false;
      const loginModal = document.getElementById("modal-login");
      if (loginModal) loginModal.classList.add("active");
    }
  });

  const { data } = await _supabase.auth.getSession();
  if (data.session && !isInitialized) {
    session = data.session;
    isInitialized = true;
    startApp();
  }
});

async function handleLogin(e) {
  if (e) e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-senha").value;
  const errBox = document.getElementById("login-error");
  if (errBox) errBox.style.display = "none";

  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (errBox) {
      errBox.innerText = `Erro: ${error.message}`;
      errBox.style.display = "block";
    }
  } else {
    session = data.session;
    isInitialized = true;
    startApp();
  }
}

async function logout() {
  await _supabase.auth.signOut();
  window.location.reload();
}

async function startApp() {
  const loginModal = document.getElementById("modal-login");
  if (loginModal) loginModal.classList.remove("active");
  document.getElementById("main-content").style.display = "block";
  document.getElementById("fab-btn").style.display = "flex";
  document.getElementById("bottom-nav").style.display = "flex";

  await loadAllData(true);
}

async function loadAllData(isFirstLoad = false) {
  const { data: rot } = await _supabase.from('roteiro').select('*').order('ordem', { ascending: true });
  const { data: orc } = await _supabase.from('orcamento').select('*');
  const { data: gas } = await _supabase.from('gastos').select('*');

  roteiroData = rot || [];
  orcamentoData = (orc || []).filter(item => item.item && normalizeStr(item.categoria) !== 'total');
  gastosData = (gas || []).filter(item => item.item && normalizeStr(item.categoria) !== 'total');

  if (isFirstLoad || !currentSelectedDay) {
    autoSelectToday();
  }
  
  populateSelects();
  renderDaysCarousel();
  renderCityChips();
  renderTimeline();
  renderOrcamento();
  renderGastos();
}

function formatDayLabel(dayStr) {
  if (!dayStr) return { num: '--', name: 'DIA', full: '' };
  const parts = dayStr.trim().split(" ");
  const dayNum = parts[0] || "--";
  let dayName = parts[1] ? parts[1].toUpperCase() : "";
  if (DIAS_TRADUCAO[dayName]) dayName = DIAS_TRADUCAO[dayName];
  return { num: dayNum.split("/")[0], name: dayName, full: `${dayNum} ${dayName}` };
}

function parseDateForSort(dayStr) {
  if (!dayStr) return 9999;
  const match = dayStr.match(/(\d{2})\/(\d{2})/);
  if (match) return parseInt(match[2]) * 100 + parseInt(match[1]);
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
  if(rotDia) {
    rotDia.innerHTML = uniqueDays.map(d => {
      const formatted = formatDayLabel(d);
      return `<option value="${d}">${formatted.full}</option>`;
    }).join("");
  }

  const cidadesFixas = ["GERAL", "AMSTERDAM", "BRUXELAS", "GENT", "BRUGES", "PARIS", "ROTERDAM", "DELFT", "HAIA"];
  const categoriasRoteiro = ["AEROPORTO", "DESTAQUE", "ESTAÇÃO", "HOTEL", "LOJA", "MUSEU", "PARQUE", "RESTAURANTE", "OUTRO"];
  const categoriasFinanceiro = ["VOO", "TREM", "HOTEL", "ALIMENTAÇÃO", "INGRESSOS", "TRANSPORTE", "COMPRAS", "MERCADO", "OUTROS"];

  const rotCity = document.getElementById("rot-cidade");
  const gasCity = document.getElementById("gas-cidade");
  if(rotCity) rotCity.innerHTML = cidadesFixas.map(c => `<option value="${c}">${c}</option>`).join("");
  if(gasCity) gasCity.innerHTML = cidadesFixas.map(c => `<option value="${c}">${c}</option>`).join("");

  const rotCat = document.getElementById("rot-categoria");
  if(rotCat) rotCat.innerHTML = categoriasRoteiro.map(c => `<option value="${c}">${c}</option>`).join("");

  const gasCat = document.getElementById("gas-cat");
  const orcCat = document.getElementById("orc-cat");
  if(gasCat) gasCat.innerHTML = categoriasFinanceiro.map(c => `<option value="${c}">${c}</option>`).join("");
  if(orcCat) orcCat.innerHTML = categoriasFinanceiro.map(c => `<option value="${c}">${c}</option>`).join("");
}

function switchTab(tabName, btn) {
  currentTab = tabName;
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById(`tab-${tabName}`).classList.add("active");
  btn.classList.add("active");
}

function openContextModal() {
  if (currentTab === 'roteiro') {
    document.getElementById("rot-id").value = "";
    document.getElementById("form-roteiro").reset();
    document.getElementById("modal-roteiro").classList.add("active");
  } else if (currentTab === 'orcamento') {
    document.getElementById("orc-id").value = "";
    document.getElementById("form-orcamento").reset();
    document.getElementById("modal-orcamento").classList.add("active");
  } else if (currentTab === 'gastos') {
    document.getElementById("gas-id").value = "";
    document.getElementById("form-gastos").reset();
    document.getElementById("gas-data").value = new Date().toISOString().split('T')[0];
    document.getElementById("modal-gastos").classList.add("active");
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

function renderDaysCarousel() {
  const container = document.getElementById("days-carousel-container");
  if(!container) return;
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
  if(!cityBar) return;
  let validCities = [...new Set(roteiroData.map(i => i.cidade ? i.cidade.toUpperCase() : "").filter(Boolean))];
  
  if (currentSelectedDay) {
    validCities = [...new Set(roteiroData.filter(i => i.dia === currentSelectedDay).map(i => i.cidade ? i.cidade.toUpperCase() : ""))];
  }
  if (currentFilter !== "TODAS" && !validCities.includes(currentFilter)) currentFilter = "TODAS";

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
  await loadAllData(false);
}

function openMaps(link, atracao, endereco) {
  if (link && link.trim().startsWith("http")) {
    window.open(link.trim(), '_blank');
  } else if (atracao) {
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
  document.getElementById("rot-hora").value = item.hora || "";
  document.getElementById("rot-funcionamento").value = item.funcionamento || item.horario || "";
  document.getElementById("rot-regiao").value = item.regiao || "";
  document.getElementById("rot-endereco").value = item.endereco || "";
  document.getElementById("rot-custo").value = item.custo || "";
  document.getElementById("rot-link").value = item.link || "";
  document.getElementById("rot-obs").value = item.obs || "";
  document.getElementById("modal-roteiro").classList.add("active");
}

function renderTimeline() {
  const container = document.getElementById("timeline-container");
  if(!container) return;
  container.innerHTML = "";

  let filtered = roteiroData.filter(i => i.dia === currentSelectedDay);
  if (currentFilter !== "TODAS") filtered = filtered.filter(i => i.cidade === currentFilter);
  if (showDone === "PENDING") filtered = filtered.filter(i => !i.feito);
  
  filtered.sort((a,b) => (a.ordem || 99) - (b.ordem || 99));

  filtered.forEach(item => {
    let catDisplay = item.categoria === "MARCO" ? "DESTAQUE" : item.categoria;
    let funcVal = item.funcionamento || item.horario || "";

    if (catDisplay === "ESTAÇÃO" || catDisplay === "TREM" || catDisplay === "AEROPORTO") {
      let iconClass = catDisplay === "AEROPORTO" ? "fa-plane-departure" : "fa-train";
      container.innerHTML += `
        <div class="train-strip" data-id="${item.id}">
          <div class="train-info">
            <span class="train-title"><i class="fa-solid ${iconClass}"></i> ${item.atracao}</span>
            <div class="train-route"><i class="fa-regular fa-clock"></i> ${item.hora || funcVal || 'Horário a definir'} ${item.regiao ? '• ' + item.regiao : ''}</div>
          </div>
          <div class="action-group" style="display:flex; gap:4px;">
            <button class="btn-act" onclick="editRoteiro(${item.id})"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-act del-btn" onclick="deleteItem(${item.id}, 'roteiro')"><i class="fa-solid fa-trash"></i></button>
            <button class="btn-act drag-handle"><i class="fa-solid fa-grip-vertical"></i></button>
          </div>
        </div>`;
      return;
    }

    let catBg = "var(--cat-default)";
    if(catDisplay === "MUSEU") catBg = "var(--cat-museu)";
    if(catDisplay === "HOTEL") catBg = "var(--cat-hotel)";
    if(catDisplay === "RESTAURANTE") catBg = "var(--cat-restaurante)";
    if(catDisplay === "DESTAQUE") catBg = "var(--cat-marco)";

    const isFeito = item.feito ? 'feito' : '';
    const btnFeitoClass = item.feito ? 'active' : '';
    const hasMapsLink = item.link && item.link.trim().startsWith("http");
    const horaStr = item.hora ? item.hora.trim() : "--:--";

    container.innerHTML += `
      <div class="card ${isFeito}" data-id="${item.id}">
        <div class="card-agenda-layout">
          <div class="card-time-col">
            <span class="card-time-text">${horaStr}</span>
          </div>
          <div class="card-body-col">
            <div class="card-top">
              <span class="badge-cat" style="background: ${catBg}">${catDisplay}</span>
              <span class="card-cost" style="color: ${catBg};">${item.custo ? '€ ' + parseFloat(item.custo).toFixed(2) : ''}</span>
            </div>
            <div class="card-title">${item.atracao}</div>
            ${funcVal ? `<div class="card-address"><i class="fa-regular fa-clock"></i> Funcionamento: ${funcVal}</div>` : ''}
            ${item.endereco || item.regiao ? `<div class="card-address"><i class="fa-solid fa-location-dot"></i> ${item.endereco || ''} ${item.regiao ? '• '+item.regiao : ''}</div>` : ''}
            ${item.obs ? `<div class="card-obs"><i class="fa-solid fa-circle-exclamation"></i> ${item.obs}</div>` : ''}
            
            <div class="card-actions">
              <div class="action-group">
                 <button class="btn-act done-btn ${btnFeitoClass}" onclick="toggleDone(${item.id})" title="Check"><i class="fa-solid fa-check"></i></button>
                 ${hasMapsLink ? `<button class="btn-act" onclick="openMaps('${item.link.trim()}')" title="Google Maps"><i class="fa-solid fa-map-location-dot"></i></button>` : ''}
                 <button class="btn-act" onclick="editRoteiro(${item.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                 <button class="btn-act del-btn" onclick="deleteItem(${item.id}, 'roteiro')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                 <button class="btn-act drag-handle" title="Reordenar"><i class="fa-solid fa-grip-vertical"></i></button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  });

  new Sortable(container, {
    handle: '.drag-handle',
    animation: 150,
    delay: 150,
    delayOnTouchOnly: true,
    forceFallback: true,
    fallbackTolerance: 3,
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
  if(e) e.preventDefault();
  const elId = document.getElementById("rot-id");
  const idStr = elId ? elId.value : "";
  let catVal = document.getElementById("rot-categoria").value;
  
  const payload = {
    dia: document.getElementById("rot-dia").value, 
    cidade: document.getElementById("rot-cidade").value,
    atracao: document.getElementById("rot-atracao").value, 
    categoria: catVal === "DESTAQUE" ? "MARCO" : catVal,
    hora: document.getElementById("rot-hora").value,
    funcionamento: document.getElementById("rot-funcionamento").value,
    regiao: document.getElementById("rot-regiao").value, 
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
  await loadAllData(false);
}

function updateEuro() {
  euroMedio = parseFloat(document.getElementById("euro-input").value) || 5.98;
  renderOrcamento(); renderGastos();
}

function renderOrcamento() {
  const container = document.getElementById("orcamento-list");
  if(!container) return;
  container.innerHTML = "";
  let projTot = 0;
  let catTotals = {};

  let totalGastosReais = 0;
  let gastosPorCat = {};

  gastosData.forEach(g => {
    let valEur = g.moeda === "BRL" ? (parseFloat(g.valor_brl) / euroMedio) : parseFloat(g.valor_eur);
    totalGastosReais += (valEur || 0);
    let catNorm = normalizeStr(g.categoria);
    if (!gastosPorCat[catNorm]) gastosPorCat[catNorm] = 0;
    gastosPorCat[catNorm] += (valEur || 0);
  });

  let efetivoOrcamentoPagos = 0;

  const orderMap = { "GASTO REAL": 1, "PAGO": 1, "A PAGAR": 2, "PROJETADO": 3 };

  let processedOrcamento = orcamentoData.map(item => {
    let projEur = parseFloat(item.projetado_eur) || 0;
    projTot += projEur;

    let catName = item.categoria.trim();
    let normCat = normalizeStr(catName);
    let normItem = normalizeStr(item.item);

    if (!catTotals[catName]) catTotals[catName] = { proj: 0, efet: 0 };
    catTotals[catName].proj += projEur;

    let gastoVinculado = gastosData.find(g => {
      let gItemNorm = normalizeStr(g.item);
      let gCatNorm = normalizeStr(g.categoria);
      return gItemNorm === normItem || normItem.includes(gItemNorm) || (gCatNorm === normCat && normItem.includes(normalizeStr(g.cidade)));
    });

    let displayValEur = projEur;
    let statusText = item.status;
    let statusColor = "var(--text-main)";

    if (gastoVinculado) {
      let valGastoEur = gastoVinculado.moeda === "BRL" ? (parseFloat(gastoVinculado.valor_brl) / euroMedio) : parseFloat(gastoVinculado.valor_eur);
      displayValEur = valGastoEur;
      statusText = "GASTO REAL";
      statusColor = "#059669";
      catTotals[catName].efet += valGastoEur;
    } else if (item.status === "PAGO") {
      statusColor = "#059669";
      efetivoOrcamentoPagos += projEur;
      catTotals[catName].efet += projEur;
    } else if (item.status === "A PAGAR") {
      statusColor = "#d97706";
    } else {
      statusColor = "#ea580c";
    }

    return { ...item, displayValEur, statusText, statusColor, sortWeight: orderMap[statusText] || 4, gastoVinculado };
  });

  processedOrcamento.sort((a, b) => a.sortWeight - b.sortWeight);

  processedOrcamento.forEach(item => {
    let displayValBrl = item.displayValEur * euroMedio;
    container.innerHTML += `
      <div class="list-item">
        <div class="list-item-left">
          <div style="font-weight:700;">${item.item}</div>
          <div class="list-item-sub">${item.categoria} • <span style="color:${item.statusColor}; font-weight:700;">${item.statusText}</span></div>
        </div>
        <div class="list-item-right" style="text-align:right;">
          <div style="font-weight:800; color:${item.statusColor}">€ ${item.displayValEur.toFixed(2)}</div>
          <div class="list-item-sub">R$ ${displayValBrl.toFixed(2)}</div>
          <div style="margin-top:4px; display:flex; gap:4px; justify-content:flex-end;">
            <button class="btn-act" onclick="editOrcamento(${item.id})" style="width:28px; height:28px; font-size:0.75rem;"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-act del-btn" onclick="deleteItem(${item.id}, 'orcamento')" style="width:28px; height:28px; font-size:0.75rem;"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>`;
  });

  for (const [catName, val] of Object.entries(catTotals)) {
    let catNorm = normalizeStr(catName);
    if (val.efet === 0 && gastosPorCat[catNorm]) val.efet = gastosPorCat[catNorm];
  }

  let efetTot = totalGastosReais + efetivoOrcamentoPagos;
  let aPagarEur = Math.max(0, projTot - efetTot);

  document.getElementById("metric-proj-eur").innerText = `€ ${projTot.toFixed(2)}`;
  document.getElementById("metric-proj-brl").innerText = `R$ ${(projTot * euroMedio).toFixed(2)}`;
  document.getElementById("metric-efet-eur").innerText = `€ ${efetTot.toFixed(2)}`;
  document.getElementById("metric-efet-brl").innerText = `R$ ${(efetTot * euroMedio).toFixed(2)}`;
  document.getElementById("metric-dif-eur").innerText  = `€ ${aPagarEur.toFixed(2)}`;
  document.getElementById("metric-dif-brl").innerText  = `R$ ${(aPagarEur * euroMedio).toFixed(2)}`;

  renderSubtotaisOrcamento(catTotals);
}

function renderSubtotaisOrcamento(catTotals) {
  let subContainer = document.getElementById("orcamento-subtotais-container");
  if (!subContainer) return;

  let html = `
    <div class="sec-subtotals-box">
      <div class="sec-subtotals-title">RESUMO POR CATEGORIA</div>
      <div class="subgrid">`;

  for (const [cat, vals] of Object.entries(catTotals)) {
    let efetBrl = vals.efet * euroMedio;
    html += `
      <div class="subtile">
        <span>${cat}</span>
        <strong>€ ${vals.efet.toFixed(2)}</strong>
        <small>R$ ${efetBrl.toFixed(2)}</small>
      </div>`;
  }
  html += `</div></div>`;
  subContainer.innerHTML = html;
}

function editOrcamento(id) {
  const item = orcamentoData.find(i => i.id === id);
  if(!item) return;
  document.getElementById("orc-id").value = item.id;
  document.getElementById("orc-cat").value = item.categoria.trim();
  document.getElementById("orc-item").value = item.item.trim();
  document.getElementById("orc-status").value = item.status;
  document.getElementById("orc-moeda").value = item.moeda || "EUR";
  
  let valDisplay = item.moeda === "BRL" ? (item.projetado_eur * euroMedio) : item.projetado_eur;
  document.getElementById("orc-proj").value = parseFloat(valDisplay).toFixed(2);
  document.getElementById("modal-orcamento").classList.add("active");
}

async function handleOrcamentoSubmit(e) {
  if(e) e.preventDefault();
  const idStr = document.getElementById("orc-id").value;
  const moeda = document.getElementById("orc-moeda").value;
  const valRaw = parseFloat(document.getElementById("orc-proj").value) || 0;
  const projEurVal = moeda === "BRL" ? (valRaw / euroMedio) : valRaw;

  const payload = {
    categoria: document.getElementById("orc-cat").value.trim(), 
    item: document.getElementById("orc-item").value.trim(),
    status: document.getElementById("orc-status").value, 
    moeda: moeda,
    projetado_eur: projEurVal
  };

  if(idStr) await _supabase.from('orcamento').update(payload).eq('id', parseInt(idStr));
  else await _supabase.from('orcamento').insert([payload]);

  closeModal('modal-orcamento'); 
  await loadAllData(false);
}

function formatGastoDateLabel(dateStr) {
  if (!dateStr) return "--";
  let cleanDate = dateStr.toString().trim().split("T")[0];
  const parts = cleanDate.split("-");
  if (parts.length < 3) return dateStr;
  const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const diasSemana = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const dayOfWeekStr = diasSemana[dateObj.getDay()];
  const formattedDay = `${parts[2]}/${parts[1]}`;
  return `${formattedDay} ${dayOfWeekStr}`;
}

function renderGastos() {
  const container = document.getElementById("gastos-list");
  const subContainer = document.getElementById("gastos-subtotais-container");
  if(!container) return;
  container.innerHTML = "";
  let catGastos = {};

  gastosData.forEach(item => {
    let eur = item.moeda === "BRL" ? (parseFloat(item.valor_brl) / euroMedio) : parseFloat(item.valor_eur);
    let brl = item.moeda === "EUR" ? (parseFloat(item.valor_eur) * euroMedio) : parseFloat(item.valor_brl);
    
    let catName = item.categoria.trim();
    if(!catGastos[catName]) catGastos[catName] = 0;
    catGastos[catName] += eur;

    let dateDisplay = formatGastoDateLabel(item.data);

    container.innerHTML += `
      <div class="list-item">
        <div class="list-item-left">
          <span class="list-item-title" style="font-weight:700;">${item.item}</span>
          <div class="list-item-sub">${dateDisplay} • ${item.categoria} (${item.cidade || ''})</div>
        </div>
        <div class="list-item-right" style="text-align:right;">
          <div class="list-item-val" style="font-weight:800;">€ ${eur.toFixed(2)}</div>
          <div class="list-item-brl" style="font-size:0.75rem; color:var(--text-muted);">R$ ${brl.toFixed(2)}</div>
          <div style="margin-top:4px; display:flex; gap:4px; justify-content:flex-end;">
            <button class="btn-act" onclick="editGasto(${item.id})" style="width:28px; height:28px; font-size:0.75rem;"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-act del-btn" onclick="deleteItem(${item.id}, 'gastos')" style="width:28px; height:28px; font-size:0.75rem;"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>`;
  });

  if (subContainer) {
    let html = `
      <div class="sec-subtotals-box">
        <div class="sec-subtotals-title">GASTOS POR CATEGORIA</div>
        <div class="subgrid">`;
    for (const [cat, valEur] of Object.entries(catGastos)) {
      let valBrl = valEur * euroMedio;
      html += `
        <div class="subtile">
          <span>${cat}</span>
          <strong>€ ${valEur.toFixed(2)}</strong>
          <small>R$ ${valBrl.toFixed(2)}</small>
        </div>`;
    }
    html += `</div></div>`;
    subContainer.innerHTML = html;
  }
}

function editGasto(id) {
  const item = gastosData.find(i => i.id === id);
  if(!item) return;
  document.getElementById("gas-id").value = item.id;
  
  let rawDate = "";
  if (item.data) {
    let clean = item.data.toString().trim().split("T")[0];
    rawDate = clean;
  }
  document.getElementById("gas-data").value = rawDate;
  document.getElementById("gas-cidade").value = item.cidade || "GERAL";
  document.getElementById("gas-cat").value = item.categoria.trim();
  document.getElementById("gas-item").value = item.item.trim();
  document.getElementById("gas-moeda").value = item.moeda || "EUR";
  
  let valGasto = item.moeda === "EUR" ? item.valor_eur : item.valor_brl;
  document.getElementById("gas-valor").value = parseFloat(valGasto).toFixed(2);
  document.getElementById("modal-gastos").classList.add("active");
}

async function handleGastosSubmit(e) {
  if(e) e.preventDefault();
  const idStr = document.getElementById("gas-id").value;
  const moeda = document.getElementById("gas-moeda").value;
  const valor = parseFloat(document.getElementById("gas-valor").value) || 0;
  
  const payload = {
    data: document.getElementById("gas-data").value, 
    cidade: document.getElementById("gas-cidade").value,
    categoria: document.getElementById("gas-cat").value.trim(), 
    item: document.getElementById("gas-item").value.trim(),
    moeda: moeda, 
    valor_eur: moeda === "EUR" ? valor : (valor / euroMedio), 
    valor_brl: moeda === "BRL" ? valor : (valor * euroMedio)
  };

  if(idStr) await _supabase.from('gastos').update(payload).eq('id', parseInt(idStr));
  else await _supabase.from('gastos').insert([payload]);

  closeModal('modal-gastos'); 
  await loadAllData(false);
}

function exportToXLSX() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(roteiroData), "ROTEIRO");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orcamentoData), "ORÇAMENTO");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gastosData), "GASTOS");
  XLSX.writeFile(wb, "Europa_2027_Roteiro.xlsx");
}

window.openContextModal = openContextModal;
window.closeModal = closeModal;
window.switchTab = switchTab;
window.handleRoteiroSubmit = handleRoteiroSubmit;
window.handleOrcamentoSubmit = handleOrcamentoSubmit;
window.handleGastosSubmit = handleGastosSubmit;
window.handleLogin = handleLogin;
window.logout = logout;
window.editRoteiro = editRoteiro;
window.editOrcamento = editOrcamento;
window.editGasto = editGasto;
window.deleteItem = deleteItem;
window.toggleDone = toggleDone;
window.openMaps = openMaps;
window.updateEuro = updateEuro;
window.filterCity = filterCity;
window.setDoneFilter = setDoneFilter;
window.exportToXLSX = exportToXLSX;
window.formatTimeMask = formatTimeMask;