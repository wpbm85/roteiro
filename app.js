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
  const orderMap = { "PAGO": 1, "A PAGAR": 2, "PROJETADO": 3 };
  let sortedOrcamento = [...orcamentoData].sort((a,b) => (orderMap[a.status] || 9) - (orderMap[b.status] || 9));

  sortedOrcamento.forEach(item => {
    let projEur = parseFloat(item.projetado_eur) || 0;
    projTot += projEur;

    let catName = item.categoria.trim();
    let normCat = normalizeStr(catName);
    let normItem = normalizeStr(item.item);

    if (!catTotals[catName]) {
      catTotals[catName] = { proj: 0, efet: 0 };
    }
    catTotals[catName].proj += projEur;

    // Verifica se existe um gasto real vinculado a este item específico ou à categoria/cidade
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

    let displayValBrl = displayValEur * euroMedio;

    container.innerHTML += `
      <div class="list-item" style="display:flex; justify-content:space-between; align-items:center;">
        <div class="list-item-left">
          <div style="font-weight:700;">${item.item}</div>
          <div class="list-item-sub" style="font-size:0.8rem;">${item.categoria} • <span style="color:${statusColor}; font-weight:700;">${statusText}</span> ${gastoVinculado ? `<span style="font-size:0.7rem; opacity:0.8;">(Proj: € ${projEur.toFixed(2)})</span>` : ''}</div>
        </div>
        <div class="list-item-right" style="text-align:right;">
          <div style="font-weight:800; color:${statusColor}">€ ${displayValEur.toFixed(2)}</div>
          <div class="list-item-sub" style="font-size:0.75rem;">R$ ${displayValBrl.toFixed(2)}</div>
          <div style="margin-top:4px; display:flex; gap:4px; justify-content:flex-end;">
            <button class="btn-act" onclick="editOrcamento(${item.id})" style="padding:2px 6px; font-size:0.7rem;"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-act del-btn" onclick="deleteItem(${item.id}, 'orcamento')" style="padding:2px 6px; font-size:0.7rem;"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>`;
  });

  // Ajusta subtotais de categoria considerando os gastos reais já mapeados
  for (const [catName, val] of Object.entries(catTotals)) {
    let catNorm = normalizeStr(catName);
    if (val.efet === 0 && gastosPorCat[catNorm]) {
      val.efet = gastosPorCat[catNorm];
    }
  }

  let efetTot = totalGastosReais + efetivoOrcamentoPagos;
  let aPagarEur = Math.max(0, projTot - efetTot);

  const mProjEur = document.getElementById("metric-proj-eur");
  const mProjBrl = document.getElementById("metric-proj-brl");
  const mEfetEur = document.getElementById("metric-efet-eur");
  const mEfetBrl = document.getElementById("metric-efet-brl");
  const mDifEur  = document.getElementById("metric-dif-eur");
  const mDifBrl  = document.getElementById("metric-dif-brl");

  if(mProjEur) mProjEur.innerText = `€ ${projTot.toFixed(2)}`;
  if(mProjBrl) mProjBrl.innerText = `R$ ${(projTot * euroMedio).toFixed(2)}`;
  if(mEfetEur) mEfetEur.innerText = `€ ${efetTot.toFixed(2)}`;
  if(mEfetBrl) mEfetBrl.innerText = `R$ ${(efetTot * euroMedio).toFixed(2)}`;
  if(mDifEur)  mDifEur.innerText  = `€ ${aPagarEur.toFixed(2)}`;
  if(mDifBrl)  mDifBrl.innerText  = `R$ ${(aPagarEur * euroMedio).toFixed(2)}`;

  renderSubtotaisOrcamento(catTotals);
}