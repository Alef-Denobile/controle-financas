/* =======================================================================
   Livro-Caixa — Pessoal & Empresa
   Vanilla JS + localStorage. Abra o index.html no navegador para usar.
   ======================================================================= */

const COLORS = {
  pessoal: "#2F6F4E", empresa: "#A15C38", gold: "#B9922E", red: "#B33F3F", ink: "#1C2B22",
};

const CATEGORIAS_DESPESA = ["Moradia","Alimentação","Transporte","Saúde","Educação","Lazer","Assinaturas","Impostos","Marketing","Fornecedores","Salários","Ferramentas/Software","Aluguel Comercial","Outros"];
const CATEGORIAS_RECEITA = ["Salário","Freelance","Vendas","Serviços Prestados","Dividendos","Rendimentos","Reembolso","Outros"];
const CONTAS = ["Cartão de Crédito","Conta Corrente","Dinheiro","Pix","Boleto"];
const TIPOS_INVEST = ["Renda Fixa","Renda Variável","Fundos","Cripto","Previdência","Outros"];

const uid = () => Math.random().toString(36).slice(2, 10);
const fmtBRL = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const fmtPct = (n) => `${((n || 0) * 100).toFixed(1)}%`;
const monthKey = (d) => (d || "").slice(0, 7);
const brDate = (d) => (d || "").split("-").reverse().join("/");
const monthLabel = (ym) => {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${meses[parseInt(m, 10) - 1]}/${y}`;
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const escapeHtml = (s) => (s || "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

/* ----------------------------------------------------------------------- */
/* Seed data (usado apenas na primeira visita, antes de existir nada salvo) */
/* ----------------------------------------------------------------------- */
const SEED_TX = [
  { id: uid(), date: "2026-07-01", desc: "Salário mensal", type: "Receita", category: "Salário", scope: "Pessoal", account: "Conta Corrente", status: "Pago", value: 6500 },
  { id: uid(), date: "2026-07-03", desc: "Aluguel", type: "Despesa", category: "Moradia", scope: "Pessoal", account: "Conta Corrente", status: "Pago", value: 1800 },
  { id: uid(), date: "2026-07-05", desc: "Supermercado", type: "Despesa", category: "Alimentação", scope: "Pessoal", account: "Cartão de Crédito", status: "Pago", value: 620 },
  { id: uid(), date: "2026-07-06", desc: "Assinatura streaming", type: "Despesa", category: "Assinaturas", scope: "Pessoal", account: "Cartão de Crédito", status: "Pago", value: 55.9 },
  { id: uid(), date: "2026-07-10", desc: "Venda de serviço", type: "Receita", category: "Serviços Prestados", scope: "Empresa", account: "Pix", status: "Pago", value: 4200 },
  { id: uid(), date: "2026-07-12", desc: "Fornecedor de materiais", type: "Despesa", category: "Fornecedores", scope: "Empresa", account: "Boleto", status: "Pago", value: 1350 },
  { id: uid(), date: "2026-07-15", desc: "Ferramenta SaaS", type: "Despesa", category: "Ferramentas/Software", scope: "Empresa", account: "Cartão de Crédito", status: "Pago", value: 299 },
  { id: uid(), date: "2026-07-20", desc: "Freelance design", type: "Receita", category: "Freelance", scope: "Pessoal", account: "Pix", status: "Pendente", value: 950 },
];
const SEED_CARDS = [
  { id: uid(), name: "Nubank", limit: 5000, dueDay: 10, bestDay: 3 },
  { id: uid(), name: "Inter", limit: 3000, dueDay: 15, bestDay: 5 },
];
const SEED_INV = [
  { id: uid(), name: "Tesouro Selic", type: "Renda Fixa", scope: "Pessoal", institution: "Banco XP", date: "2025-01-10", applied: 5000, current: 5450 },
  { id: uid(), name: "Ações ITSA4", type: "Renda Variável", scope: "Pessoal", institution: "Corretora A", date: "2025-06-01", applied: 2000, current: 2180 },
  { id: uid(), name: "CDB Empresa", type: "Renda Fixa", scope: "Empresa", institution: "Banco C6", date: "2025-03-01", applied: 10000, current: 10650 },
];
const SEED_GOALS = [
  { id: uid(), name: "Reserva de Emergência", scope: "Pessoal", target: 20000, current: 8500, deadline: "2026-12-31" },
  { id: uid(), name: "Viagem Europa", scope: "Pessoal", target: 15000, current: 3200, deadline: "2027-06-30" },
  { id: uid(), name: "Equipamento novo", scope: "Empresa", target: 12000, current: 12000, deadline: "2026-05-01" },
];

/* ----------------------------------------------------------------------- */
/* Persistência (localStorage)                                             */
/* ----------------------------------------------------------------------- */
function loadKey(key, seed) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignora e usa seed */ }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}
function persist(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage indisponível */ }
}

const state = {
  tab: "dashboard",
  month: "2026-07",
  scopeFilter: "Todos",
  txs: loadKey("finance_transactions", SEED_TX),
  cards: loadKey("finance_cards", SEED_CARDS),
  invs: loadKey("finance_investments", SEED_INV),
  goals: loadKey("finance_goals", SEED_GOALS),
};

function saveTxs() { persist("finance_transactions", state.txs); }
function saveCards() { persist("finance_cards", state.cards); }
function saveInvs() { persist("finance_investments", state.invs); }
function saveGoals() { persist("finance_goals", state.goals); }

/* ----------------------------------------------------------------------- */
/* Cálculos                                                                 */
/* ----------------------------------------------------------------------- */
function scoped(list, scope) { return scope === "Todos" ? list : list.filter((t) => t.scope === scope); }
function sums(list) {
  const rec = list.filter((t) => t.type === "Receita").reduce((a, t) => a + t.value, 0);
  const desp = list.filter((t) => t.type === "Despesa").reduce((a, t) => a + t.value, 0);
  return { rec, desp, saldo: rec - desp };
}
function cardUsage() {
  const total = state.txs
    .filter((t) => t.account === "Cartão de Crédito" && t.type === "Despesa" && monthKey(t.date) === state.month)
    .reduce((a, t) => a + t.value, 0);
  return state.cards.length ? total / state.cards.length : 0;
}

/* ----------------------------------------------------------------------- */
/* Navegação                                                                */
/* ----------------------------------------------------------------------- */
document.getElementById("nav").addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-item");
  if (!btn) return;
  state.tab = btn.dataset.tab;
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b === btn));
  render();
});

function render() {
  const main = document.getElementById("main");
  if (state.tab === "dashboard") main.innerHTML = renderDashboard();
  else if (state.tab === "lancamentos") main.innerHTML = renderLancamentos();
  else if (state.tab === "cartoes") main.innerHTML = renderCartoes();
  else if (state.tab === "investimentos") main.innerHTML = renderInvestimentos();
  else if (state.tab === "empresa") main.innerHTML = renderEmpresa();
  else if (state.tab === "objetivos") main.innerHTML = renderObjetivos();
  attachMainEvents();
}

/* ----------------------------------------------------------------------- */
/* Componentes de marcação reutilizáveis                                   */
/* ----------------------------------------------------------------------- */
function statCard(label, value, color, sub) {
  return `
    <div class="card">
      <div class="stat-row">
        <span class="stat-label">${label}</span>
      </div>
      <div class="stat-value" style="color:${color}">${value}</div>
      ${sub ? `<div class="stat-sub">${sub}</div>` : ""}
    </div>`;
}
function bar(pct, color) {
  const clamped = Math.max(0, Math.min(1, pct || 0));
  return `<div class="bar-track"><div class="bar-fill" style="width:${clamped * 100}%;background:${color}"></div></div>`;
}
function scopeTag(scope) {
  return `<span class="tag ${scope === "Empresa" ? "empresa" : "pessoal"}">${scope}</span>`;
}
function scopePills(name) {
  return `
    <div class="row-gap">
      <button class="pill ${state.scopeFilter === "Todos" ? "active" : ""}" style="${state.scopeFilter === "Todos" ? `background:${COLORS.ink}` : ""}" data-scope="Todos">Todos</button>
      <button class="pill ${state.scopeFilter === "Pessoal" ? "active" : ""}" style="${state.scopeFilter === "Pessoal" ? `background:${COLORS.pessoal}` : ""}" data-scope="Pessoal">Pessoal</button>
      <button class="pill ${state.scopeFilter === "Empresa" ? "active" : ""}" style="${state.scopeFilter === "Empresa" ? `background:${COLORS.empresa}` : ""}" data-scope="Empresa">Empresa</button>
    </div>`;
}
function txTable(txs) {
  if (txs.length === 0) return `<div class="table-wrap"><p class="empty-msg">Nenhum lançamento neste filtro. Clique em "+ Novo" para começar.</p></div>`;
  const rows = txs.map((t) => `
    <tr data-id="${t.id}">
      <td class="mono" style="color:var(--ink-muted);white-space:nowrap;font-size:12px">${brDate(t.date)}</td>
      <td>${escapeHtml(t.desc)}</td>
      <td style="color:var(--ink-muted)">${t.category}</td>
      <td>${scopeTag(t.scope)}</td>
      <td style="font-size:12px;color:var(--ink-muted)">${t.account}</td>
      <td class="${t.type === "Receita" ? "val-receita" : "val-despesa"}">${t.type === "Receita" ? "+" : "−"} ${fmtBRL(t.value)}</td>
      <td style="font-size:12px;color:var(--ink-muted)">${t.status}</td>
      <td>
        <button class="icon-btn tx-edit" title="Editar">✎</button>
        <button class="icon-btn tx-del" title="Excluir">🗑</button>
      </td>
    </tr>`).join("");
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Escopo</th><th>Forma</th><th>Valor</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* ----------------------------------------------------------------------- */
/* Painel (Dashboard)                                                       */
/* ----------------------------------------------------------------------- */
function renderDashboard() {
  const monthTx = state.txs.filter((t) => monthKey(t.date) === state.month);
  const dashTx = scoped(monthTx, state.scopeFilter);
  const dashSums = sums(dashTx);
  const allSums = sums(scoped(state.txs, state.scopeFilter));

  const catMap = {};
  dashTx.filter((t) => t.type === "Despesa").forEach((t) => { catMap[t.category] = (catMap[t.category] || 0) + t.value; });
  const catTotals = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const maxCat = catTotals.length ? catTotals[0][1] : 1;

  const investTotals = state.invs.reduce((a, i) => ({ applied: a.applied + i.applied, current: a.current + i.current }), { applied: 0, current: 0 });
  const rentMedia = investTotals.applied ? (investTotals.current - investTotals.applied) / investTotals.applied : 0;

  return `
    <div class="row-between">
      <div>
        <h1 class="page-title">Painel financeiro</h1>
        <p class="page-sub">Resumo de ${monthLabel(state.month)}</p>
      </div>
      <div class="row-gap">
        <input type="month" id="month-input" class="field-inline" value="${state.month}" style="padding:8px 10px;border-radius:10px;border:1px solid var(--rule);font-family:inherit" />
        ${scopePills()}
      </div>
    </div>

    <div class="grid grid-3" style="margin-bottom:28px">
      ${statCard("Receitas do mês", fmtBRL(dashSums.rec), COLORS.pessoal)}
      ${statCard("Despesas do mês", fmtBRL(dashSums.desp), COLORS.red)}
      ${statCard("Saldo do mês", fmtBRL(dashSums.saldo), COLORS.gold, `Saldo acumulado: ${fmtBRL(allSums.saldo)}`)}
    </div>

    <div class="grid grid-2" style="margin-bottom:28px">
      <div class="card">
        <h2 class="section-title" style="border-color:${COLORS.pessoal}">Despesas por categoria</h2>
        ${catTotals.length === 0 ? `<p style="color:var(--ink-muted);font-size:14px">Sem despesas neste filtro.</p>` :
          catTotals.map(([cat, val]) => `
            <div style="margin-bottom:12px">
              <div class="bar-line"><span>${cat}</span><span class="mono">${fmtBRL(val)}</span></div>
              ${bar(val / maxCat, COLORS.empresa)}
            </div>`).join("")}
      </div>
      <div class="card">
        <h2 class="section-title" style="border-color:${COLORS.gold}">Objetivos em andamento</h2>
        ${state.goals.map((g) => {
          const pct = g.target ? g.current / g.target : 0;
          return `
            <div style="margin-bottom:14px">
              <div class="bar-line"><span>${escapeHtml(g.name)} <span style="font-size:12px;color:${g.scope === "Empresa" ? COLORS.empresa : COLORS.pessoal}">· ${g.scope}</span></span><span class="mono" style="font-size:12px;color:var(--ink-muted)">${fmtPct(pct)}</span></div>
              ${bar(pct, pct >= 1 ? COLORS.pessoal : COLORS.gold)}
            </div>`;
        }).join("")}
      </div>
    </div>

    <div class="grid grid-3">
      ${statCard("Limite de cartões", fmtBRL(state.cards.reduce((a, c) => a + c.limit, 0)), COLORS.pessoal)}
      ${statCard("Total investido", fmtBRL(investTotals.applied), COLORS.pessoal, `Valor atual: ${fmtBRL(investTotals.current)}`)}
      ${statCard("Rentabilidade média", fmtPct(rentMedia), COLORS.gold)}
    </div>
  `;
}

/* ----------------------------------------------------------------------- */
/* Lançamentos                                                              */
/* ----------------------------------------------------------------------- */
function renderLancamentos() {
  const list = scoped(state.txs, state.scopeFilter).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  return `
    <div class="row-between">
      <h1 class="page-title">Lançamentos</h1>
      <div class="row-gap">
        ${scopePills()}
        <button class="btn pessoal" id="new-tx-btn">+ Novo</button>
      </div>
    </div>
    ${txTable(list)}
  `;
}

/* ----------------------------------------------------------------------- */
/* Cartões                                                                  */
/* ----------------------------------------------------------------------- */
function renderCartoes() {
  const usage = cardUsage();
  const items = state.cards.map((c) => {
    const used = usage;
    const pct = c.limit ? used / c.limit : 0;
    return `
      <div class="item-card" data-id="${c.id}">
        <div class="item-head">
          <div>
            <h3 class="item-title">${escapeHtml(c.name)}</h3>
            <p class="item-note">Vence dia ${c.dueDay} · melhor compra dia ${c.bestDay}</p>
          </div>
          <div>
            <button class="icon-btn card-edit" title="Editar">✎</button>
            <button class="icon-btn card-del" title="Excluir">🗑</button>
          </div>
        </div>
        <div class="bar-line"><span>Fatura estimada do mês</span><span class="mono" style="font-weight:700">${fmtBRL(used)}</span></div>
        ${bar(pct, pct > 0.8 ? COLORS.red : COLORS.pessoal)}
        <div class="bar-line" style="margin-top:8px;font-size:12px;color:var(--ink-muted)">
          <span>Limite ${fmtBRL(c.limit)}</span><span>Disponível ${fmtBRL(c.limit - used)}</span>
        </div>
      </div>`;
  }).join("");
  return `
    <div class="row-between">
      <h1 class="page-title">Cartões de crédito</h1>
      <button class="btn pessoal" id="new-card-btn">+ Novo cartão</button>
    </div>
    <div class="grid grid-2">${items || `<p class="empty-msg">Nenhum cartão cadastrado.</p>`}</div>
  `;
}

/* ----------------------------------------------------------------------- */
/* Investimentos                                                           */
/* ----------------------------------------------------------------------- */
function renderInvestimentos() {
  const rows = state.invs.map((i) => {
    const rent = i.applied ? (i.current - i.applied) / i.applied : 0;
    return `
      <tr data-id="${i.id}">
        <td>${escapeHtml(i.name)}<div style="font-size:12px;color:var(--ink-muted)">${escapeHtml(i.institution || "")}</div></td>
        <td style="font-size:12px;color:var(--ink-muted)">${i.type}</td>
        <td>${scopeTag(i.scope)}</td>
        <td class="mono">${fmtBRL(i.applied)}</td>
        <td class="mono">${fmtBRL(i.current)}</td>
        <td class="mono" style="font-weight:700;color:${rent >= 0 ? COLORS.pessoal : COLORS.red}">${fmtPct(rent)}</td>
        <td>
          <button class="icon-btn inv-edit" title="Editar">✎</button>
          <button class="icon-btn inv-del" title="Excluir">🗑</button>
        </td>
      </tr>`;
  }).join("");
  return `
    <div class="row-between">
      <h1 class="page-title">Investimentos</h1>
      <button class="btn pessoal" id="new-inv-btn">+ Novo</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Ativo</th><th>Tipo</th><th>Escopo</th><th>Aplicado</th><th>Atual</th><th>Rentab.</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="7"><p class="empty-msg">Nenhum investimento cadastrado.</p></td></tr>`}</tbody>
      </table>
    </div>
  `;
}

/* ----------------------------------------------------------------------- */
/* Empresa                                                                  */
/* ----------------------------------------------------------------------- */
function renderEmpresa() {
  const empMonthTx = state.txs.filter((t) => t.scope === "Empresa" && monthKey(t.date) === state.month);
  const s = sums(empMonthTx);
  const allEmp = state.txs.filter((t) => t.scope === "Empresa").slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  return `
    <div class="row-between">
      <div>
        <h1 class="page-title" style="color:${COLORS.empresa}">Empresa</h1>
        <p class="page-sub">Área separada do seu CNPJ · ${monthLabel(state.month)}</p>
      </div>
      <div class="row-gap">
        <input type="month" id="month-input-emp" value="${state.month}" style="padding:8px 10px;border-radius:10px;border:1px solid var(--rule);font-family:inherit" />
        <button class="btn empresa" id="new-tx-emp-btn">+ Novo</button>
      </div>
    </div>
    <div class="grid grid-3" style="margin-bottom:24px">
      ${statCard("Receitas", fmtBRL(s.rec), COLORS.empresa)}
      ${statCard("Despesas", fmtBRL(s.desp), COLORS.red)}
      ${statCard("Saldo", fmtBRL(s.saldo), COLORS.gold)}
    </div>
    <h2 class="section-title" style="border-color:${COLORS.empresa}">Lançamentos da empresa</h2>
    ${txTable(allEmp)}
  `;
}

/* ----------------------------------------------------------------------- */
/* Objetivos                                                                */
/* ----------------------------------------------------------------------- */
function renderObjetivos() {
  const items = state.goals.map((g) => {
    const pct = g.target ? g.current / g.target : 0;
    const done = pct >= 1;
    const late = !done && new Date(g.deadline) < new Date();
    const statusLabel = done ? "Concluído" : late ? "Atrasado" : "Em andamento";
    const statusColor = done ? COLORS.pessoal : late ? COLORS.red : "var(--ink-muted)";
    return `
      <div class="item-card" data-id="${g.id}">
        <div class="item-head">
          <div>
            <h3 class="item-title">${escapeHtml(g.name)}</h3>
            ${scopeTag(g.scope)}
          </div>
          <div>
            <button class="icon-btn goal-edit" title="Editar">✎</button>
            <button class="icon-btn goal-del" title="Excluir">🗑</button>
          </div>
        </div>
        <div class="bar-line"><span class="mono">${fmtBRL(g.current)} de ${fmtBRL(g.target)}</span><span class="mono" style="font-weight:700">${fmtPct(pct)}</span></div>
        ${bar(pct, done ? COLORS.pessoal : late ? COLORS.red : COLORS.gold)}
        <div class="bar-line" style="margin-top:8px;font-size:12px;color:var(--ink-muted)">
          <span>Prazo: ${brDate(g.deadline)}</span>
          <span style="color:${statusColor};font-weight:600">${statusLabel}</span>
        </div>
      </div>`;
  }).join("");
  return `
    <div class="row-between">
      <h1 class="page-title">Objetivos futuros</h1>
      <button class="btn gold" id="new-goal-btn">+ Novo objetivo</button>
    </div>
    <div class="grid grid-2">${items || `<p class="empty-msg">Nenhum objetivo cadastrado.</p>`}</div>
  `;
}

/* ----------------------------------------------------------------------- */
/* Eventos da tela principal                                                */
/* ----------------------------------------------------------------------- */
function attachMainEvents() {
  document.querySelectorAll("[data-scope]").forEach((btn) => {
    btn.addEventListener("click", () => { state.scopeFilter = btn.dataset.scope; render(); });
  });
  const monthInput = document.getElementById("month-input") || document.getElementById("month-input-emp");
  if (monthInput) monthInput.addEventListener("change", (e) => { state.month = e.target.value; render(); });

  const newTxBtn = document.getElementById("new-tx-btn") || document.getElementById("new-tx-emp-btn");
  if (newTxBtn) newTxBtn.addEventListener("click", () => openTxModal(null, state.tab === "empresa" ? "Empresa" : undefined));

  document.querySelectorAll(".tx-edit").forEach((b) => b.addEventListener("click", (e) => {
    const id = e.target.closest("tr").dataset.id;
    openTxModal(state.txs.find((t) => t.id === id));
  }));
  document.querySelectorAll(".tx-del").forEach((b) => b.addEventListener("click", (e) => {
    const id = e.target.closest("tr").dataset.id;
    if (confirm("Excluir este lançamento?")) { state.txs = state.txs.filter((t) => t.id !== id); saveTxs(); render(); }
  }));

  const newCardBtn = document.getElementById("new-card-btn");
  if (newCardBtn) newCardBtn.addEventListener("click", () => openCardModal(null));
  document.querySelectorAll(".card-edit").forEach((b) => b.addEventListener("click", (e) => {
    const id = e.target.closest(".item-card").dataset.id;
    openCardModal(state.cards.find((c) => c.id === id));
  }));
  document.querySelectorAll(".card-del").forEach((b) => b.addEventListener("click", (e) => {
    const id = e.target.closest(".item-card").dataset.id;
    if (confirm("Excluir este cartão?")) { state.cards = state.cards.filter((c) => c.id !== id); saveCards(); render(); }
  }));

  const newInvBtn = document.getElementById("new-inv-btn");
  if (newInvBtn) newInvBtn.addEventListener("click", () => openInvModal(null));
  document.querySelectorAll(".inv-edit").forEach((b) => b.addEventListener("click", (e) => {
    const id = e.target.closest("tr").dataset.id;
    openInvModal(state.invs.find((i) => i.id === id));
  }));
  document.querySelectorAll(".inv-del").forEach((b) => b.addEventListener("click", (e) => {
    const id = e.target.closest("tr").dataset.id;
    if (confirm("Excluir este investimento?")) { state.invs = state.invs.filter((i) => i.id !== id); saveInvs(); render(); }
  }));

  const newGoalBtn = document.getElementById("new-goal-btn");
  if (newGoalBtn) newGoalBtn.addEventListener("click", () => openGoalModal(null));
  document.querySelectorAll(".goal-edit").forEach((b) => b.addEventListener("click", (e) => {
    const id = e.target.closest(".item-card").dataset.id;
    openGoalModal(state.goals.find((g) => g.id === id));
  }));
  document.querySelectorAll(".goal-del").forEach((b) => b.addEventListener("click", (e) => {
    const id = e.target.closest(".item-card").dataset.id;
    if (confirm("Excluir este objetivo?")) { state.goals = state.goals.filter((g) => g.id !== id); saveGoals(); render(); }
  }));
}

/* ----------------------------------------------------------------------- */
/* Modal genérico                                                           */
/* ----------------------------------------------------------------------- */
function closeModal() { document.getElementById("modal-root").innerHTML = ""; }

function openModal(title, bodyHtml) {
  document.getElementById("modal-root").innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal-box">
        <div class="modal-head">
          <h3 class="modal-title">${title}</h3>
          <button class="icon-btn" id="modal-close">✕</button>
        </div>
        ${bodyHtml}
      </div>
    </div>`;
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-overlay").addEventListener("click", (e) => { if (e.target.id === "modal-overlay") closeModal(); });
}

function chipGroup(name, options, selected, color) {
  return `<div class="chip-group" data-chipgroup="${name}">
    ${options.map((o) => `<button type="button" class="chip ${o === selected ? "selected" : ""}" data-value="${o}" style="${o === selected ? `background:${color};border-color:${color}` : ""}">${o}</button>`).join("")}
  </div>`;
}
function wireChipGroup(name, onChange) {
  document.querySelectorAll(`[data-chipgroup="${name}"] .chip`).forEach((chip) => {
    chip.addEventListener("click", () => onChange(chip.dataset.value));
  });
}

/* ---- Transação ---- */
function openTxModal(existing, defaultScope) {
  const f = existing ? { ...existing } : { date: todayISO(), desc: "", type: "Despesa", category: CATEGORIAS_DESPESA[0], scope: defaultScope || "Pessoal", account: CONTAS[0], status: "Pago", value: "" };
  const draw = () => {
    const cats = f.type === "Receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
    openModal(existing ? "Editar lançamento" : "Novo lançamento", `
      <div class="field"><label>Descrição</label><input id="f-desc" value="${escapeHtml(f.desc)}" placeholder="Ex.: Supermercado" /></div>
      <div class="field-row">
        <div class="field"><label>Data</label><input id="f-date" type="date" value="${f.date}" /></div>
        <div class="field"><label>Valor (R$)</label><input id="f-value" type="number" step="0.01" value="${f.value}" placeholder="0,00" /></div>
      </div>
      <div class="field"><label>Tipo</label>${chipGroup("type", ["Despesa","Receita"], f.type, f.type === "Receita" ? COLORS.pessoal : COLORS.red)}</div>
      <div class="field"><label>Escopo</label>${chipGroup("scope", ["Pessoal","Empresa"], f.scope, f.scope === "Empresa" ? COLORS.empresa : COLORS.pessoal)}</div>
      <div class="field"><label>Categoria</label>${chipGroup("category", cats, f.category, COLORS.gold)}</div>
      <div class="field"><label>Forma de pagamento</label>${chipGroup("account", CONTAS, f.account, COLORS.ink)}</div>
      <div class="field"><label>Status</label>${chipGroup("status", ["Pago","Pendente","Agendado"], f.status, COLORS.pessoal)}</div>
      <button class="btn save-btn" id="f-save" style="background:${f.scope === "Empresa" ? COLORS.empresa : COLORS.pessoal}">Salvar lançamento</button>
    `);
    document.getElementById("f-desc").addEventListener("input", (e) => { f.desc = e.target.value; });
    document.getElementById("f-date").addEventListener("change", (e) => { f.date = e.target.value; });
    document.getElementById("f-value").addEventListener("input", (e) => { f.value = e.target.value; });
    wireChipGroup("type", (v) => { f.type = v; f.category = v === "Receita" ? CATEGORIAS_RECEITA[0] : CATEGORIAS_DESPESA[0]; draw(); });
    wireChipGroup("scope", (v) => { f.scope = v; draw(); });
    wireChipGroup("category", (v) => { f.category = v; draw(); });
    wireChipGroup("account", (v) => { f.account = v; draw(); });
    wireChipGroup("status", (v) => { f.status = v; draw(); });
    document.getElementById("f-save").addEventListener("click", () => {
      if (!f.desc || !f.value) return;
      const data = { ...f, value: parseFloat(f.value) || 0, id: f.id || uid() };
      const exists = state.txs.some((t) => t.id === data.id);
      state.txs = exists ? state.txs.map((t) => (t.id === data.id ? data : t)) : [data, ...state.txs];
      saveTxs(); closeModal(); render();
    });
  };
  draw();
}

/* ---- Cartão ---- */
function openCardModal(existing) {
  const f = existing ? { ...existing } : { name: "", limit: "", dueDay: "", bestDay: "" };
  openModal(existing ? "Editar cartão" : "Novo cartão", `
    <div class="field"><label>Nome do cartão</label><input id="f-name" value="${escapeHtml(f.name)}" /></div>
    <div class="field"><label>Limite (R$)</label><input id="f-limit" type="number" value="${f.limit}" /></div>
    <div class="field-row">
      <div class="field"><label>Dia de vencimento</label><input id="f-due" type="number" value="${f.dueDay}" /></div>
      <div class="field"><label>Melhor dia de compra</label><input id="f-best" type="number" value="${f.bestDay}" /></div>
    </div>
    <button class="btn save-btn pessoal" id="f-save">Salvar cartão</button>
  `);
  document.getElementById("f-save").addEventListener("click", () => {
    const name = document.getElementById("f-name").value;
    if (!name) return;
    const data = {
      id: f.id || uid(), name,
      limit: parseFloat(document.getElementById("f-limit").value) || 0,
      dueDay: parseInt(document.getElementById("f-due").value) || 0,
      bestDay: parseInt(document.getElementById("f-best").value) || 0,
    };
    const exists = state.cards.some((c) => c.id === data.id);
    state.cards = exists ? state.cards.map((c) => (c.id === data.id ? data : c)) : [...state.cards, data];
    saveCards(); closeModal(); render();
  });
}

/* ---- Investimento ---- */
function openInvModal(existing) {
  const f = existing ? { ...existing } : { name: "", type: TIPOS_INVEST[0], scope: "Pessoal", institution: "", date: todayISO(), applied: "", current: "" };
  const draw = () => {
    openModal(existing ? "Editar investimento" : "Novo investimento", `
      <div class="field"><label>Ativo / Aplicação</label><input id="f-name" value="${escapeHtml(f.name)}" /></div>
      <div class="field"><label>Tipo</label>${chipGroup("type", TIPOS_INVEST, f.type, COLORS.pessoal)}</div>
      <div class="field"><label>Escopo</label>${chipGroup("scope", ["Pessoal","Empresa"], f.scope, f.scope === "Empresa" ? COLORS.empresa : COLORS.pessoal)}</div>
      <div class="field"><label>Instituição</label><input id="f-inst" value="${escapeHtml(f.institution || "")}" /></div>
      <div class="field"><label>Data da aplicação</label><input id="f-date" type="date" value="${f.date}" /></div>
      <div class="field-row">
        <div class="field"><label>Valor aplicado (R$)</label><input id="f-applied" type="number" value="${f.applied}" /></div>
        <div class="field"><label>Valor atual (R$)</label><input id="f-current" type="number" value="${f.current}" /></div>
      </div>
      <button class="btn save-btn pessoal" id="f-save">Salvar investimento</button>
    `);
    document.getElementById("f-name").addEventListener("input", (e) => { f.name = e.target.value; });
    document.getElementById("f-inst").addEventListener("input", (e) => { f.institution = e.target.value; });
    document.getElementById("f-date").addEventListener("change", (e) => { f.date = e.target.value; });
    document.getElementById("f-applied").addEventListener("input", (e) => { f.applied = e.target.value; });
    document.getElementById("f-current").addEventListener("input", (e) => { f.current = e.target.value; });
    wireChipGroup("type", (v) => { f.type = v; draw(); });
    wireChipGroup("scope", (v) => { f.scope = v; draw(); });
    document.getElementById("f-save").addEventListener("click", () => {
      if (!f.name) return;
      const data = { ...f, applied: parseFloat(f.applied) || 0, current: parseFloat(f.current) || 0, id: f.id || uid() };
      const exists = state.invs.some((i) => i.id === data.id);
      state.invs = exists ? state.invs.map((i) => (i.id === data.id ? data : i)) : [...state.invs, data];
      saveInvs(); closeModal(); render();
    });
  };
  draw();
}

/* ---- Objetivo ---- */
function openGoalModal(existing) {
  const f = existing ? { ...existing } : { name: "", scope: "Pessoal", target: "", current: "", deadline: "2026-12-31" };
  const draw = () => {
    openModal(existing ? "Editar objetivo" : "Novo objetivo", `
      <div class="field"><label>Objetivo</label><input id="f-name" value="${escapeHtml(f.name)}" placeholder="Ex.: Reserva de emergência" /></div>
      <div class="field"><label>Escopo</label>${chipGroup("scope", ["Pessoal","Empresa"], f.scope, f.scope === "Empresa" ? COLORS.empresa : COLORS.pessoal)}</div>
      <div class="field-row">
        <div class="field"><label>Valor meta (R$)</label><input id="f-target" type="number" value="${f.target}" /></div>
        <div class="field"><label>Valor atual (R$)</label><input id="f-current" type="number" value="${f.current}" /></div>
      </div>
      <div class="field"><label>Prazo</label><input id="f-deadline" type="date" value="${f.deadline}" /></div>
      <button class="btn save-btn gold" id="f-save">Salvar objetivo</button>
    `);
    document.getElementById("f-name").addEventListener("input", (e) => { f.name = e.target.value; });
    document.getElementById("f-target").addEventListener("input", (e) => { f.target = e.target.value; });
    document.getElementById("f-current").addEventListener("input", (e) => { f.current = e.target.value; });
    document.getElementById("f-deadline").addEventListener("change", (e) => { f.deadline = e.target.value; });
    wireChipGroup("scope", (v) => { f.scope = v; draw(); });
    document.getElementById("f-save").addEventListener("click", () => {
      if (!f.name) return;
      const data = { ...f, target: parseFloat(f.target) || 0, current: parseFloat(f.current) || 0, id: f.id || uid() };
      const exists = state.goals.some((g) => g.id === data.id);
      state.goals = exists ? state.goals.map((g) => (g.id === data.id ? data : g)) : [...state.goals, data];
      saveGoals(); closeModal(); render();
    });
  };
  draw();
}

/* ----------------------------------------------------------------------- */
/* Start                                                                    */
/* ----------------------------------------------------------------------- */
render();
