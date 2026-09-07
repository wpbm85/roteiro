// Dados Oficiais extraídos do EUROPA_2027_APP_ROTEIRO.csv
const rawRoteiroData = [
  { "DATA / DIA": "2027-05-10", "CIDADE": "AMSTERDAM", "REGIÃO": "", "ORDEM": 1, "CATEGORIA": "AEROPORTO", "ATRAÇÃO": "AMSTERDAM SCHIPHOL", "HORÁRIO": "10h50", "ENDEREÇO": "", "CUSTO": 0, "LINK": "", "OBS": "" },
  { "DATA / DIA": "2027-05-10", "CIDADE": "AMSTERDAM", "REGIÃO": "BULLEWIJK", "ORDEM": 2, "CATEGORIA": "HOTEL", "ATRAÇÃO": "Hampton by Hilton Arena Boulevard", "HORÁRIO": "", "ENDEREÇO": "Hoekenrode 1", "CUSTO": 0, "LINK": "", "OBS": "Checkin 15h; depósito malas" },
  { "DATA / DIA": "2027-05-10", "CIDADE": "AMSTERDAM", "REGIÃO": "DE WALLEN", "ORDEM": 3, "CATEGORIA": "MUSEU", "ATRAÇÃO": "NEMO Science Center", "HORÁRIO": "10-17h30", "ENDEREÇO": "Oosterdok 2", "CUSTO": 49.5, "LINK": "https://maps.app.goo.gl/HQgHmEkUffjoBnrd9", "OBS": "Renzo Piano" },
  { "DATA / DIA": "2027-05-10", "CIDADE": "AMSTERDAM", "REGIÃO": "JORDAAN", "ORDEM": 4, "CATEGORIA": "MUSEU", "ATRAÇÃO": "Casa de Anne Frank", "HORÁRIO": "9h-22h", "ENDEREÇO": "Westermarkt 20", "CUSTO": 34, "LINK": "https://maps.app.goo.gl/Z38GjcEYvuAfwnRr8", "OBS": "" },
  { "DATA / DIA": "2027-05-10", "CIDADE": "AMSTERDAM", "REGIÃO": "DE WALLEN", "ORDEM": 5, "CATEGORIA": "MARCO", "ATRAÇÃO": "Oude Kerk", "HORÁRIO": "10-18h", "ENDEREÇO": "Oudekerksplein 23", "CUSTO": 15, "LINK": "https://maps.app.goo.gl/DMj7py9fM9SSsKQWA", "OBS": "" },
  { "DATA / DIA": "2027-05-11", "CIDADE": "AMSTERDAM", "REGIÃO": "MUSEUMKWARTIER", "ORDEM": 1, "CATEGORIA": "MUSEU", "ATRAÇÃO": "Museu van Gogh", "HORÁRIO": "9-18h", "ENDEREÇO": "Museumplein 6", "CUSTO": 50, "LINK": "https://maps.app.goo.gl/YTfzwmU8kL1kHxiy6", "OBS": "" },
  { "DATA / DIA": "2027-05-13", "CIDADE": "BRUXELAS", "REGIÃO": "CENTRO", "ORDEM": 1, "CATEGORIA": "TREM", "ATRAÇÃO": "Eurostar: Amsterdam ➔ Bruxelas", "HORÁRIO": "13h03", "ENDEREÇO": "Estação Central", "CUSTO": 60, "LINK": "", "OBS": "Trem Internacional" }
];

let roteiroData = [];
let currentFilter = "TODAS";

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("europa2027_roteiro_mod");
  roteiroData = saved ? JSON.parse(saved) : rawRoteiroData;
  renderTimeline();
});

function renderTimeline() {
  const container = document.getElementById("timeline-container");
  container.innerHTML = "";

  const filtered = currentFilter === "TODAS" 
    ? roteiroData 
    : roteiroData.filter(item => item.CIDADE.toUpperCase() === currentFilter.toUpperCase());

  // Agrupar por Data
  const grouped = {};
  filtered.forEach(item => {
    const dataKey = item["DATA / DIA"] || "A DEFINIR";
    if (!grouped[dataKey]) grouped[dataKey] = [];
    grouped[dataKey].push(item);
  });

  // Ordenar dentro do dia pela coluna ORDEM
  Object.keys(grouped).sort().forEach(date => {
    grouped[date].sort((a, b) => (a.ORDEM || 0) - (b.ORDEM || 0));

    // Formatar data em PT-BR
    const dateFormatted = date !== "A DEFINIR" 
      ? new Date(date + "T00:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' })
      : "A DEFINIR";

    const dayHeader = document.createElement("div");
    dayHeader.className = "day-header";
    dayHeader.innerHTML = `<i class="fa-regular fa-calendar-days"></i> <span>${dateFormatted.toUpperCase()}</span>`;
    container.appendChild(dayHeader);

    const dayGroupContainer = document.createElement("div");
    dayGroupContainer.className = "timeline-day";
    dayGroupContainer.dataset.date = date;

    grouped[date].forEach(item => {
      // Exibição especial em Faixa para TRENS
      if (item.CATEGORIA === "TREM") {
        const trainEl = document.createElement("div");
        trainEl.className = "train-strip";
        trainEl.dataset.id = item.ORDEM;
        trainEl.innerHTML = `
          <div class="train-info">
            <i class="fa-solid fa-train"></i>
            <span>${item.ATRAÇÃO} ${item.HORÁRIO ? '(' + item.HORÁRIO + ')' : ''}</span>
          </div>
          <span>€ ${parseFloat(item.CUSTO || 0).toFixed(2)}</span>
        `;
        dayGroupContainer.appendChild(trainEl);
        return;
      }

      // Card Normal de Atração
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.id = item.ORDEM;

      let catBg = "var(--cat-default)";
      if(item.CATEGORIA === "MUSEU") catBg = "var(--cat-museu)";
      if(item.CATEGORIA === "HOTEL") catBg = "var(--cat-hotel)";
      if(item.CATEGORIA === "RESTAURANTE") catBg = "var(--cat-restaurante)";
      if(item.CATEGORIA === "MARCO") catBg = "var(--cat-marco)";

      card.innerHTML = `
        <div class="card-top">
          <span class="badge-cat" style="background: ${catBg}">${item.CATEGORIA}</span>
          <span class="card-time">${item.HORÁRIO || ''}</span>
        </div>
        <div class="card-title">${item.ATRAÇÃO}</div>
        ${item.ENDEREÇO ? `<div class="card-address"><i class="fa-solid fa-location-dot"></i> ${item.ENDEREÇO} ${item.REGIÃO ? '• ' + item.REGIÃO : ''}</div>` : ''}
        ${item.OBS ? `<div class="card-obs"><i class="fa-regular fa-lightbulb"></i> ${item.OBS}</div>` : ''}
        <div class="card-footer">
          <span class="card-cost">${item.CUSTO ? '€ ' + parseFloat(item.CUSTO).toFixed(2) : 'Grátis / Incluso'}</span>
          ${item.LINK ? `<a href="${item.LINK}" target="_blank" class="maps-btn"><i class="fa-solid fa-map-pin"></i> Maps</a>` : ''}
        </div>
      `;
      dayGroupContainer.appendChild(card);
    });

    container.appendChild(dayGroupContainer);

    // Habilitar Drag and Drop por dia (SortableJS)
    new Sortable(dayGroupContainer, {
      animation: 150,
      onEnd: function () {
        // Atualiza a coluna ORDEM dos itens após arrastar
        const updatedCards = dayGroupContainer.children;
        Array.from(updatedCards).forEach((child, index) => {
          const atracaoName = child.querySelector('.card-title, .train-info span')?.innerText;
          const target = roteiroData.find(r => r.ATRAÇÃO && atracaoName && atracaoName.includes(r.ATRAÇÃO));
          if(target) target.ORDEM = index + 1;
        });
        localStorage.setItem("europa2027_roteiro_mod", JSON.stringify(roteiroData));
      }
    });

  });
}

function filterCity(city, btn) {
  currentFilter = city;
  document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  renderTimeline();
}

function switchTab(tabName, btn) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById(`tab-${tabName}`).classList.add("active");
  btn.classList.add("active");
}

function openModal() { document.getElementById("add-modal").classList.add("active"); }
function closeModal() { document.getElementById("add-modal").classList.remove("active"); }

function handleFormSubmit(e) {
  e.preventDefault();
  const newItem = {
    "DATA / DIA": document.getElementById("form-data").value,
    "CIDADE": document.getElementById("form-cidade").value,
    "ATRAÇÃO": document.getElementById("form-atracao").value,
    "CATEGORIA": document.getElementById("form-categoria").value,
    "HORÁRIO": document.getElementById("form-horario").value,
    "ENDEREÇO": document.getElementById("form-endereco").value,
    "CUSTO": parseFloat(document.getElementById("form-custo").value) || 0,
    "OBS": document.getElementById("form-obs").value,
    "LINK": document.getElementById("form-link").value,
    "ORDEM": 99
  };

  roteiroData.push(newItem);
  localStorage.setItem("europa2027_roteiro_mod", JSON.stringify(roteiroData));
  renderTimeline();
  closeModal();
  e.target.reset();
}

function exportToXLSX() {
  const ws = XLSX.utils.json_to_sheet(roteiroData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ROTEIRO");
  XLSX.writeFile(wb, "EUROPA_2027_ROTEIRO.xlsx");
}