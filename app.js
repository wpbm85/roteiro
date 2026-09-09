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
let sortableInstance = null;

const DIAS_TRADUCAO = {
  'MON': 'SEG', 'TUE': 'TER', 'WED': 'QUA', 'THU': 'QUI', 'FRI': 'SEX', 'SAT': 'SÁB', 'SUN': 'DOM'
};

const CIDADES_FIXAS = ["GERAL", "AMSTERDAM", "BRUXELAS", "GENT", "BRUGES", "PARIS", "ROTERDAM", "DELFT", "HAIA"];
const CATEGORIAS_ROTEIRO = ["AEROPORTO", "DESTAQUE", "ESTAÇÃO", "HOTEL", "LOJA", "MUSEU", "PARQUE", "RESTAURANTE", "OUTRO"];
const CATEGORIAS_FINANCEIRO = ["VOO", "TREM", "HOTEL", "ALIMENTAÇÃO", "INGRESSOS", "TRANSPORTE", "COMPRAS", "MERCADO", "OUTROS"];

// Usado só pra mostrar uma referência informativa (não soma automático no orçamento).
const MAPA_CATEGORIA_ROTEIRO_FINANCEIRO = {
  'MUSEU': 'INGRESSOS',
  'PARQUE': 'INGRESSOS',
  'DESTAQUE': 'OUTROS',
  'MARCO': 'OUTROS', // valor legado de categoria, tratado como DESTAQUE
  'RESTAURANTE': 'ALIMENTAÇÃO',
  'LOJA': 'COMPRAS',
  'HOTEL': 'HOTEL',
  'AEROPORTO': 'TRANSPORTE',
  'ESTAÇÃO': 'TRANSPORTE',
  'OUTRO': 'OUTROS'
};

let currentOrcCityFilter = "TODAS";
let currentGasCatFilter = "TODAS";

function normalizeStr(str) {
  if (!str) return "";
  return str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Mostra um alerta amigável quando uma operação no Supabase falha.
// Retorna true se HOUVE erro (para o código chamador poder abortar o fluxo).
function checkError(error, contexto) {
  if (error) {
    console.error(`[Supabase] Erro ao ${contexto}:`, error);
    alert(`Não foi possível ${contexto}.\n\nDetalhe: ${error.message || 'erro desconhecido'}`);
    return true;
  }
  return false;
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
  const { data: rot, error: errRot } = await _supabase.from('roteiro').select('*').order('ordem', { ascending: true });
  const { data: orc, error: errOrc } = await _supabase.from('orcamento').select('*');
  const { data: gas, error: errGas } = await _supabase.from('gastos').select('*');

  const houveErro = checkError(errRot, 'carregar o roteiro')
    || checkError(errOrc, 'carregar o orçamento')
    || checkError(errGas, 'carregar os gastos');
  if (houveErro) {
    // Mesmo com erro, seguimos com o que veio (arrays vazios) para não travar a tela.
  }

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

  const rotCity = document.getElementById("rot-cidade");
  const gasCity = document.getElementById("gas-cidade");
  const orcCity = document.getElementById("orc-cidade");
  if(rotCity) rotCity.innerHTML = CIDADES_FIXAS.map(c => `<option value="${c}">${c}</option>`).join("");
  if(gasCity) gasCity.innerHTML = CIDADES_FIXAS.map(c => `<option value="${c}">${c}</option>`).join("");
  if(orcCity) orcCity.innerHTML = CIDADES_FIXAS.map(c => `<option value="${c}">${c}</option>`).join("");

  const rotCat = document.getElementById("rot-categoria");
  if(rotCat) rotCat.innerHTML = CATEGORIAS_ROTEIRO.map(c => `<option value="${c}">${c}</option>`).join("");

  const gasCat = document.getElementById("gas-cat");
  const orcCat = document.getElementById("orc-cat");
  if(gasCat) gasCat.innerHTML = CATEGORIAS_FINANCEIRO.map(c => `<option value="${c}">${c}</option>`).join("");
  if(orcCat) orcCat.innerHTML = CATEGORIAS_FINANCEIRO.map(c => `<option value="${c}">${c}</option>`).join("");

  refreshVinculoOptions();
}

// Filtra o dropdown "Vincular a item do orçamento" pela Categoria e Cidade
// já escolhidas no próprio formulário de gasto — assim a lista nunca mostra
// os 40+ itens de uma vez, só os candidatos que fazem sentido.
function refreshVinculoOptions() {
  const gasOrc = document.getElementById("gas-orcamento");
  const gasCat = document.getElementById("gas-cat");
  const gasCidade = document.getElementById("gas-cidade");
  if (!gasOrc || !gasCat || !gasCidade) return;

  const valorAnterior = gasOrc.value;
  const catAtual = normalizeStr(gasCat.value);
  const cidadeAtual = normalizeStr(gasCidade.value);

  const candidatos = orcamentoData.filter(o => {
    const catMatch = normalizeStr(o.categoria) === catAtual;
    const cidadeOrc = normalizeStr(o.cidade);
    const cidMatch = !cidadeOrc || cidadeOrc === cidadeAtual || cidadeOrc === 'geral';
    return catMatch && cidMatch;
  });

  let opts = `<option value="">Nenhum (gasto avulso)</option>`;
  candidatos.forEach(o => {
    const desc = (o.item || '').trim();
    opts += `<option value="${o.id}">${desc}${o.cidade ? ' (' + o.cidade + ')' : ''}</option>`;
  });
  gasOrc.innerHTML = opts;

  // Mantém a seleção anterior se ela ainda estiver entre os candidatos filtrados.
  if ([...gasOrc.options].some(op => op.value === valorAnterior)) {
    gasOrc.value = valorAnterior;
  }
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
    ["orc-status", "orc-moeda", "orc-proj"].forEach(fieldId => {
      document.getElementById(fieldId).disabled = false;
    });
    const aviso = document.getElementById("orc-linked-aviso");
    if (aviso) aviso.style.display = "none";
    document.getElementById("modal-orcamento").classList.add("active");
  } else if (currentTab === 'gastos') {
    document.getElementById("gas-id").value = "";
    document.getElementById("form-gastos").reset();
    document.getElementById("gas-data").value = new Date().toISOString().split('T')[0];
    refreshVinculoOptions();
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
    const novoValor = !item.feito;
    item.feito = novoValor;
    renderTimeline(); // feedback visual imediato

    const { error } = await _supabase.from('roteiro').update({ feito: novoValor }).eq('id', id);
    if (checkError(error, 'salvar o check deste item')) {
      item.feito = !novoValor; // reverte se a gravação falhou
      renderTimeline();
    }
  }
}

async function deleteItem(id, type) {
  if (type === 'orcamento' && isOrcamentoLinked(id)) {
    alert("Este item já tem um gasto real vinculado.\n\nExclua o gasto correspondente na aba Gastos primeiro — isso desvincula automaticamente e o item de orçamento volta a ficar editável.");
    return;
  }
  if(!confirm("Tem certeza que deseja excluir?")) return;
  const { error } = await _supabase.from(type).delete().eq('id', id);
  if (checkError(error, 'excluir este item')) return;
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

if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }

  sortableInstance = new Sortable(container, {
    handle: '.drag-handle',
    animation: 150,
    delay: 100,
    delayOnTouchOnly: true,
    touchStartThreshold: 5,
    onEnd: async function () {
      const cards = container.children;
      let houveErro = false;
      for (let index = 0; index < cards.length; index++) {
        const id = parseInt(cards[index].getAttribute('data-id'));
        const target = roteiroData.find(r => r.id === id);
        if (target) {
          target.ordem = index + 1;
          const { error } = await _supabase.from('roteiro').update({ ordem: index + 1 }).eq('id', id);
          if (error) houveErro = true;
        }
      }
      if (houveErro) {
        checkError({ message: 'uma ou mais posições podem não ter sido salvas' }, 'salvar a nova ordem');
        await loadAllData(false); // ressincroniza com o banco em caso de falha parcial
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

  let error;
  if(idStr) {
    ({ error } = await _supabase.from('roteiro').update(payload).eq('id', parseInt(idStr)));
  } else {
    payload.ordem = 99;
    payload.feito = false;
    ({ error } = await _supabase.from('roteiro').insert([payload]));
  }

  if (checkError(error, 'salvar esta atração')) return; // mantém o modal aberto com os dados preenchidos

  closeModal('modal-roteiro'); 
  await loadAllData(false);
}

function updateEuro(origemId) {
  const idUsado = origemId || "euro-input";
  euroMedio = parseFloat(document.getElementById(idUsado).value) || 5.98;

  // Mesmo valor nas duas abas — sincroniza o campo que não foi editado agora.
  const idOutro = idUsado === "euro-input" ? "euro-input-gastos" : "euro-input";
  const outroEl = document.getElementById(idOutro);
  if (outroEl) outroEl.value = euroMedio;

  renderOrcamento(); renderGastos();
}

function renderOrcamento() {
  const container = document.getElementById("orcamento-list");
  if(!container) return;
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

  const orderMap = { "PAGO": 1, "A PAGAR": 2, "PROJETADO": 3 };

  let processedOrcamento = orcamentoData.map(item => {
    let projEur = parseFloat(item.projetado_eur) || 0;
    projTot += projEur;

    let catName = (item.categoria || 'SEM CATEGORIA').trim();
    let cidadeName = (item.cidade || 'GERAL').trim().toUpperCase();

    if (!catTotals[catName]) catTotals[catName] = { proj: 0, efet: 0 };
    catTotals[catName].proj += projEur;

    // Vínculo real (FK), não mais por comparação de texto.
    // Pode haver mais de um gasto vinculado ao mesmo item (ex.: hotel pago em 2 parcelas).
    let gastosVinculados = gastosData.filter(g => g.orcamento_id === item.id);
    let isLinked = gastosVinculados.length > 0;
    let cidadesGastosVinculados = [...new Set(gastosVinculados.map(g => (g.cidade || '').trim().toUpperCase()).filter(Boolean))];

    let displayValEur = projEur;
    let statusText = item.status;
    let statusColor = "var(--text-main)";

    if (isLinked) {
      let somaVinculada = gastosVinculados.reduce((acc, g) => {
        let v = g.moeda === "BRL" ? (parseFloat(g.valor_brl) / euroMedio) : parseFloat(g.valor_eur);
        return acc + (v || 0);
      }, 0);
      displayValEur = somaVinculada;
      statusText = "PAGO";
      statusColor = "#059669";
      catTotals[catName].efet += somaVinculada;
    } else if (item.status === "PAGO") {
      // Legado: status "PAGO" definido manualmente antes desta mudança, sem gasto real vinculado ainda.
      statusColor = "#059669";
      efetivoOrcamentoPagos += projEur;
      catTotals[catName].efet += projEur;
    } else if (item.status === "A PAGAR") {
      statusColor = "#d97706";
    } else {
      statusColor = "#ea580c";
    }

    return { ...item, catName, cidadeName, displayValEur, statusText, statusColor, sortWeight: orderMap[statusText] || 4, isLinked, cidadesGastosVinculados };
  });

  processedOrcamento.sort((a, b) => a.sortWeight - b.sortWeight);

  // ---- Lista visual: filtrada por cidade (chips) e agrupada por Categoria > Cidade ----
  const listaFiltrada = currentOrcCityFilter === "TODAS"
    ? processedOrcamento
    : processedOrcamento.filter(i => i.cidadeName === currentOrcCityFilter);

  const totalCidadeContainer = document.getElementById("orc-city-total");
  if (totalCidadeContainer) {
    if (currentOrcCityFilter === "TODAS") {
      totalCidadeContainer.innerHTML = "";
    } else {
      const cidadeProj = listaFiltrada.reduce((acc, i) => acc + (parseFloat(i.projetado_eur) || 0), 0);
      const cidadeEfet = listaFiltrada.filter(i => i.statusText === 'PAGO').reduce((acc, i) => acc + i.displayValEur, 0);
      const nomeCidade = currentOrcCityFilter.charAt(0) + currentOrcCityFilter.slice(1).toLowerCase();
      totalCidadeContainer.innerHTML = `
        <div class="city-total-box">
          <span>Total em ${nomeCidade}</span>
          <span><strong style="color:#059669;">€ ${cidadeEfet.toFixed(2)}</strong> <small style="color:var(--text-muted);">/ € ${cidadeProj.toFixed(2)}</small></span>
        </div>`;
    }
  }

  const ordenarPorListaFixa = (lista) => (a, b) => {
    const ia = lista.indexOf(a), ib = lista.indexOf(b);
    const pa = ia === -1 ? 999 : ia, pb = ib === -1 ? 999 : ib;
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b);
  };

  let porCategoria = {};
  listaFiltrada.forEach(item => {
    if (!porCategoria[item.catName]) porCategoria[item.catName] = [];
    porCategoria[item.catName].push(item);
  });

  const nomesCategoria = Object.keys(porCategoria).sort((a, b) => a.localeCompare(b));

  let listHtml = '';
  nomesCategoria.forEach(cat => {
    const itensCategoria = porCategoria[cat];
    const subProj = itensCategoria.reduce((acc, i) => acc + (parseFloat(i.projetado_eur) || 0), 0);
    const subEfet = itensCategoria.filter(i => i.statusText === 'PAGO').reduce((acc, i) => acc + i.displayValEur, 0);

    // Ordem: status (pago/projetado/a pagar) primeiro; dentro do mesmo status, pela ordem das cidades no roteiro.
    const itensOrdenados = [...itensCategoria].sort((a, b) => {
      if (a.sortWeight !== b.sortWeight) return a.sortWeight - b.sortWeight;
      const ia = CIDADES_FIXAS.indexOf(a.cidadeName), ib = CIDADES_FIXAS.indexOf(b.cidadeName);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    let bodyHtml = itensOrdenados.map(item => renderOrcamentoItemHtml(item)).join('');

    // Referência do Roteiro: uma dica por cidade presente nesta categoria (a cidade já vai no texto).
    const cidadesPresentes = [...new Set(itensCategoria.map(i => i.cidadeName))].sort(ordenarPorListaFixa(CIDADES_FIXAS));
    cidadesPresentes.forEach(cid => {
      const ref = getReferenciaRoteiro(cat, cid);
      if (ref.total > 0) {
        bodyHtml += `
          <div class="roteiro-ref-hint">
            <i class="fa-solid fa-map-location-dot"></i>
            <span>Já no roteiro em ${cid.charAt(0) + cid.slice(1).toLowerCase()} (${ref.nomes}): <strong>€ ${ref.total.toFixed(2)}</strong> · ${ref.count} ${ref.count === 1 ? 'item' : 'itens'} · não somado automaticamente</span>
          </div>`;
      }
    });

    listHtml += `
      <details class="cat-group">
        <summary class="cat-group-header">
          <span class="cat-group-name">${cat}</span>
          <span class="cat-group-totals">
            <strong style="color:#059669;">€ ${subEfet.toFixed(2)}</strong>
            <small style="color:var(--text-muted);"> / € ${subProj.toFixed(2)}</small>
          </span>
        </summary>
        <div class="cat-group-body">${bodyHtml}</div>
      </details>`;
  });

  container.innerHTML = listHtml || `<div style="text-align:center; color:var(--text-muted); padding:24px 0;">Nenhum item de orçamento para esta cidade.</div>`;

  // ---- Métricas e resumo por categoria: sempre considerando TODOS os itens (não filtrados) ----
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
  renderOrcamentoCityChips();
}

// Soma os custos já lançados no Roteiro para uma combinação Categoria(financeira)+Cidade.
// É só uma referência informativa — nunca entra na soma de Projetado/Efetivado.
function getReferenciaRoteiro(categoriaFinanceira, cidade) {
  let total = 0;
  let nomes = [];
  roteiroData.forEach(r => {
    const custo = parseFloat(r.custo) || 0;
    if (custo <= 0) return;
    const catRoteiro = r.categoria === 'MARCO' ? 'DESTAQUE' : r.categoria;
    const catMapeada = MAPA_CATEGORIA_ROTEIRO_FINANCEIRO[catRoteiro];
    if (catMapeada !== categoriaFinanceira) return;
    const cidadeRoteiro = (r.cidade || '').trim().toUpperCase();
    if (cidadeRoteiro !== cidade) return;
    total += custo;
    nomes.push(r.atracao);
  });
  const nomesResumo = nomes.length > 2 ? `${nomes.slice(0, 2).join(', ')} +${nomes.length - 2}` : nomes.join(', ');
  return { total, count: nomes.length, nomes: nomesResumo };
}

function renderOrcamentoItemHtml(item) {
  let displayValBrl = item.displayValEur * euroMedio;
  const excluirOuCadeado = item.isLinked
    ? `<span title="Vinculado a um gasto real — exclua o gasto na aba Gastos pra desvincular" style="color:var(--text-muted); font-size:0.75rem; padding:4px 6px;"><i class="fa-solid fa-lock"></i></span>`
    : `<button class="btn-act del-btn" onclick="deleteItem(${item.id}, 'orcamento')" style="width:28px; height:28px; font-size:0.75rem;"><i class="fa-solid fa-trash"></i></button>`;
  const acoes = `<button class="btn-act" onclick="editOrcamento(${item.id})" style="width:28px; height:28px; font-size:0.75rem;"><i class="fa-solid fa-pen"></i></button>
    ${excluirOuCadeado}`;

  const cidadeLabel = item.cidadeName.charAt(0) + item.cidadeName.slice(1).toLowerCase();

  // GERAL mas o(s) gasto(s) vinculado(s) são de uma cidade específica: provável cidade desatualizada.
  const divergeCidade = item.cidadeName === 'GERAL' && item.cidadesGastosVinculados.length > 0 && !item.cidadesGastosVinculados.includes('GERAL');
  const avisoCidade = divergeCidade
    ? `<div style="margin-top:3px; font-size:0.7rem; color:#d97706;" title="Ajuste a Cidade deste item de orçamento"><i class="fa-solid fa-triangle-exclamation"></i> gasto real é de ${item.cidadesGastosVinculados.join('/')} </div>`
    : '';

  return `
    <div class="list-item">
      <div class="list-item-left">
        <div style="font-weight:700;">${item.item}</div>
        <div class="list-item-sub"><span style="color:var(--text-muted);">${cidadeLabel}</span> • <span style="color:${item.statusColor}; font-weight:700;">${item.statusText}</span></div>
        ${avisoCidade}
      </div>
      <div class="list-item-right" style="text-align:right;">
        <div style="font-weight:800; color:${item.statusColor}">€ ${item.displayValEur.toFixed(2)}</div>
        <div class="list-item-sub">R$ ${displayValBrl.toFixed(2)}</div>
        <div style="margin-top:4px; display:flex; gap:4px; justify-content:flex-end; align-items:center;">
          ${acoes}
        </div>
      </div>
    </div>`;
}

function renderOrcamentoCityChips() {
  const bar = document.getElementById("orc-city-bar");
  if (!bar) return;
  const cidadesPresentes = [...new Set(orcamentoData.map(o => (o.cidade || 'GERAL').trim().toUpperCase()).filter(Boolean))];
  cidadesPresentes.sort((a, b) => {
    const ia = CIDADES_FIXAS.indexOf(a), ib = CIDADES_FIXAS.indexOf(b);
    const pa = ia === -1 ? 999 : ia, pb = ib === -1 ? 999 : ib;
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b);
  });
  bar.innerHTML = `<button class="chip ${currentOrcCityFilter === 'TODAS' ? 'active' : ''}" onclick="filterOrcamentoCity('TODAS')">Todas</button>`;
  cidadesPresentes.forEach(c => {
    bar.innerHTML += `<button class="chip ${c === currentOrcCityFilter ? 'active' : ''}" onclick="filterOrcamentoCity('${c}')">${c.charAt(0) + c.slice(1).toLowerCase()}</button>`;
  });
}

function filterOrcamentoCity(city) {
  currentOrcCityFilter = city;
  renderOrcamento();
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

function isOrcamentoLinked(id) {
  return gastosData.some(g => g.orcamento_id === id);
}

function editOrcamento(id) {
  const item = orcamentoData.find(i => i.id === id);
  if(!item) return;
  const linked = isOrcamentoLinked(id);

  document.getElementById("orc-id").value = item.id;
  document.getElementById("orc-cat").value = (item.categoria || '').trim();
  document.getElementById("orc-cidade").value = item.cidade || "GERAL";
  document.getElementById("orc-item").value = (item.item || '').trim();
  document.getElementById("orc-status").value = item.status === "PAGO" ? "A PAGAR" : item.status;
  document.getElementById("orc-moeda").value = item.moeda || "EUR";

  let valDisplay = item.moeda === "BRL" ? (item.projetado_eur * euroMedio) : item.projetado_eur;
  document.getElementById("orc-proj").value = parseFloat(valDisplay).toFixed(2);

  // Categoria/Cidade/Item continuam editáveis mesmo com gasto vinculado (são só organização).
  // Status/Moeda/Valor ficam travados porque, uma vez vinculado, quem manda no valor é o gasto real.
  ["orc-status", "orc-moeda", "orc-proj"].forEach(fieldId => {
    document.getElementById(fieldId).disabled = linked;
  });
  const aviso = document.getElementById("orc-linked-aviso");
  if (aviso) aviso.style.display = linked ? "block" : "none";

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
    cidade: document.getElementById("orc-cidade").value,
    item: document.getElementById("orc-item").value.trim(),
    status: document.getElementById("orc-status").value, 
    moeda: moeda,
    projetado_eur: projEurVal
  };

  let error;
  if(idStr) ({ error } = await _supabase.from('orcamento').update(payload).eq('id', parseInt(idStr)));
  else ({ error } = await _supabase.from('orcamento').insert([payload]));

  if (checkError(error, 'salvar este item de orçamento')) return;

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

  // Subtotais por categoria sempre consideram TODOS os gastos, independente do filtro da lista abaixo.
  let totalGeralEur = 0;
  gastosData.forEach(g => {
    let valEur = g.moeda === "BRL" ? (parseFloat(g.valor_brl) / euroMedio) : parseFloat(g.valor_eur);
    totalGeralEur += (valEur || 0);
    let catName = (g.categoria || 'SEM CATEGORIA').trim();
    if(!catGastos[catName]) catGastos[catName] = 0;
    catGastos[catName] += (valEur || 0);
  });

  const totalEurEl = document.getElementById("metric-gastos-total-eur");
  const totalBrlEl = document.getElementById("metric-gastos-total-brl");
  if (totalEurEl) totalEurEl.innerText = `€ ${totalGeralEur.toFixed(2)}`;
  if (totalBrlEl) totalBrlEl.innerText = `R$ ${(totalGeralEur * euroMedio).toFixed(2)}`;

  const gastosFiltrados = currentGasCatFilter === "TODAS"
    ? gastosData
    : gastosData.filter(g => (g.categoria || '').trim().toUpperCase() === currentGasCatFilter);

  const gastosOrdenados = [...gastosFiltrados].sort((a, b) => {
    if (!a.data) return 1;   // sem data vai pro fim
    if (!b.data) return -1;
    return new Date(a.data) - new Date(b.data);
  });

  gastosOrdenados.forEach(item => {
    let eur = item.moeda === "BRL" ? (parseFloat(item.valor_brl) / euroMedio) : parseFloat(item.valor_eur);
    let brl = item.moeda === "EUR" ? (parseFloat(item.valor_eur) * euroMedio) : parseFloat(item.valor_brl);

    let dateDisplay = formatGastoDateLabel(item.data);
    const vinculoTag = item.orcamento_id
      ? `<i class="fa-solid fa-link" title="Vinculado a um item do orçamento" style="color:#059669; margin-left:4px;"></i>`
      : '';

    container.innerHTML += `
      <div class="list-item">
        <div class="list-item-left">
          <span class="list-item-title" style="font-weight:700;">${item.item}${vinculoTag}</span>
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

  renderGastosCatChips();
}

function renderGastosCatChips() {
  const bar = document.getElementById("gas-cat-bar");
  if (!bar) return;
  const categoriasPresentes = [...new Set(gastosData.map(g => (g.categoria || '').trim().toUpperCase()).filter(Boolean))];
  categoriasPresentes.sort((a, b) => {
    const ia = CATEGORIAS_FINANCEIRO.indexOf(a), ib = CATEGORIAS_FINANCEIRO.indexOf(b);
    const pa = ia === -1 ? 999 : ia, pb = ib === -1 ? 999 : ib;
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b);
  });
  bar.innerHTML = `<button class="chip ${currentGasCatFilter === 'TODAS' ? 'active' : ''}" onclick="filterGastosCat('TODAS')">Todas</button>`;
  categoriasPresentes.forEach(c => {
    bar.innerHTML += `<button class="chip ${c === currentGasCatFilter ? 'active' : ''}" onclick="filterGastosCat('${c}')">${c.charAt(0) + c.slice(1).toLowerCase()}</button>`;
  });
}

function filterGastosCat(cat) {
  currentGasCatFilter = cat;
  renderGastos();
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
  document.getElementById("gas-cat").value = (item.categoria || '').trim();
  document.getElementById("gas-item").value = (item.item || '').trim();
  document.getElementById("gas-moeda").value = item.moeda || "EUR";
  refreshVinculoOptions();
  document.getElementById("gas-orcamento").value = item.orcamento_id || "";
  
  let valGasto = item.moeda === "EUR" ? item.valor_eur : item.valor_brl;
  document.getElementById("gas-valor").value = parseFloat(valGasto).toFixed(2);
  document.getElementById("modal-gastos").classList.add("active");
}

async function handleGastosSubmit(e) {
  if(e) e.preventDefault();
  const idStr = document.getElementById("gas-id").value;
  const moeda = document.getElementById("gas-moeda").value;
  const valor = parseFloat(document.getElementById("gas-valor").value) || 0;
  const orcVinculoStr = document.getElementById("gas-orcamento").value;
  
  const payload = {
    data: document.getElementById("gas-data").value, 
    cidade: document.getElementById("gas-cidade").value,
    categoria: document.getElementById("gas-cat").value.trim(), 
    item: document.getElementById("gas-item").value.trim(),
    moeda: moeda, 
    valor_eur: moeda === "EUR" ? valor : (valor / euroMedio), 
    valor_brl: moeda === "BRL" ? valor : (valor * euroMedio),
    orcamento_id: orcVinculoStr ? parseInt(orcVinculoStr) : null
  };

  let error;
  if(idStr) ({ error } = await _supabase.from('gastos').update(payload).eq('id', parseInt(idStr)));
  else ({ error } = await _supabase.from('gastos').insert([payload]));

  if (checkError(error, 'lançar este gasto')) return;

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

// ===================== IMPORTAR EXCEL =====================
// Só insere linhas cuja coluna "id" está vazia (ou seja, novas — nunca existiram no Supabase).
// Linhas com "id" preenchido são ignoradas (já vieram de uma exportação anterior).

const DIAS_SEMANA_PT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

const ALIASES_ROTEIRO = {
  id: ['id'],
  dia: ['dia', 'data dia', 'data / dia', 'data'],
  hora: ['hora'],
  cidade: ['cidade'],
  regiao: ['regiao', 'região'],
  ordem: ['ordem'],
  categoria: ['categoria'],
  atracao: ['atracao', 'atração', 'destaque'],
  funcionamento: ['funcionamento', 'horario', 'horário'],
  endereco: ['endereco', 'endereço'],
  custo: ['custo'],
  link: ['link'],
  obs: ['obs', 'observacoes', 'observações'],
  feito: ['feito']
};

const ALIASES_ORCAMENTO = {
  id: ['id'],
  categoria: ['categoria'],
  cidade: ['cidade'],
  item: ['item', 'item descricao', 'item / descrição', 'descricao', 'descrição'],
  status: ['status'],
  moeda: ['moeda'],
  projetado_eur: ['projetado_eur', 'projetado eur', 'projetado (eur)', 'projetado (€)', 'projetado']
};

const ALIASES_GASTOS = {
  id: ['id'],
  data: ['data', 'data do gasto'],
  cidade: ['cidade'],
  categoria: ['categoria'],
  item: ['item', 'descricao do item', 'descrição do item', 'descricao', 'descrição'],
  moeda: ['moeda'],
  valor_eur: ['valor_eur', 'valor eur', 'valor (eur)', 'valor (€)', 'valor'],
  valor_brl: ['valor_brl', 'valor brl', 'valor (r$)', 'valor (brl)']
};

function normalizeHeader(str) {
  return (str || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function linhaEstaVazia(valor) {
  return valor === null || valor === undefined || valor.toString().trim() === '';
}

function paraNumero(valor) {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string') {
    const limpo = valor.replace(/[^\d,.-]/g, '').replace(',', '.');
    const n = parseFloat(limpo);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function encontrarAba(workbook, candidatos) {
  const candNorm = candidatos.map(normalizeHeader);
  const match = workbook.SheetNames.find(n => candNorm.includes(normalizeHeader(n)));
  return match || null;
}

function resolverCampos(headers, aliasMap) {
  const headersNorm = headers.map(h => ({ original: h, norm: normalizeHeader(h) }));
  const resolved = {};
  for (const [campo, aliases] of Object.entries(aliasMap)) {
    const aliasesNorm = aliases.map(normalizeHeader);
    const match = headersNorm.find(h => aliasesNorm.includes(h.norm));
    resolved[campo] = match ? match.original : null;
  }
  return resolved;
}

function excelValorParaData(valor) {
  if (valor instanceof Date) return valor;
  if (typeof valor === 'string' && valor.trim()) {
    const s = valor.trim();
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  }
  return null;
}

function formatarDiaTexto(valor) {
  const d = excelValorParaData(valor);
  if (!d) return null;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm} ${DIAS_SEMANA_PT[d.getDay()]}`;
}

function formatarDataISO(valor) {
  const d = excelValorParaData(valor);
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatarHoraTexto(valor) {
  if (valor instanceof Date) {
    const hh = String(valor.getHours()).padStart(2, '0');
    const mm = String(valor.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  if (typeof valor === 'string') {
    const m = valor.trim().match(/^(\d{1,2}):(\d{2})/);
    if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  }
  if (typeof valor === 'number') {
    const totalMin = Math.round(valor * 24 * 60);
    const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const mm = String(totalMin % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return '';
}

function converterLinhaRoteiro(row, campos, avisos, numeroLinha) {
  const atracao = campos.atracao ? (row[campos.atracao] || '').toString().trim() : '';
  if (!atracao) return null;
  const dia = campos.dia ? formatarDiaTexto(row[campos.dia]) : null;
  if (!dia) { avisos.push(`Roteiro linha ${numeroLinha}: não entendi a data/dia, pulei essa linha.`); return null; }
  let categoria = campos.categoria ? (row[campos.categoria] || '').toString().trim().toUpperCase() : '';
  if (categoria && categoria !== 'MARCO' && !CATEGORIAS_ROTEIRO.includes(categoria)) {
    avisos.push(`Roteiro linha ${numeroLinha}: categoria "${categoria}" não reconhecida, mantida assim mesmo.`);
  }
  return {
    dia,
    hora: campos.hora ? formatarHoraTexto(row[campos.hora]) : '',
    cidade: ((campos.cidade ? row[campos.cidade] : '') || 'GERAL').toString().trim().toUpperCase(),
    regiao: campos.regiao ? (row[campos.regiao] || '').toString().trim() : '',
    ordem: campos.ordem ? (parseInt(row[campos.ordem]) || 99) : 99,
    categoria: categoria || 'OUTRO',
    atracao,
    funcionamento: campos.funcionamento ? (row[campos.funcionamento] || '').toString().trim() : '',
    endereco: campos.endereco ? (row[campos.endereco] || '').toString().trim() : '',
    custo: campos.custo ? paraNumero(row[campos.custo]) : 0,
    link: campos.link ? (row[campos.link] || '').toString().trim() : '',
    obs: campos.obs ? (row[campos.obs] || '').toString().trim() : '',
    feito: false
  };
}

function converterLinhaOrcamento(row, campos, avisos, numeroLinha) {
  const item = campos.item ? (row[campos.item] || '').toString().trim() : '';
  if (!item) return null;
  let categoria = campos.categoria ? (row[campos.categoria] || '').toString().trim().toUpperCase() : '';
  if (categoria && !CATEGORIAS_FINANCEIRO.includes(categoria)) {
    avisos.push(`Orçamento linha ${numeroLinha}: categoria "${categoria}" não reconhecida, mantida assim mesmo.`);
  }
  const cidade = ((campos.cidade ? row[campos.cidade] : '') || 'GERAL').toString().trim().toUpperCase();
  let status = campos.status ? (row[campos.status] || '').toString().trim().toUpperCase() : '';
  if (!['A PAGAR', 'PROJETADO', 'PAGO'].includes(status)) status = 'PROJETADO';
  const moedaRaw = campos.moeda ? (row[campos.moeda] || '').toString().trim().toUpperCase() : '';
  const moeda = moedaRaw === 'BRL' ? 'BRL' : 'EUR';
  const projetado_eur = campos.projetado_eur ? paraNumero(row[campos.projetado_eur]) : 0;
  return { categoria: categoria || 'OUTROS', cidade, item, status, moeda, projetado_eur };
}

function converterLinhaGastos(row, campos, avisos, numeroLinha) {
  const item = campos.item ? (row[campos.item] || '').toString().trim() : '';
  if (!item) return null;
  const data = campos.data ? formatarDataISO(row[campos.data]) : null;
  let categoria = campos.categoria ? (row[campos.categoria] || '').toString().trim().toUpperCase() : '';
  if (categoria && !CATEGORIAS_FINANCEIRO.includes(categoria)) {
    avisos.push(`Gastos linha ${numeroLinha}: categoria "${categoria}" não reconhecida, mantida assim mesmo.`);
  }
  const cidade = ((campos.cidade ? row[campos.cidade] : '') || 'GERAL').toString().trim().toUpperCase();
  const moedaRaw = campos.moeda ? (row[campos.moeda] || '').toString().trim().toUpperCase() : '';
  const moeda = moedaRaw === 'BRL' ? 'BRL' : 'EUR';
  const valor_eur = campos.valor_eur ? paraNumero(row[campos.valor_eur]) : 0;
  const valor_brl = campos.valor_brl ? paraNumero(row[campos.valor_brl]) : (valor_eur * euroMedio);
  return { data, cidade, categoria: categoria || 'OUTROS', item, moeda, valor_eur, valor_brl, orcamento_id: null };
}

function processarAba(workbook, nomesAceitos, aliasMap, converterLinha, resultado, chave, camposChave) {
  const nomeAba = encontrarAba(workbook, nomesAceitos);
  if (!nomeAba) {
    resultado.avisos.push(`Não encontrei a aba "${nomesAceitos[0]}" no arquivo — nada importado dela.`);
    return;
  }
  const sheet = workbook.Sheets[nomeAba];
  const linhas = XLSX.utils.sheet_to_json(sheet, { defval: null });
  if (linhas.length === 0) return;

  const campos = resolverCampos(Object.keys(linhas[0] || {}), aliasMap);
  const faltando = camposChave.filter(c => !campos[c]);
  if (faltando.length > 0) {
    resultado.avisos.push(`Aba "${nomeAba}": não encontrei a(s) coluna(s) ${faltando.join(', ')} — confira os cabeçalhos.`);
  }

  linhas.forEach((row, idx) => {
    const numeroLinha = idx + 2;
    const idVal = campos.id ? row[campos.id] : null;
    if (!linhaEstaVazia(idVal)) return; // já existe no Supabase — pula

    const todaVazia = Object.values(row).every(linhaEstaVazia);
    if (todaVazia) return;

    const convertida = converterLinha(row, campos, resultado.avisos, numeroLinha);
    if (convertida) resultado[chave].push(convertida);
  });
}

let pendingImport = null;

async function handleImportFile(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;

  document.getElementById('import-preview-body').innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Lendo arquivo...</p>';
  document.getElementById('btn-confirmar-importacao').style.display = 'none';
  document.getElementById('modal-importar').classList.add('active');

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

    const resultado = { roteiro: [], orcamento: [], gastos: [], avisos: [] };
    processarAba(workbook, ['ROTEIRO'], ALIASES_ROTEIRO, converterLinhaRoteiro, resultado, 'roteiro', ['dia', 'atracao']);
    processarAba(workbook, ['ORÇAMENTO', 'ORCAMENTO'], ALIASES_ORCAMENTO, converterLinhaOrcamento, resultado, 'orcamento', ['item', 'categoria']);
    processarAba(workbook, ['GASTOS'], ALIASES_GASTOS, converterLinhaGastos, resultado, 'gastos', ['item', 'data']);

    pendingImport = resultado;
    renderImportPreview(resultado);
  } catch (err) {
    console.error(err);
    document.getElementById('import-preview-body').innerHTML = `<p style="color:#dc2626;">Não consegui ler esse arquivo. Confirme que é um .xlsx válido.<br><small>${err.message || ''}</small></p>`;
  }
}

function renderImportPreview(resultado) {
  const body = document.getElementById('import-preview-body');
  const totalNovas = resultado.roteiro.length + resultado.orcamento.length + resultado.gastos.length;

  let html = '';
  if (resultado.avisos.length > 0) {
    html += `<div style="background:rgba(217,119,6,0.12); border:1px solid #d97706; border-radius:8px; padding:8px 10px; margin-bottom:12px; font-size:0.78rem; color:#d97706;">
      ${resultado.avisos.map(a => `<div>⚠ ${a}</div>`).join('')}
    </div>`;
  }

  const linhaResumo = (nome, arr) => `<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);"><span>${nome}</span><strong>${arr.length} nova(s)</strong></div>`;
  html += `<div style="margin-bottom:12px;">${linhaResumo('Roteiro', resultado.roteiro)}${linhaResumo('Orçamento', resultado.orcamento)}${linhaResumo('Gastos', resultado.gastos)}</div>`;

  if (totalNovas === 0) {
    html += `<p style="color:var(--text-muted); font-size:0.85rem;">Nenhuma linha nova encontrada (tudo já tem "id" preenchido, ou nenhuma aba foi reconhecida).</p>`;
  } else {
    const preview = (arr, campos) => arr.slice(0, 3).map(r => `<div style="font-size:0.75rem; color:var(--text-muted); padding:4px 0; border-bottom:1px dashed var(--border-color);">${campos.map(c => r[c]).filter(Boolean).join(' • ')}</div>`).join('');
    if (resultado.roteiro.length) html += `<div style="font-size:0.7rem; font-weight:800; text-transform:uppercase; margin-top:10px; color:var(--text-muted);">Prévia Roteiro (${resultado.roteiro.length})</div>${preview(resultado.roteiro, ['dia', 'atracao', 'cidade'])}`;
    if (resultado.orcamento.length) html += `<div style="font-size:0.7rem; font-weight:800; text-transform:uppercase; margin-top:10px; color:var(--text-muted);">Prévia Orçamento (${resultado.orcamento.length})</div>${preview(resultado.orcamento, ['categoria', 'item', 'cidade'])}`;
    if (resultado.gastos.length) html += `<div style="font-size:0.7rem; font-weight:800; text-transform:uppercase; margin-top:10px; color:var(--text-muted);">Prévia Gastos (${resultado.gastos.length})</div>${preview(resultado.gastos, ['data', 'item', 'cidade'])}`;
  }

  body.innerHTML = html;
  document.getElementById('btn-confirmar-importacao').style.display = totalNovas > 0 ? 'block' : 'none';
}

async function confirmarImportacao() {
  if (!pendingImport) return;
  const btn = document.getElementById('btn-confirmar-importacao');
  btn.disabled = true;
  btn.innerText = 'Importando...';

  const relatorio = [];
  for (const [tabela, linhas] of [['roteiro', pendingImport.roteiro], ['orcamento', pendingImport.orcamento], ['gastos', pendingImport.gastos]]) {
    if (linhas.length === 0) continue;
    const { error } = await _supabase.from(tabela).insert(linhas);
    relatorio.push(error ? `${tabela}: erro ao inserir (${error.message})` : `${tabela}: ${linhas.length} linha(s) importada(s) com sucesso`);
  }

  btn.disabled = false;
  btn.innerText = 'Confirmar Importação';
  pendingImport = null;
  closeModal('modal-importar');
  await loadAllData(false);
  alert(relatorio.join('\n'));
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
window.filterOrcamentoCity = filterOrcamentoCity;
window.filterGastosCat = filterGastosCat;
window.refreshVinculoOptions = refreshVinculoOptions;
window.handleImportFile = handleImportFile;
window.confirmarImportacao = confirmarImportacao;
