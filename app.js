"use strict";
(() => {
const CFG = window.ACADEMY_CONFIG || {}, DEMO = !CFG.supabaseUrl || /[?&]demo\b/.test(location.search), VER = "0.3.0";
const $app = document.getElementById("app"), $modal = document.getElementById("modal"), $aviso = document.getElementById("aviso");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const D0 = s => new Date(String(s).slice(0, 10) + "T12:00:00");
const dt = s => s ? D0(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
const dtc = s => s ? dt(s).slice(0, 5) : "";
const dsem = s => s ? D0(s).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "") + " " + dtc(s) : "";
const dthm = s => s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).replace(",", " às") : "nunca";
const hm = s => String(s || "").slice(0, 5);
const minutos = s => { const [h, m] = hm(s).split(":").map(Number); return h * 60 + m; };
const addDias = (iso, n) => { const d = D0(iso); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv-SE"); };
const segunda = iso => { const d = D0(iso), w = (d.getDay() + 6) % 7; return addDias(iso, -w); };
const dataLonga = s => { const t = D0(s).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }); return t.charAt(0).toUpperCase() + t.slice(1); };
const n0 = n => Number(n || 0).toLocaleString("pt-BR");
const fh = min => (Number(min || 0) / 60).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " h";
const pc = (a, b) => b ? Math.round(a / b * 100) + "%" : "0%";
const nk = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const ERROS = { sem_permissao: "Este usuário não tem acesso a esta ação.", sessao_fechada: "Esta sessão não está mais aberta.", sessao_cancelada: "Esta sessão foi cancelada.", sessao_futura: "A chamada só abre no dia da aula.", sessao_aberta: "A chamada já está aberta.", motivo_obrigatorio: "Informe o motivo.", status_invalido: "Situação inválida para esta ação.", capacidade: "Passa da capacidade da sala.", ja_lancado: "Esta pessoa já tem presença lançada. Mude a situação em vez de remover.", sem_convocados: "Convoque alguém antes de fechar a chamada.", dados_invalidos: "Confira os campos: há algo faltando ou inválido.", turma_existente: "Já existe uma turma com esse nome.", equivalencia_desligada: "A regra de equivalência ainda não foi aprovada pela UMC.", regra_conflitante: "Um status não pode concluir a aula e gerar reposição ao mesmo tempo.", nao_convocado: "Esta pessoa não está convocada nesta sessão.", pessoa_inexistente: "Pessoa não encontrada no cadastro da ETV.", aulas_incompletas: "Só faz a prova quem concluiu todas as aulas do nível.", ja_aprovado: "Esta pessoa já foi aprovada na prova deste nível.", data_futura: "A data não pode ser futura.", sem_aprovacao: "O certificado só pode ser entregue a quem foi aprovado na prova do nível.", data_antes_prova: "A entrega do certificado não pode ser antes da aprovação na prova.", tem_certificado: "Exclua o certificado antes de excluir a prova aprovada." };
const msgErro = e => { if (e && e.rede) return "Sem conexão com o servidor. Verifique a internet."; const m = String(e && e.message || ""); if (m.startsWith("pendentes:")) { const n = +m.split(":")[1]; return `${n === 1 ? "Uma pessoa ainda está" : `${n} pessoas ainda estão`} como Pendente. Marque a situação de todos antes de fechar: campo vazio nunca vira falta sozinho.`; } return ERROS[m] || "Não foi possível concluir. Tente novamente."; };
const svg = (d, w = 2.2) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const IC = { check: svg("M5 12.5l4.2 4.2L19 7", 2.8), alerta: svg("M12 8v5M12 16.5v.01M10.3 3.9L2.6 17.3A2 2 0 004.3 20.3h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"), busca: svg("M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4"),
  lapis: svg("M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4zM13.5 6.5l4 4"), seta: svg("M9 6l6 6-6 6"), volta: svg("M15 6l-6 6 6 6"), info: svg("M12 11v5M12 8v.01M12 21a9 9 0 100-18 9 9 0 000 18z"), mais: svg("M12 5v14M5 12h14", 2.6),
  imp: svg("M7 9V3h10v6M7 17H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2M7 14h10v7H7z"), baixa: svg("M12 4v11M7 10l5 5 5-5M5 20h14") };
const MENOS_MOV = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let tempo; const avisa = (m, tipo) => { $aviso.innerHTML = (tipo === "ok" ? IC.check : tipo === "erro" ? IC.alerta : "") + `<span>${esc(m)}</span>`; $aviso.className = "on " + (tipo || ""); $aviso.setAttribute("role", tipo === "erro" ? "alert" : "status"); clearTimeout(tempo); tempo = setTimeout(() => { $aviso.className = ""; }, tipo === "erro" ? 7000 : 3800); };

/* ===== Servidor ===== */
let sess = null;
class ErroRede extends Error { constructor() { super("rede"); this.rede = true; } }
async function chamar(url, op) { let r; try { r = await fetch(url, { ...op, cache: "no-store", referrerPolicy: "no-referrer" }); } catch (e) { throw new ErroRede(); } let j = null; try { j = await r.json(); } catch (e) { } if (!r.ok) { const x = new Error((j && (j.message || j.error_description || j.msg)) || "erro"); x.status = r.status; throw x; } return j; }
const H = t => ({ apikey: CFG.supabaseChavePublica, "Content-Type": "application/json", ...(t ? { Authorization: "Bearer " + t } : {}) });
async function carregaDemo() { if (window.AcademyDemo) return; for (const s of ["demo-dados.js", "demo.js"]) await new Promise((ok, no) => { const e = document.createElement("script"); e.src = s; e.onload = ok; e.onerror = no; document.head.append(e); }); }
async function entrar(email, senha) { if (DEMO) { await carregaDemo(); AcademyDemo.entrar(email); sess = { email }; } else { const j = await chamar(CFG.supabaseUrl + "/auth/v1/token?grant_type=password", { method: "POST", headers: H(), body: JSON.stringify({ email, password: senha }) }); sess = { email, access: j.access_token, refresh: j.refresh_token }; } try { localStorage.setItem("academy_email", email); } catch (e) { } }
async function renova() { const j = await chamar(CFG.supabaseUrl + "/auth/v1/token?grant_type=refresh_token", { method: "POST", headers: H(), body: JSON.stringify({ refresh_token: sess.refresh }) }); sess.access = j.access_token; sess.refresh = j.refresh_token; }
async function rpc(fn, args = {}) {
  if (DEMO) { await carregaDemo(); return AcademyDemo.rpc(fn, args); }
  const faz = () => chamar(`${CFG.supabaseUrl}/rest/v1/rpc/${fn}`, { method: "POST", headers: H(sess && sess.access), body: JSON.stringify(args) });
  try { return await faz(); } catch (e) { if (e.status === 401 && sess && sess.refresh) { await renova(); return faz(); } throw e; }
}
async function sair() { const s = sess; sess = null; perfil = null; B = null; if (DEMO) { if (window.AcademyDemo) AcademyDemo.sair(); } else if (s && s.access) fetch(CFG.supabaseUrl + "/auth/v1/logout", { method: "POST", headers: H(s.access) }).catch(() => { }); }

const FAC = `<span class="facetas" aria-hidden="true"><i></i><i></i><i></i></span>`;
const selo = () => DEMO ? `<span class="selo">DEMONSTRAÇÃO: pessoas fictícias, dados só neste aparelho</span>` : "";
const emailSalvo = () => { try { return localStorage.getItem("academy_email") || ""; } catch (e) { return ""; } };

/* ===== Entrada ===== */
function telaLogin(erro) {
  $app.innerHTML = `${selo()}<div class="login"><div class="login-arte">${FAC}<img class="marca" src="assets/marca/vertical-branco.png" alt="Metrocasa Construtora"><div><h1 aria-label="Mais Metro Academy"><img src="assets/marca/mais-verde.png" alt="">Metro Academy</h1><p>Turmas, chamadas e reposições da Universidade Metrocasa num lugar só.</p></div></div>
  <form id="fl" novalidate><h2>Entrar</h2><p>Acesso da UMC</p>
  <div class="campo"><label for="em">E-mail</label><input id="em" type="email" autocomplete="username" autocapitalize="none" value="${esc(emailSalvo() || (DEMO ? "victoria@demonstracao.local" : ""))}"></div>
  <div class="campo"><label for="se">Senha</label><input id="se" type="password" autocomplete="current-password" ${DEMO ? 'placeholder="Qualquer senha na demonstração"' : ""}></div>
  <button class="btn">Entrar</button><div class="erro" id="er" role="alert">${esc(erro || "")}</div>
  ${DEMO ? `<p class="muted peq demo-dica">Na demonstração, o e-mail define o perfil: <b>victoria@…</b> opera (chamada e sessões), <b>umc@…</b> só consulta, qualquer outro é administrador.</p>` : ""}</form></div>`;
  document.getElementById("fl").onsubmit = async ev => { ev.preventDefault(); const b = ev.target.querySelector("button"), er = document.getElementById("er"), em = document.getElementById("em").value.trim(), se = document.getElementById("se").value; if (!em || !se) { er.textContent = "Informe e-mail e senha."; (em ? document.getElementById("se") : document.getElementById("em")).focus(); return; } ocupa(b, true); er.textContent = ""; try { await entrar(em, se); perfil = await rpc("academy_perfil"); vai("hoje"); } catch (e) { sess = null; er.textContent = e.rede ? msgErro(e) : e.message === "sem_permissao" ? "Este usuário não tem acesso ao Metro Academy." : "E-mail ou senha incorretos. Confira e tente de novo."; ocupa(b, false); } };
}

/* ===== Dados ===== */
let perfil = null, B = null, Bem = 0, rota = "hoje", arg = null, ultRota = null;
const STATUS = ["Pendente", "Presente", "Falta", "Em mesa", "Justificada / afastado", "Desligado", "Não se aplica"];
const PCL = { "Pendente": "pend", "Presente": "pres", "Falta": "falta", "Em mesa": "mesa", "Justificada / afastado": "just", "Desligado": "desl", "Não se aplica": "na" };
const chipP = st => `<span class="chip p-${PCL[st] || "pend"}">${esc(st)}</span>`;
const pode = () => perfil && perfil.papel !== "gestor", admin = () => perfil && perfil.papel === "admin";
const ativo = p => String(p && p.situacao || "").trim().toUpperCase() === "ATIVO";
const grupo = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
function indexa(b) {
  b.C = b.config; b.pes = new Map(b.pessoas.map(p => [p.id, p])); b.ses = new Map(b.sessoes.map(s => [s.id, s])); b.aul = new Map(b.aulas.map(a => [a.id, a])); b.tur = new Map(b.turmas.map(t => [t.id, t]));
  b.porSes = new Map(); b.porPes = new Map(); b.convocacoes.forEach(v => { grupo(b.porSes, v.sessao_id, v); grupo(b.porPes, v.pessoa_id, v); });
  b.conc = new Map(b.conclusoes.map(k => [k.pessoa_id + "|" + k.aula_id, k])); b.repPes = new Map(); b.reposicoes.forEach(r => grupo(b.repPes, r.pessoa_id, r));
  b.nivelAulas = nv => b.aulas.filter(a => a.nivel === nv && a.situacao !== "inativo").sort((x, y) => x.numero - y.numero);
  b.niveis = [...new Set(b.aulas.filter(a => a.situacao !== "inativo").map(a => a.nivel))].sort();
  b.provas = b.provas || []; b.certificados = b.certificados || [];
  b.provPes = new Map(); b.provas.slice().sort((x, y) => x.data < y.data ? -1 : x.data > y.data ? 1 : x.id - y.id).forEach(r => grupo(b.provPes, r.pessoa_id + "|" + r.nivel, r));
  b.cert = new Map(b.certificados.map(c => [c.pessoa_id + "|" + c.nivel, c]));
  return b;
}
async function carregaBase(forca) { if (forca || !B || Date.now() - Bem > 30000) { B = indexa(await rpc("academy_base")); Bem = Date.now(); } }
const ordSes = (a, b) => (a.data + hm(a.inicio)) < (b.data + hm(b.inicio)) ? -1 : (a.data + hm(a.inicio)) > (b.data + hm(b.inicio)) ? 1 : a.id - b.id;
const nomeAula = a => a ? `${a.nivel} · Aula ${a.numero}` : "Aula removida";
const titAula = a => a ? `${nomeAula(a)} · ${a.titulo}` : "Aula removida";
const quem = p => { if (!p) return "Pessoa fora do cadastro"; const ap = String(p.apelido || "").trim(); return ap && nk(ap) !== nk(p.nome) ? `<span class="apel">${esc(ap)}</span> ${esc(p.nome)}` : esc(p.nome); };
const lideranca = p => [p.gerente && `Gerente ${esc(p.gerente)}`, p.superintendente && `Superint. ${esc(p.superintendente)}`, p.diretor && `Diretor ${esc(p.diretor)}`].filter(Boolean).join(" · ") || "Sem gerente na ETV";
const snap = v => [v.gerente, v.superintendente, v.diretoria].filter(Boolean).map(esc).join(" · ") || "Sem gestão registrada";

/* Situação de cada pessoa em cada aula: a mesma leitura na lista, na ficha e na convocação */
const ROT = { concluida: "Concluída", agendada: "Agendada", reposicao: "Reposição", proxima: "Próxima", pendente: "Pendente" };
const SIMB = { concluida: IC.check, reposicao: "!" };
function elegivel(pid, a) { if (B.conc.has(pid + "|" + a.id)) return false; if (!B.C.exige_ordem || a.numero === 1) return true; const ant = B.aulas.find(x => x.nivel === a.nivel && x.numero === a.numero - 1); return !ant || B.conc.has(pid + "|" + ant.id); }
function estado(pid, a) {
  const k = B.conc.get(pid + "|" + a.id); if (k) return { st: "concluida", k, s: B.ses.get(k.sessao_id) };
  const reps = (B.repPes.get(pid) || []).filter(r => r.aula_id === a.id), ag = reps.find(r => r.status === "agendada"), ab = reps.find(r => r.status === "aberta");
  if (ag) return { st: "agendada", r: ag, s: B.ses.get(ag.nova_sessao_id) };
  if (ab) return { st: "reposicao", r: ab };
  const c = (B.porPes.get(pid) || []).map(v => B.ses.get(v.sessao_id)).filter(s => s.aula_id === a.id && s.status === "prevista").sort(ordSes)[0];
  if (c) return { st: "agendada", s: c };
  return { st: elegivel(pid, a) ? "proxima" : "pendente" };
}
/* Prova e certificado do nível: prova só depois de todas as aulas; certificado só depois da aprovação */
const aulasOk = (pid, nv) => { const l = B.nivelAulas(nv); return l.length > 0 && l.every(a => B.conc.has(pid + "|" + a.id)); };
function marcos(pid, nv) {
  const ps = B.provPes.get(pid + "|" + nv) || [], ap = ps.find(r => r.resultado === "aprovado"), ult = ps[ps.length - 1], c = B.cert.get(pid + "|" + nv), nota = r => r.nota != null ? `, nota ${String(r.nota).replace(".", ",")}` : "";
  const prova = ap ? { st: "concluida", txt: `Aprovado em ${dtc(ap.data)}${nota(ap)}`, curto: "aprovado" }
    : ult ? { st: "reposicao", txt: `Reprovado em ${dtc(ult.data)}${nota(ult)}: refazer`, curto: "reprovado, refazer" }
    : aulasOk(pid, nv) ? { st: "proxima", txt: "Pode fazer a prova", curto: "pode fazer" } : { st: "pendente", txt: "Depois de todas as aulas", curto: "depois das aulas" };
  const cert = c ? { st: "concluida", txt: `Entregue em ${dtc(c.data)}`, curto: "entregue" } : ap ? { st: "proxima", txt: "A entregar", curto: "a entregar" } : { st: "pendente", txt: "Depois da aprovação", curto: "depois da prova" };
  return { prova, cert, ap, tentativas: ps, c };
}
function trilha(pid, o = {}) {
  const nv = o.nivel || "N1", aulas = B.nivelAulas(nv), tipo = o.tipo || "mini";
  if (!aulas.length) return `<span class="muted peq">Sem aulas no catálogo</span>`;
  const m = marcos(pid, nv), mk = (e, rot, nome, ant) => `<li class="${e.st} marco${ant ? " feito-antes" : ""}"${tipo === "mini" ? ` title="${esc(nome + ": " + e.curto)}"` : ""}><span class="pt" aria-hidden="true">${SIMB[e.st] || ""}</span>${tipo === "mini" ? `<span class="rt" aria-hidden="true">${rot}</span><span class="sr">${esc(nome + ": " + e.curto)}</span>` : `<div class="info"><b>${nome}</b><span class="st ${e.st}">${esc(e.txt)}</span></div>`}</li>`;
  return `<ol class="trilha ${tipo}" aria-label="${esc(o.rotulo || "Aulas do " + nv)}">${aulas.map((a, i) => { const e = estado(pid, a), ant = i && B.conc.has(pid + "|" + aulas[i - 1].id), txt = `Aula ${a.numero}: ${ROT[e.st].toLowerCase()}`;
    return `<li class="${e.st}${ant ? " feito-antes" : ""}"${tipo === "mini" ? ` title="${esc(txt)}"` : ""}><span class="pt" aria-hidden="true">${SIMB[e.st] || ""}</span>${tipo === "mini" ? `<span class="rt" aria-hidden="true">A${a.numero}</span><span class="sr">${esc(txt)}</span>` : o.info(a, e)}</li>`; }).join("")}${mk(m.prova, "P", "Prova", aulasOk(pid, nv))}${mk(m.cert, "C", "Certificado", !!m.ap)}</ol>`;
}
const legenda = () => `<ul class="legenda" aria-label="Legenda">${Object.keys(ROT).map(s => `<li><span class="trilha" aria-hidden="true"><span class="${s}"><span class="pt">${SIMB[s] || ""}</span></span></span>${ROT[s]}</li>`).join("")}</ul>`;
function stSessao(s) {
  if (s.status === "realizada") return ["ok", "Realizada"]; if (s.status === "cancelada") return ["canc", "Cancelada"];
  if (s.data < B.hoje) return ["atraso", "Chamada aberta"]; if (s.data === B.hoje) return ["hoje", "Hoje"];
  const n = Math.round((D0(s.data) - D0(B.hoje)) / 864e5); return ["", n === 1 ? "Amanhã" : `Em ${n} dias`];
}
const contaSes = s => { const l = B.porSes.get(s.id) || [], c = st => l.filter(v => v.presenca === st).length; return { conv: l.length, pres: l.filter(v => B.C.status_conclui.includes(v.presenca)).length, falta: c("Falta"), pend: c("Pendente"), outros: l.filter(v => !["Pendente", "Falta"].includes(v.presenca) && !B.C.status_conclui.includes(v.presenca)).length }; };

/* ===== Casca: cada seção com sua cor, como no Acompanhamento ===== */
const ABAS = [["hoje", "Hoje"], ["sessoes", "Sessões"], ["consultores", "Consultores"], ["reposicoes", "Reposições"], ["painel", "Painel"], ["relatorios", "Relatórios"], ["catalogo", "Catálogo"]];
const TOM = { hoje: "vermelho", sessoes: "azul", sessao: "azul", consultores: "azul", ficha: "vermelho", reposicoes: "vinho", painel: "verde", relatorios: "vinho", catalogo: "verde" };
const PAI = { sessao: "sessoes", ficha: "consultores" };
function casca(html, o = {}) {
  const nRep = B ? B.reposicoes.filter(r => r.status === "aberta").length : 0, entra = !o.esq && rota !== ultRota; if (!o.esq) ultRota = rota;
  $app.innerHTML = `<div class="rh">${selo()}<header class="banda t-${o.tom || TOM[rota] || "vermelho"}">${FAC}<div class="topo"><img class="marca" src="assets/logos/horizontal-branco.png" alt="Metrocasa Construtora"><span class="produto">Metro Academy</span><nav class="abas" aria-label="Seções">${ABAS.map(([k, t]) => { const on = rota === k || PAI[rota] === k; return `<button data-r="${k}" class="${on ? "on" : ""}"${on ? ' aria-current="page"' : ""}>${t}${k === "reposicoes" && nRep ? `<span class="num">${nRep}<span class="sr"> abertas</span></span>` : ""}</button>`; }).join("")}</nav><div class="eu">${esc(perfil.nome)}<small>${{ admin: "Administrador", operador: "Operação", gestor: "Consulta" }[perfil.papel]}</small></div><button class="sair" data-a="sair">Sair</button></div>
  <div class="cab"><div>${o.voltar || ""}<h1>${o.titulo || (ABAS.find(x => x[0] === rota) || [])[1] || ""}</h1>${o.sub ? `<p class="sub">${o.sub}</p>` : ""}</div>${o.lado ? `<div class="lado">${o.lado}</div>` : ""}</div></header><main class="pag${entra ? " entra" : ""}">${html}</main></div>`;
  larguras(); if (entra && !$modal.innerHTML) focaTit("header h1");
}
const larguras = () => $app.querySelectorAll("[data-w]").forEach(e => { e.style.width = Math.max(0, Math.min(100, +e.dataset.w)) + "%"; });
const carregando = () => casca(`<div class="esq" aria-busy="true" aria-label="Carregando"><div class="k"><i></i><i></i><i></i><i></i></div><i class="l"></i><i class="l"></i><i class="l"></i></div>`, { esq: true });
async function vai(r, a, manter) {
  const y = window.scrollY; rota = r; arg = a ?? null; fechaM(true);
  if (!manter) { window.scrollTo(0, 0); if (!B) carregando(); }
  try { await carregaBase(); desenha(); if (manter) window.scrollTo(0, y); }
  catch (e) { if (e.status === 401 || e.message === "sem_permissao") { await sair(); telaLogin("Sua sessão terminou. Entre novamente."); } else casca(`<div class="painel"><div class="vazio"><b>Não deu para carregar</b>${esc(msgErro(e))}<br><button class="btn sec peq" data-r="${r}">Tentar novamente</button></div></div>`); }
}
const recarrega = async () => { B = null; Bem = 0; await vai(rota, arg, true); };
function desenha() { ({ hoje: vHoje, sessoes: vSessoes, sessao: vSessao, consultores: vCons, ficha: vFicha, reposicoes: vRep, painel: vPainel, relatorios: vRel, catalogo: vCat })[rota](arg); }
const focaTit = sel => { const h = $app.querySelector(sel); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } };
const kpi = (n, txt, alvo, cor, extra) => n ? `<button class="kpi ${cor}" ${alvo}><b>${n}</b><span>${txt}</span>${extra ? `<small>${extra}</small>` : ""}</button>` : `<div class="kpi zero"><b>0</b><span>${txt}</span></div>`;
const op = (l, v, rot) => l.map(x => { const [val, t] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(val)}" ${String(val) === String(v) ? "selected" : ""}>${esc(rot ? rot(t) : t)}</option>`; }).join("");
const unicos = (l, k) => [...new Set(l.map(x => x[k]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));

/* ===== Hoje ===== */
function itemSessao(s) {
  const a = B.aul.get(s.aula_id), t = B.tur.get(s.turma_id), c = contaSes(s), [tom, txt] = stSessao(s), chamada = s.status === "prevista" && s.data <= B.hoje;
  return `<div class="item clicavel" data-s="${s.id}"><div class="tx"><button class="nome" data-s="${s.id}">${esc(titAula(a))}</button><div class="meta">${esc(t ? t.nome : "")} · ${dsem(s.data)}, ${hm(s.inicio)} às ${hm(s.fim)}${s.sala ? " · " + esc(s.sala) : ""}${s.treinador ? " · " + esc(s.treinador) : ""}</div></div>
  <span class="lota" title="Convocados${s.capacidade ? " e capacidade" : ""}"><b>${c.conv}</b>${s.capacidade ? `/${s.capacidade}` : ""} <small>convocados</small></span><span class="prazo ${tom}">${txt}${chamada && c.pend ? ` · ${c.pend} pend.` : ""}</span>
  <div class="acoes"><button class="btn ${chamada ? "" : "sec "}peq" data-s="${s.id}">${chamada ? "Fazer chamada" : "Abrir"}</button></div></div>`;
}
function vHoje() {
  const Hj = B.hoje, hoje = B.sessoes.filter(s => s.data === Hj && s.status !== "cancelada").sort(ordSes), ant = B.sessoes.filter(s => s.status === "prevista" && s.data < Hj).sort(ordSes),
    aFechar = B.sessoes.filter(s => s.status === "prevista" && s.data <= Hj), repAb = B.reposicoes.filter(r => r.status === "aberta"), prox = B.sessoes.filter(s => s.status === "prevista" && s.data > Hj).sort(ordSes).slice(0, 6);
  const agoraMin = new Date().getHours() * 60 + new Date().getMinutes(), proxHoje = hoje.find(s => s.status === "prevista");
  const fala = ant.length ? [`A chamada de ${dtc(ant[0].data)} (${esc(nomeAula(B.aul.get(ant[0].aula_id)))}) ainda está aberta. Feche para atualizar histórico e reposições.`, "atencao"]
    : proxHoje ? [minutos(proxHoje.inicio) <= agoraMin ? `${esc(nomeAula(B.aul.get(proxHoje.aula_id)))} com a ${esc(B.tur.get(proxHoje.turma_id).nome)} já começou. Faça a chamada.` : `Às ${hm(proxHoje.inicio)} tem ${esc(nomeAula(B.aul.get(proxHoje.aula_id)))} com a ${esc(B.tur.get(proxHoje.turma_id).nome)}.`, "dica"]
    : repAb.length ? [`${repAb.length === 1 ? "Uma reposição está" : `${repAb.length} reposições estão`} sem sessão marcada. Agende na aba Reposições.`, "dica"]
    : ["Tudo em dia por aqui!", "comemora"];
  const h = new Date().getHours(), saud = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  casca(`<div class="kpis">${kpi(hoje.length, "Sessões hoje", 'data-ir="s-hoje"', "k-verde")}${kpi(aFechar.length, "Chamadas a fechar", 'data-ir="s-hoje"', "k-verm")}${kpi(repAb.length, "Reposições sem data", 'data-r="reposicoes"', "k-azul")}${kpi(B.sem_id.length, "Ativos sem ID", 'data-a="semid"', "k-branco")}</div>
  ${ant.length ? `<h2><i class="bolinha b-verm"></i>Chamadas abertas de dias anteriores <small>não contam como falta até serem fechadas</small></h2><div class="painel"><div class="lista">${ant.map(itemSessao).join("")}</div></div>` : ""}
  <h2 id="s-hoje"><i class="bolinha b-verde"></i>Sessões de hoje</h2><div class="painel"><div class="lista">${hoje.map(itemSessao).join("") || `<div class="vazio"><b>Nenhuma sessão hoje</b>${pode() ? `<button class="btn peq" data-a="nova-sessao">${IC.mais}Nova sessão</button>` : ""}</div>`}</div></div>
  <h2><i class="bolinha b-azul"></i>Próximas sessões</h2><div class="painel"><div class="lista">${prox.map(itemSessao).join("") || `<div class="vazio"><b>Nada agendado</b>As próximas sessões aparecem aqui.</div>`}</div></div>
  <p class="rodape">Cadastro da ETV sincronizado em ${dthm(B.sync_em)} · ${n0(B.pessoas.filter(ativo).length)} ativos com ID${B.sem_id.length ? ` · <button class="lnk" data-a="semid">${B.sem_id.length} sem ID</button>` : ""}</p>`,
  { titulo: `${saud}, ${esc(String(perfil.nome).split(" ")[0])}`, sub: dataLonga(Hj), lado: `<div class="proximo ${fala[1]}"><b>Próximo passo</b><p>${fala[0]}</p></div>` });
}

/* ===== Sessões ===== */
let fSes = null;
function vSessoes() {
  if (!fSes) fSes = { de: addDias(B.hoje, -14), ate: addDias(B.hoje, 21), aula: "", turma: "", st: "" };
  const aulas = B.aulas.map(a => [a.id, nomeAula(a)]), turmas = B.turmas.map(t => [t.id, t.nome]);
  casca(`<div class="filtros f5"><div class="campo-f"><label for="sd">De</label><input id="sd" type="date" value="${fSes.de}"></div><div class="campo-f"><label for="sa">Até</label><input id="sa" type="date" value="${fSes.ate}"></div><div class="campo-f"><label for="su">Aula</label><select id="su"><option value="">Todas</option>${op(aulas, fSes.aula)}</select></div><div class="campo-f"><label for="st">Turma</label><select id="st"><option value="">Todas</option>${op(turmas, fSes.turma)}</select></div><div class="campo-f"><label for="ss">Situação</label><select id="ss"><option value="">Todas</option>${op([["aberta", "Chamada aberta"], ["prevista", "Prevista"], ["realizada", "Realizada"], ["cancelada", "Cancelada"]], fSes.st)}</select></div></div><p class="contagem" id="ct"></p><div id="tb"></div>`,
  { sub: "Cada linha é uma aula dada a uma turma", lado: pode() ? `<button class="btn claro" data-a="nova-sessao">${IC.mais}Nova sessão</button>` : "" });
  const pinta = () => { const l = B.sessoes.filter(s => (!fSes.de || s.data >= fSes.de) && (!fSes.ate || s.data <= fSes.ate) && (!fSes.aula || s.aula_id === fSes.aula) && (!fSes.turma || String(s.turma_id) === fSes.turma) && (!fSes.st || (fSes.st === "aberta" ? s.status === "prevista" && s.data <= B.hoje : fSes.st === "prevista" ? s.status === "prevista" && s.data > B.hoje : s.status === fSes.st))).sort(ordSes);
    const real = l.filter(s => s.status === "realizada");
    document.getElementById("ct").textContent = `${l.length} ${l.length === 1 ? "sessão" : "sessões"} · ${real.length} realizadas · ${fh(real.reduce((a, s) => a + s.duracao_min, 0))} ministradas`;
    document.getElementById("tb").innerHTML = l.length ? `<div class="tab"><table class="ses"><thead><tr><th>Data</th><th>Horário</th><th>Aula</th><th>Turma</th><th>Treinador</th><th class="n">Convocados</th><th class="n">Presentes</th><th>Situação</th></tr></thead><tbody>${l.map(s => { const c = contaSes(s), [tom, txt] = stSessao(s), a = B.aul.get(s.aula_id); return `<tr class="lk" data-s="${s.id}"><td><button class="nm" data-s="${s.id}">${dsem(s.data)}</button></td><td>${hm(s.inicio)}–${hm(s.fim)}</td><td>${esc(nomeAula(a))}<div class="muted peq">${esc(a ? a.titulo : "")}</div></td><td>${esc((B.tur.get(s.turma_id) || {}).nome)}</td><td>${esc(s.treinador || "")}</td><td class="n">${c.conv}${s.capacidade ? `<span class="muted">/${s.capacidade}</span>` : ""}</td><td class="n">${s.status === "realizada" ? `${c.pres} <span class="muted">${pc(c.pres, c.conv)}</span>` : ""}</td><td><span class="prazo ${tom}">${txt}</span></td></tr>`; }).join("")}</tbody></table></div>` : `<div class="painel"><div class="vazio"><b>Nenhuma sessão nesse filtro</b>Mude o período ou crie uma sessão.</div></div>`; };
  pinta(); [["sd", "de"], ["sa", "ate"], ["su", "aula"], ["st", "turma"], ["ss", "st"]].forEach(([id, k]) => document.getElementById(id).oninput = ev => { fSes[k] = ev.target.value; pinta(); });
}

function vSessao(id) {
  const s = B.ses.get(+id); if (!s) return vai("sessoes");
  const a = B.aul.get(s.aula_id), t = B.tur.get(s.turma_id), c = contaSes(s), l = (B.porSes.get(s.id) || []).map(v => ({ v, p: B.pes.get(v.pessoa_id) })).sort((x, y) => nk(x.p ? x.p.nome : x.v.pessoa_id) < nk(y.p ? y.p.nome : y.v.pessoa_id) ? -1 : 1);
  const chamada = pode() && s.status === "prevista" && s.data <= B.hoje, futura = s.status === "prevista" && s.data > B.hoje, [tom, txt] = stSessao(s);
  const nota = s.status === "cancelada" ? `Sessão cancelada: ${esc(s.motivo_cancelamento)}. Não conta hora nem conclusão.`
    : s.status === "realizada" ? `Chamada fechada em ${dthm(s.fechada_em)} por ${esc(s.fechada_por)}. Duração registrada: ${fh(s.duracao_min)}. Correções pedem motivo e ficam registradas.`
    : futura ? "A chamada abre no dia da aula. Até lá dá para convocar e remover pessoas."
    : "Chamada aberta: quem está como Pendente não conta como falta. Ao encerrar, o histórico de cada pessoa e as reposições se atualizam sozinhos.";
  const linha = ({ v, p }) => { const mud = p && v.gerente && p.gerente !== v.gerente, outro = !["Pendente", "Presente", "Falta"].includes(v.presenca);
    let ac;
    if (chamada) ac = `<div class="seg" role="group" aria-label="Presença de ${esc(p ? p.nome : v.pessoa_id)}"><button class="${v.presenca === "Presente" ? "on p-ok" : ""}" data-m="${s.id}|${v.pessoa_id}|Presente" aria-pressed="${v.presenca === "Presente"}">${IC.check}Presente</button><button class="${v.presenca === "Falta" ? "on p-falta" : ""}" data-m="${s.id}|${v.pessoa_id}|Falta" aria-pressed="${v.presenca === "Falta"}">Falta</button><button class="${outro ? "on p-outro" : ""}" data-ou="${s.id}|${v.pessoa_id}">${outro ? esc(v.presenca) : "Outro…"}</button><button class="ob" data-ou="${s.id}|${v.pessoa_id}" aria-label="Motivo e observação">${IC.lapis}</button></div>`;
    else if (futura) ac = `<div class="acoes"><span class="chip p-pend">Convocado</span>${pode() ? `<button class="btn txt peq" data-rm="${s.id}|${v.pessoa_id}">Remover</button>` : ""}</div>`;
    else ac = `<div class="acoes">${chipP(v.presenca)}${pode() && s.status === "realizada" ? `<button class="btn txt peq" data-ou="${s.id}|${v.pessoa_id}">Corrigir</button>` : ""}</div>`;
    return `<div class="item cham"><div class="tx"><button class="nome" data-p="${esc(v.pessoa_id)}">${quem(p)}</button><div class="meta">${esc(v.pessoa_id)} · ${snap(v)}${mud ? ` <span class="chip p-mesa">Gestão mudou: hoje ${esc(p.gerente)}</span>` : ""}${p && !ativo(p) ? ` <span class="chip p-desl">${esc(p.situacao || "Inativo")} na ETV</span>` : ""}${v.situacao_convocacao === "reposicao" ? ` <span class="chip p-just">Reposição</span>` : ""}</div>${v.motivo || v.obs ? `<div class="meta mot">${esc([v.motivo, v.obs].filter(Boolean).join(" · "))}</div>` : ""}</div>${ac}</div>`; };
  const lado = `<div class="bts-cab">${s.status === "prevista" && pode() ? `<button class="btn claro peq" data-a="convocar">${IC.mais}Convocar</button><button class="btn sec-claro peq" data-a="editar-sessao">Editar</button>` : ""}${chamada ? `<button class="btn peq" data-a="fechar">Encerrar chamada</button>` : ""}${s.status === "prevista" && pode() ? `<button class="btn txt-claro peq" data-a="cancelar-sessao">Cancelar sessão</button>` : ""}${s.status === "realizada" && pode() ? `<button class="btn txt-claro peq" data-a="reabrir">Reabrir chamada</button>` : ""}</div>`;
  casca(`<div class="kpis">${kpi(c.conv, s.capacidade ? `Convocados de ${s.capacidade} lugares` : "Convocados", "", "k-azul")}${kpi(c.pres, "Presentes", "", "k-verde", c.conv ? pc(c.pres, c.conv) : "")}${kpi(c.falta, "Faltas", "", "k-verm", c.conv ? pc(c.falta, c.conv) : "")}${kpi(c.pend, s.status === "realizada" ? "Pendentes" : "Sem lançamento", "", "k-branco")}</div>
  <p class="nota ${s.status === "prevista" && !futura ? "aberta" : ""}">${IC.info}<span>${nota}</span></p>
  <h2><i class="bolinha b-verde"></i>${futura ? "Convocados" : "Chamada"} ${c.outros ? `<small>${c.outros} com outra situação</small>` : ""}${chamada && c.pend ? `<button class="btn sec peq dir" data-a="todos-presentes">Marcar ${c.pend} pendentes como presentes</button>` : ""}</h2>
  <div class="painel"><div class="lista">${l.map(linha).join("") || `<div class="vazio"><b>Ninguém convocado ainda</b>${s.status === "prevista" && pode() ? `<button class="btn peq" data-a="convocar">${IC.mais}Convocar pessoas</button>` : ""}</div>`}</div></div>`,
  { titulo: esc(titAula(a)), voltar: `<button class="voltar" data-r="sessoes">${IC.volta}Sessões</button>`, sub: `${esc(t ? t.nome : "")} · ${dataLonga(s.data)}, ${hm(s.inicio)} às ${hm(s.fim)}<br>${esc(s.sala || "Sala não informada")}${s.treinador ? " · Treinador: " + esc(s.treinador) : ""} · <span class="tag-st ${tom}">${txt}</span>`, lado });
}

/* ===== Consultores (matriz pessoa × aula) ===== */
let fCons = { t: "", d: "", u: "", g: "", s: "", n: "N1" }, limite = 150;
function vCons() {
  const P = B.pessoas.filter(ativo);
  casca(`<div class="filtros f6"><div class="bus">${IC.busca}<input id="ft" type="search" placeholder="Buscar por nome, apelido ou ID" aria-label="Buscar" value="${esc(fCons.t)}"></div><select id="fd" aria-label="Diretor"><option value="">Todos os diretores</option>${op(unicos(P, "diretor"), fCons.d)}</select><select id="fu" aria-label="Superintendente"><option value="">Todos os superint.</option>${op(unicos(P, "superintendente"), fCons.u)}</select><select id="fg" aria-label="Gerente"><option value="">Todos os gerentes</option>${op(unicos(P, "gerente"), fCons.g)}</select><select id="fn" aria-label="Nível">${op(B.niveis.length ? B.niveis : ["N1"], fCons.n)}</select><select id="fs" aria-label="Situação no nível"><option value="">Todas as situações</option>${op([["sem1", "Sem a Aula 1"], ["1sem2", "Aula 1 feita, Aula 2 não"], ["repo", "Com reposição"], ["completo", "Todas as aulas feitas"], ["apto", "Pode fazer a prova"], ["reprov", "Reprovado, refazer prova"], ["acert", "Certificado a entregar"], ["cert", "Com certificado"]], fCons.s)}</select></div><p class="contagem" id="ct" aria-live="polite"></p>${legenda()}<div id="tb"></div>`,
  { sub: "Consultores e coordenadores ativos na ETV, com o andamento em cada aula, na prova e no certificado", lado: pode() ? `<button class="btn sec peq" data-a="prova">Lançar prova</button><button class="btn sec peq" data-a="certificado">Entregar certificados</button>` : "" });
  const pinta = () => { const t = nk(fCons.t), aulas = B.nivelAulas(fCons.n), a1 = aulas[0], a2 = aulas[1], cc = (p, a) => a && B.conc.has(p.id + "|" + a.id), comp = p => aulas.length && aulas.every(a => cc(p, a));
    let l = P.filter(p => (!t || nk(p.nome + " " + p.apelido + " " + p.id).includes(t)) && (!fCons.d || p.diretor === fCons.d) && (!fCons.u || p.superintendente === fCons.u) && (!fCons.g || p.gerente === fCons.g)
      && (!fCons.s || (fCons.s === "sem1" ? !cc(p, a1) : fCons.s === "1sem2" ? cc(p, a1) && !cc(p, a2) : ["apto", "reprov", "acert", "cert"].includes(fCons.s) ? (m => fCons.s === "apto" ? m.prova.st === "proxima" : fCons.s === "reprov" ? m.prova.st === "reposicao" : fCons.s === "acert" ? m.cert.st === "proxima" : !!m.c)(marcos(p.id, fCons.n)) : fCons.s === "repo" ? (B.repPes.get(p.id) || []).some(r => ["aberta", "agendada"].includes(r.status) && B.aul.get(r.aula_id).nivel === fCons.n) : comp(p))));
    const nComp = l.filter(comp).length, nCert = l.filter(p => B.cert.has(p.id + "|" + fCons.n)).length;
    document.getElementById("ct").textContent = `${n0(l.length)} ${l.length === 1 ? "pessoa" : "pessoas"}${l.length !== P.length ? ` de ${n0(P.length)}` : ""} · todas as aulas do ${fCons.n}: ${n0(nComp)} (${pc(nComp, l.length)}) · certificado: ${n0(nCert)} (${pc(nCert, l.length)})${l.length > limite ? ` · mostrando ${limite}` : ""}`;
    const todos = l; l = l.slice(0, limite);
    document.getElementById("tb").innerHTML = l.length ? `<div class="tab"><table class="cons"><thead><tr><th>Pessoa</th><th>Gerente</th><th>Superint.</th><th>Diretor</th><th>${esc(fCons.n)}: ${aulas.map(a => "A" + a.numero).join(", ")}, P (prova), C (certificado)</th><th class="n">Aulas</th></tr></thead><tbody>${l.map(p => { const n = aulas.filter(a => cc(p, a)).length; return `<tr class="lk" data-p="${esc(p.id)}"><td><button class="nm" data-p="${esc(p.id)}">${quem(p)}</button><div class="muted peq">${esc(p.id)} · ${esc(p.funcao || "")}</div></td><td>${esc(p.gerente)}</td><td>${esc(p.superintendente)}</td><td>${esc(p.diretor)}</td><td>${trilha(p.id, { nivel: fCons.n })}</td><td class="n"><b>${n}</b>/${aulas.length}</td></tr>`; }).join("")}</tbody></table></div>${todos.length > limite ? `<div class="mt"><button class="btn sec" data-a="mais">Mostrar mais ${Math.min(150, todos.length - limite)}</button></div>` : ""}`
      : `<div class="painel"><div class="vazio"><b>Ninguém encontrado</b>Tente outro nome ou limpe os filtros.<br><button class="btn sec peq" data-a="limpa">Limpar filtros</button></div></div>`; };
  pintaCons = pinta; limite = 150; pinta();
  [["ft", "t"], ["fd", "d"], ["fu", "u"], ["fg", "g"], ["fn", "n"], ["fs", "s"]].forEach(([id, k]) => document.getElementById(id).oninput = ev => { fCons[k] = ev.target.value; limite = 150; pinta(); });
}
let pintaCons = null;

function vFicha(pid) {
  const p = B.pes.get(pid); if (!p) return vai("consultores");
  const hist = (B.porPes.get(pid) || []).map(v => ({ v, s: B.ses.get(v.sessao_id) })).sort((x, y) => ordSes(y.s, x.s)), reps = (B.repPes.get(pid) || []).slice().sort((x, y) => y.id - x.id);
  const info = (a, e) => { const st = e.st === "concluida" ? (e.k.criterio === "equivalencia" ? "Por equivalência" : `Concluída em ${dtc(e.s && e.s.data)}`) : e.st === "agendada" ? `Agendada para ${dtc(e.s && e.s.data)}` : e.st === "reposicao" ? "Precisa de reposição" : e.st === "proxima" ? "Pode ser convocado" : B.C.exige_ordem ? "Depois da aula anterior" : "Pendente";
    return `<div class="info"><b>Aula ${a.numero}</b><span class="st ${e.st}">${st}</span><span class="st peq">${esc(a.titulo)}</span>${admin() && B.C.permite_equivalencia && e.st !== "concluida" ? `<div class="acs"><button class="btn txt peq" data-eq="${esc(pid)}|${a.id}">Equivalência</button></div>` : ""}</div>`; };
  const nvs = B.niveis.filter(n => n === "N1" || hist.some(x => B.aul.get(x.s.aula_id).nivel === n) || B.provPes.has(pid + "|" + n) || B.cert.has(pid + "|" + n));
  const marcosLin = nvs.flatMap(n => { const m = marcos(pid, n); return [...m.tentativas.map(r => ({ data: r.data, html: `<tr><td>${dt(r.data)}</td><td>${n}</td><td>Prova</td><td><span class="chip ${r.resultado === "aprovado" ? "p-pres" : "p-falta"}">${r.resultado === "aprovado" ? "Aprovado" : "Reprovado"}</span>${r.nota != null ? ` <span class="muted">nota ${String(r.nota).replace(".", ",")}</span>` : ""}</td><td>${esc(r.registrado_por || "")}${r.obs ? `<div class="muted peq">${esc(r.obs)}</div>` : ""}</td>${pode() ? `<td><button class="btn txt peq" data-xp="${r.id}">Excluir</button></td>` : ""}</tr>` })),
    ...(m.c ? [{ data: m.c.data, html: `<tr><td>${dt(m.c.data)}</td><td>${n}</td><td>Certificado</td><td><span class="chip p-pres">Entregue</span></td><td>${esc(m.c.registrado_por || "")}</td>${pode() ? `<td><button class="btn txt peq" data-xc="${esc(pid)}|${n}">Excluir</button></td>` : ""}</tr>` }] : [])]; }).sort((x, y) => x.data < y.data ? 1 : -1);
  casca(`${nvs.map(n => `<div class="jornada"><p class="niv">${n}</p>${trilha(pid, { tipo: "grande", nivel: n, info })}</div>`).join("")}
  <h2><i class="bolinha b-verm"></i>Histórico de convocações <small>${hist.length} ${hist.length === 1 ? "registro" : "registros"}</small></h2>
  ${hist.length ? `<div class="tab"><table><thead><tr><th>Data</th><th>Aula</th><th>Turma</th><th>Situação</th><th>Motivo e observação</th><th>Gestão na data da aula</th></tr></thead><tbody>${hist.map(({ v, s }) => `<tr class="lk" data-s="${s.id}"><td>${dsem(s.data)}<div class="muted peq">${hm(s.inicio)}</div></td><td>${esc(nomeAula(B.aul.get(s.aula_id)))}</td><td>${esc((B.tur.get(s.turma_id) || {}).nome)}</td><td>${s.status === "cancelada" ? `<span class="chip p-na">Sessão cancelada</span>` : s.status === "prevista" && s.data > B.hoje ? `<span class="chip p-pend">Convocado</span>` : chipP(v.presenca) + (s.status === "prevista" ? ` <span class="muted peq">chamada aberta</span>` : "")}</td><td>${esc([v.motivo, v.obs].filter(Boolean).join(" · "))}</td><td class="${v.gerente && v.gerente !== p.gerente ? "dif" : ""}">${snap(v)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="painel"><div class="vazio"><b>Ainda sem convocações</b>Quando for convocado para uma sessão, aparece aqui.</div></div>`}
  ${marcosLin.length ? `<h2><i class="bolinha b-verde"></i>Provas e certificados</h2><div class="tab"><table><thead><tr><th>Data</th><th>Nível</th><th>Etapa</th><th>Resultado</th><th>Lançado por</th>${pode() ? "<th></th>" : ""}</tr></thead><tbody>${marcosLin.map(x => x.html).join("")}</tbody></table></div>` : ""}
  ${reps.length ? `<h2><i class="bolinha b-azul"></i>Reposições</h2><div class="painel"><div class="lista">${reps.map(itemRep).join("")}</div></div>` : ""}
  ${admin() && !B.C.permite_equivalencia ? `<p class="nota">${IC.info}<span>Equivalência (conclusão sem presença) fica desligada até a UMC aprovar a regra. Liga em Catálogo › Regras.</span></p>` : ""}`,
  { titulo: quem(p), voltar: `<button class="voltar" data-r="consultores">${IC.volta}Consultores</button>`, sub: `ID ${esc(p.id)} · ${esc(p.funcao || "")} · ${esc(p.situacao || "")}<br>${lideranca(p)}` });
}

/* ===== Reposições ===== */
const RST = { aberta: "Sem data", agendada: "Agendada", concluida: "Concluída", nao_compareceu: "Faltou de novo", encerrada: "Encerrada", cancelada: "Cancelada" };
const RCL = { aberta: "atraso", agendada: "andamento", concluida: "ok", nao_compareceu: "canc", encerrada: "canc", cancelada: "canc" };
function itemRep(r) {
  const p = B.pes.get(r.pessoa_id), a = B.aul.get(r.aula_id), o = B.ses.get(r.origem_sessao_id), n = r.nova_sessao_id && B.ses.get(r.nova_sessao_id);
  const ac = !pode() ? "" : r.status === "aberta" ? `<button class="btn peq" data-ag="${r.id}">Agendar</button><button class="btn txt peq" data-cr="${r.id}">Cancelar</button>` : r.status === "cancelada" ? `<button class="btn txt peq" data-ra="${r.id}">Reativar</button>` : "";
  return `<div class="item rep"><div class="tx"><button class="nome" data-p="${esc(r.pessoa_id)}">${quem(p)}</button><div class="meta">${esc(titAula(a))}</div><div class="meta">${esc(r.origem_presenca || "Falta")} em ${dtc(o && o.data)} (${esc((B.tur.get(o && o.turma_id) || {}).nome || "")})${n ? ` · ${r.status === "concluida" ? "concluiu" : r.status === "agendada" ? "nova sessão" : "tentativa"} em ${dtc(n.data)}` : ""}${r.motivo ? " · " + esc(r.motivo) : ""}</div><div class="meta">${p ? lideranca(p) : ""}</div></div><span class="prazo ${RCL[r.status]}">${RST[r.status]}</span><div class="acoes">${ac}</div></div>`;
}
let fRep = { st: "aberta", aula: "", t: "" };
function vRep() {
  const cont = st => B.reposicoes.filter(r => r.status === st).length;
  casca(`<div class="chips-f" role="tablist">${Object.keys(RST).map(k => `<button role="tab" aria-selected="${fRep.st === k}" class="${fRep.st === k ? "on" : ""}" data-fr="${k}">${RST[k]} <b>${cont(k)}</b></button>`).join("")}</div>
  <div class="filtros f2"><div class="bus">${IC.busca}<input id="rt" type="search" placeholder="Buscar pessoa" aria-label="Buscar pessoa" value="${esc(fRep.t)}"></div><select id="ra" aria-label="Aula"><option value="">Todas as aulas</option>${op(B.aulas.map(a => [a.id, titAula(a)]), fRep.aula)}</select></div><div id="tb"></div>`,
  { sub: "Cada falta numa chamada fechada vira uma pendência; ela some quando a pessoa conclui a aula" });
  const pinta = () => { const t = nk(fRep.t), l = B.reposicoes.filter(r => r.status === fRep.st && (!fRep.aula || r.aula_id === fRep.aula) && (!t || nk((B.pes.get(r.pessoa_id) || {}).nome + " " + r.pessoa_id).includes(t))).sort((x, y) => (B.ses.get(x.origem_sessao_id).data < B.ses.get(y.origem_sessao_id).data ? -1 : 1));
    document.getElementById("tb").innerHTML = `<div class="painel"><div class="lista">${l.map(itemRep).join("") || `<div class="vazio"><b>Nada aqui</b>${fRep.st === "aberta" ? "Nenhuma reposição esperando data." : "Nenhuma reposição nessa situação."}</div>`}</div></div>`; };
  pinta(); document.getElementById("rt").oninput = ev => { fRep.t = ev.target.value; pinta(); }; document.getElementById("ra").oninput = ev => { fRep.aula = ev.target.value; pinta(); };
}

/* ===== Indicadores (mesma conta no painel e nos relatórios) ===== */
function indicadores(f) {
  const C = B.C, ss = B.sessoes.filter(s => (!f.de || s.data >= f.de) && (!f.ate || s.data <= f.ate) && (!f.nivel || (B.aul.get(s.aula_id) || {}).nivel === f.nivel) && (!f.aula || s.aula_id === f.aula));
  const real = ss.filter(s => s.status === "realizada"), plan = ss.filter(s => s.status !== "cancelada"), ids = new Set(plan.map(s => s.id));
  const conv = B.convocacoes.filter(v => ids.has(v.sessao_id) && (!f.d || v.diretoria === f.d) && (!f.u || v.superintendente === f.u) && (!f.g || v.gerente === f.g));
  const fech = conv.filter(v => B.ses.get(v.sessao_id).status === "realizada"), abertas = conv.filter(v => { const s = B.ses.get(v.sessao_id); return s.status === "prevista" && s.data <= B.hoje; });
  const pres = fech.filter(v => C.status_conclui.includes(v.presenca)), fora = fech.filter(v => C.status_fora_denominador.includes(v.presenca)).length, den = fech.length - fora;
  return { ss, real, plan, canc: ss.length - plan.length, turmas: new Set(real.map(s => s.turma_id)).size, horasMin: real.reduce((a, s) => a + (s.duracao_min || 0), 0),
    conv, fech, abertas, pres, unicos: new Set(pres.map(v => v.pessoa_id)).size, faltas: fech.filter(v => v.presenca === "Falta").length, fora, den, adesao: den ? pres.length / den : 0,
    porStatus: STATUS.filter(s => s !== "Pendente").map(s => [s, fech.filter(v => v.presenca === s).length]) };
}
const regraTxt = I => `Adesão = presenças (${B.C.status_conclui.join(", ")}) ÷ convocações em chamadas fechadas, sem ${B.C.status_fora_denominador.join(" e ")} (${I.fora} fora da conta). Denominador: ${n0(I.den)}.${I.abertas.length ? ` ${n0(I.abertas.length)} convocações em chamadas ainda abertas não entram.` : ""}`;

/* ===== Painel ===== */
let fPai = null;
function vPainel() {
  if (!fPai) fPai = { de: B.hoje.slice(0, 8) + "01", ate: B.hoje, nivel: "", aula: "", d: "", u: "", g: "", por: "diretoria" };
  const conv = B.convocacoes, I = indicadores(fPai);
  const nAt = B.pessoas.filter(ativo), a1 = B.nivelAulas("N1")[0], a2 = B.nivelAulas("N1")[1], cc = (p, a) => a && B.conc.has(p.id + "|" + a.id);
  const sem1 = nAt.filter(p => !cc(p, a1)).length, so1 = nAt.filter(p => cc(p, a1) && !cc(p, a2)).length;
  const aulas = B.aulas.filter(a => a.situacao !== "inativo" && (!fPai.nivel || a.nivel === fPai.nivel) && (!fPai.aula || a.id === fPai.aula));
  const linhasAula = aulas.map(a => { const Ia = indicadores({ ...fPai, aula: a.id }), conc = nAt.filter(p => cc(p, a)).length, rep = B.reposicoes.filter(r => r.aula_id === a.id && ["aberta", "agendada"].includes(r.status)).length; return { a, Ia, conc, rep }; });
  const chave = { diretoria: "diretoria", superintendente: "superintendente", gerente: "gerente", nivel: "nivel" }[fPai.por], grupos = new Map();
  I.fech.forEach(v => { const k = chave === "nivel" ? B.aul.get(B.ses.get(v.sessao_id).aula_id).nivel : v[chave] || "(sem registro)"; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(v); });
  const gl = [...grupos].map(([k, l]) => { const p = l.filter(v => B.C.status_conclui.includes(v.presenca)).length, f = l.filter(v => v.presenca === "Falta").length, fo = l.filter(v => B.C.status_fora_denominador.includes(v.presenca)).length; return { k, n: l.length, p, f, o: l.length - p - f, ad: l.length - fo ? p / (l.length - fo) : 0, den: l.length - fo }; }).sort((x, y) => y.n - x.n);
  const maxG = Math.max(1, ...gl.map(g => g.n));
  casca(`<div class="filtros f7"><div class="campo-f"><label for="pd">De</label><input id="pd" type="date" value="${fPai.de}"></div><div class="campo-f"><label for="pa">Até</label><input id="pa" type="date" value="${fPai.ate}"></div><div class="campo-f"><label for="pn">Nível</label><select id="pn"><option value="">Todos</option>${op(B.niveis, fPai.nivel)}</select></div><div class="campo-f"><label for="pl">Aula</label><select id="pl"><option value="">Todas</option>${op(B.aulas.map(a => [a.id, nomeAula(a)]), fPai.aula)}</select></div><div class="campo-f"><label for="pi">Diretoria</label><select id="pi"><option value="">Todas</option>${op(unicos(conv, "diretoria"), fPai.d)}</select></div><div class="campo-f"><label for="pu">Superint.</label><select id="pu"><option value="">Todas</option>${op(unicos(conv, "superintendente"), fPai.u)}</select></div><div class="campo-f"><label for="pg">Gerente</label><select id="pg"><option value="">Todos</option>${op(unicos(conv, "gerente"), fPai.g)}</select></div></div>
  <h2><i class="bolinha b-verde"></i>Visão executiva <small>${dt(fPai.de)} a ${dt(fPai.ate)}</small></h2>
  <div class="kpis k8"><div class="kpi k-branco"><b>${I.turmas}</b><span>Turmas distintas</span></div><div class="kpi k-branco"><b>${I.real.length}</b><span>Sessões realizadas</span><small>de ${I.plan.length} planejadas${I.canc ? ` · ${I.canc} canceladas` : ""}</small></div><div class="kpi k-branco"><b>${fh(I.horasMin)}</b><span>Horas ministradas</span><small>cada sessão contada uma vez</small></div><div class="kpi k-verde"><b>${n0(I.unicos)}</b><span>Pessoas únicas treinadas</span></div>
  <div class="kpi k-branco"><b>${n0(I.conv.length)}</b><span>Convocações</span><small>${n0(I.fech.length)} em chamadas fechadas</small></div><div class="kpi k-branco"><b>${n0(I.pres.length)}</b><span>Presenças</span><small>${pc(I.pres.length, I.fech.length)} das fechadas</small></div><div class="kpi k-branco"><b>${n0(I.faltas)}</b><span>Faltas</span><small>${pc(I.faltas, I.fech.length)} das fechadas</small></div><div class="kpi k-verm"><b>${pc(I.pres.length, I.den)}</b><span>Taxa de adesão</span><small>${n0(I.pres.length)} de ${n0(I.den)}</small></div></div>
  <p class="nota">${IC.info}<span>${regraTxt(I)} Sessões e horas não mudam com os filtros de liderança; convocações e presenças usam a gestão gravada na data da aula.</span></p>
  <div class="duas"><div><h2><i class="bolinha b-azul"></i>Situação nas chamadas fechadas</h2><div class="tab"><table class="comp"><thead><tr><th>Situação</th><th class="n">Qtd</th><th class="n">%</th><th></th></tr></thead><tbody>${I.porStatus.map(([s, n]) => `<tr><td>${chipP(s)}</td><td class="n">${n0(n)}</td><td class="n">${pc(n, I.fech.length)}</td><td class="bar"><span class="bh"><i data-w="${I.fech.length ? n / I.fech.length * 100 : 0}"></i></span></td></tr>`).join("")}<tr class="tot"><td>Total</td><td class="n">${n0(I.fech.length)}</td><td class="n">100%</td><td></td></tr></tbody></table></div></div>
  <div><h2><i class="bolinha b-verm"></i>Pendências do N1 <small>ativos hoje</small></h2><div class="kpis k2"><button class="kpi k-branco" data-cf="sem1"><b>${n0(sem1)}</b><span>Sem a Aula 1</span><small>${pc(sem1, nAt.length)} dos ${n0(nAt.length)} ativos</small></button><button class="kpi k-branco" data-cf="1sem2"><b>${n0(so1)}</b><span>Aula 1 feita, Aula 2 não</span><small>${pc(so1, nAt.length)} dos ativos</small></button></div></div></div>
  <h2><i class="bolinha b-verde"></i>Gestão de aprendizagem</h2><div class="tab"><table class="comp"><thead><tr><th>Aula</th><th class="n">Sessões realizadas</th><th class="n">Horas</th><th class="n">Convocações</th><th class="n">Presenças</th><th class="n">Ativos que concluíram</th><th class="n">Reposições em aberto</th></tr></thead><tbody>${linhasAula.map(({ a, Ia, conc, rep }) => `<tr><td><b>${esc(nomeAula(a))}</b><div class="muted peq">${esc(a.titulo)}</div></td><td class="n">${Ia.real.length}</td><td class="n">${fh(Ia.horasMin)}</td><td class="n">${n0(Ia.conv.length)}</td><td class="n">${n0(Ia.pres.length)} <span class="muted">${pc(Ia.pres.length, Ia.den)}</span></td><td class="n">${n0(conc)} <span class="muted">${pc(conc, nAt.length)}</span></td><td class="n">${n0(rep)}</td></tr>`).join("")}</tbody></table></div>
  <h2><i class="bolinha b-azul"></i>Gestão comercial <select id="pp" class="sel-h" aria-label="Agrupar por">${op([["diretoria", "por diretoria"], ["superintendente", "por superintendência"], ["gerente", "por gerente"], ["nivel", "por nível"]], fPai.por)}</select></h2>
  <div class="tab"><table class="comp"><thead><tr><th>${{ diretoria: "Diretoria", superintendente: "Superintendência", gerente: "Gerente", nivel: "Nível" }[fPai.por]}</th><th class="n">Convocações</th><th class="n">Presenças</th><th class="n">Faltas</th><th class="n">Outras</th><th class="n">Adesão</th><th></th></tr></thead><tbody>${gl.map(g => `<tr><td>${esc(g.k)}</td><td class="n">${n0(g.n)} <span class="muted">${pc(g.n, I.fech.length)}</span></td><td class="n">${n0(g.p)}</td><td class="n">${n0(g.f)}</td><td class="n">${n0(g.o)}</td><td class="n"><b>${pc(g.p, g.den)}</b></td><td class="bar"><span class="bh"><i data-w="${g.n / maxG * 100}"></i></span></td></tr>`).join("") || `<tr><td colspan="7" class="muted">Sem chamadas fechadas no filtro.</td></tr>`}</tbody></table></div>`,
  { sub: "Indicadores calculados direto das chamadas, sem planilha paralela" });
  [["pd", "de"], ["pa", "ate"], ["pn", "nivel"], ["pl", "aula"], ["pi", "d"], ["pu", "u"], ["pg", "g"], ["pp", "por"]].forEach(([id, k]) => document.getElementById(id).oninput = ev => { fPai[k] = ev.target.value; vai("painel", null, true); });
}

/* ===== Relatórios: folha A4 no padrão executivo, imprimível e exportável ===== */
let fRel = null;
function vRel() {
  if (!fRel) fRel = { tipo: "diario", dia: B.hoje, semana: segunda(B.hoje) };
  const ini = fRel.tipo === "diario" ? fRel.dia : fRel.semana, fim = fRel.tipo === "diario" ? fRel.dia : addDias(fRel.semana, 6);
  casca(`<div class="filtros f3 nao-imprime"><div class="campo-f"><label for="rt">Relatório</label><select id="rt">${op([["diario", "Diário"], ["semanal", "Semanal"]], fRel.tipo)}</select></div><div class="campo-f"><label for="rd">${fRel.tipo === "diario" ? "Dia" : "Qualquer dia da semana"}</label><input id="rd" type="date" value="${ini}"></div><div class="campo-f bts-rel"><button class="btn peq" data-a="imprimir">${IC.imp}Imprimir ou salvar PDF</button><button class="btn sec peq" data-a="csv">${IC.baixa}CSV das chamadas</button></div></div>
  <div class="folha">${fRel.tipo === "diario" ? relDiario(ini) : relSemanal(ini, fim)}</div>`,
  { sub: "Gerados das chamadas registradas; não é preciso montar planilha" });
  document.getElementById("rt").oninput = ev => { fRel.tipo = ev.target.value; vai("relatorios", null, true); };
  document.getElementById("rd").oninput = ev => { if (!ev.target.value) return; if (fRel.tipo === "diario") fRel.dia = ev.target.value; else fRel.semana = segunda(ev.target.value); vai("relatorios", null, true); };
}
const cabRel = (tit, sub) => `<header class="f-cab"><img src="assets/logos/vertical.png" alt="Metrocasa"><div><span class="area">UNIVERSIDADE METROCASA · METRO ACADEMY</span><span class="area">OPERAÇÕES — PEDRO AQUINO</span></div></header><h1 class="f-tit">${tit}</h1><p class="f-sub">${sub}</p>`;
const kRel = l => `<div class="f-kpis">${l.map(([n, r, c]) => `<div><b>${n}</b><span>${r}</span>${c ? `<small>${c}</small>` : ""}</div>`).join("")}</div>`;
const rodRel = I => `<footer class="f-rod"><b>Metodologia.</b> ${esc(regraTxt(I))} Horas = duração real de cada sessão realizada, contada uma vez. Sessões canceladas ou só previstas não geram horas nem conclusão. Gestão = a gravada na convocação. Gerado em ${dthm(new Date().toISOString())}${DEMO ? " · DADOS FICTÍCIOS DE DEMONSTRAÇÃO" : ""}.</footer>`;
function tabSessoes(ss) {
  if (!ss.length) return `<p class="f-vazio">Nenhuma sessão no período.</p>`;
  let T = { conv: 0, pres: 0, falta: 0, outros: 0, pend: 0, min: 0 };
  const lin = ss.map(s => { const c = contaSes(s), a = B.aul.get(s.aula_id); const ok = s.status === "realizada"; if (s.status !== "cancelada") { T.conv += c.conv; T.pres += ok ? c.pres : 0; T.falta += ok ? c.falta : 0; T.outros += ok ? c.outros : 0; T.pend += ok ? 0 : c.conv; T.min += ok ? s.duracao_min : 0; }
    return `<tr><td>${dsem(s.data)}<br>${hm(s.inicio)}</td><td>${esc(nomeAula(a))}</td><td>${esc((B.tur.get(s.turma_id) || {}).nome)}</td><td>${esc(s.treinador || "")}</td><td>${{ realizada: "Realizada", cancelada: "Cancelada", prevista: s.data <= B.hoje ? "Chamada aberta" : "Prevista" }[s.status]}</td><td class="n">${c.conv}</td><td class="n">${ok ? `${c.pres} <i>${pc(c.pres, c.conv)}</i>` : 0}</td><td class="n">${ok ? `${c.falta} <i>${pc(c.falta, c.conv)}</i>` : 0}</td><td class="n">${ok ? c.outros : 0}</td><td class="n">${ok ? 0 : s.status === "cancelada" ? 0 : c.conv}</td><td class="n">${ok ? fh(s.duracao_min) : "0 h"}</td></tr>`; }).join("");
  return `<table class="f-tab"><thead><tr><th>Data</th><th>Aula</th><th>Turma</th><th>Treinador</th><th>Situação</th><th class="n">Conv.</th><th class="n">Presentes</th><th class="n">Faltas</th><th class="n">Outras</th><th class="n">Sem fechar</th><th class="n">Horas</th></tr></thead><tbody>${lin}</tbody><tfoot><tr><td colspan="5">Total (sem canceladas)</td><td class="n">${T.conv}</td><td class="n">${T.pres}</td><td class="n">${T.falta}</td><td class="n">${T.outros}</td><td class="n">${T.pend}</td><td class="n">${fh(T.min)}</td></tr></tfoot></table>`;
}
function relDiario(d) {
  const I = indicadores({ de: d, ate: d }), ss = I.ss.slice().sort(ordSes), oc = I.fech.filter(v => !B.C.status_conclui.includes(v.presenca)).map(v => ({ v, s: B.ses.get(v.sessao_id), p: B.pes.get(v.pessoa_id) })).sort((a, b) => ordSes(a.s, b.s));
  const abertas = B.sessoes.filter(s => s.status === "prevista" && s.data <= d).sort(ordSes);
  return `${cabRel("Relatório diário de treinamentos", `${dataLonga(d)} · turmas, chamadas e ocorrências`)}
  ${kRel([[I.real.length, "Sessões realizadas", `de ${I.plan.length} planejadas`], [fh(I.horasMin), "Horas ministradas"], [n0(I.fech.length), "Convocações fechadas", `${n0(I.abertas.length)} ainda abertas`], [n0(I.pres.length), "Presenças", pc(I.pres.length, I.den) + " de adesão"], [n0(I.faltas), "Faltas", pc(I.faltas, I.fech.length) + " das fechadas"]])}
  <h2 class="f-h">Sessões do dia</h2>${tabSessoes(ss)}
  <h2 class="f-h">Ocorrências <small>${oc.length} ${oc.length === 1 ? "registro" : "registros"}</small></h2>${oc.length ? `<table class="f-tab"><thead><tr><th>Pessoa</th><th>Aula</th><th>Situação</th><th>Motivo / observação</th><th>Gerente na aula</th></tr></thead><tbody>${oc.map(({ v, s, p }) => `<tr><td>${esc(p ? p.nome : v.pessoa_id)}</td><td>${esc(nomeAula(B.aul.get(s.aula_id)))}</td><td>${esc(v.presenca)}</td><td>${esc([v.motivo, v.obs].filter(Boolean).join(" · "))}</td><td>${esc(v.gerente || "")}</td></tr>`).join("")}</tbody></table>` : `<p class="f-vazio">Nenhuma ocorrência: todos os convocados das chamadas fechadas estavam presentes.</p>`}
  ${abertas.length ? `<h2 class="f-h">Chamadas abertas até este dia</h2><table class="f-tab"><tbody>${abertas.map(s => `<tr><td>${dsem(s.data)} ${hm(s.inicio)}</td><td>${esc(titAula(B.aul.get(s.aula_id)))}</td><td>${esc((B.tur.get(s.turma_id) || {}).nome)}</td><td class="n">${contaSes(s).pend} sem lançamento</td></tr>`).join("")}</tbody></table>` : ""}
  ${rodRel(I)}`;
}
function relSemanal(ini, fim) {
  const I = indicadores({ de: ini, ate: fim }), dias = Array.from({ length: 7 }, (_, i) => addDias(ini, i));
  const porDia = dias.map(d => ({ d, Id: indicadores({ de: d, ate: d }) })).filter(x => x.Id.ss.length);
  const aus = I.fech.filter(v => B.C.status_reposicao.includes(v.presenca)).map(v => ({ v, s: B.ses.get(v.sessao_id), p: B.pes.get(v.pessoa_id) })).sort((a, b) => ordSes(a.s, b.s));
  const reinc = pid => B.convocacoes.filter(v => v.pessoa_id === pid && B.C.status_reposicao.includes(v.presenca) && B.ses.get(v.sessao_id).status === "realizada" && B.ses.get(v.sessao_id).data <= fim).length;
  const repAb = B.reposicoes.filter(r => r.status === "aberta").length, repAg = B.reposicoes.filter(r => r.status === "agendada").length, repConc = B.reposicoes.filter(r => r.status === "concluida" && r.data_programada >= ini && r.data_programada <= fim).length, repNov = B.reposicoes.filter(r => { const o = B.ses.get(r.origem_sessao_id); return o.data >= ini && o.data <= fim; }).length;
  return `${cabRel("Relatório semanal de treinamentos", `Semana de ${dt(ini)} a ${dt(fim)} · evolução, carga horária, ausentes e reposições`)}
  ${kRel([[I.real.length, "Sessões realizadas", `de ${I.plan.length} planejadas${I.canc ? ` · ${I.canc} canc.` : ""}`], [fh(I.horasMin), "Carga horária"], [n0(I.unicos), "Pessoas únicas", `${n0(I.pres.length)} participações`], [pc(I.pres.length, I.den), "Adesão", `${n0(I.pres.length)} de ${n0(I.den)}`], [n0(I.faltas), "Faltas", pc(I.faltas, I.fech.length) + " das fechadas"]])}
  <h2 class="f-h">Evolução na semana</h2>${porDia.length ? `<table class="f-tab"><thead><tr><th>Dia</th><th class="n">Sessões</th><th class="n">Horas</th><th class="n">Convocações</th><th class="n">Presenças</th><th class="n">Faltas</th><th class="n">Adesão</th></tr></thead><tbody>${porDia.map(({ d, Id }) => `<tr><td>${dsem(d)}</td><td class="n">${Id.real.length}/${Id.plan.length}</td><td class="n">${fh(Id.horasMin)}</td><td class="n">${Id.conv.length}</td><td class="n">${Id.pres.length}</td><td class="n">${Id.faltas}</td><td class="n">${pc(Id.pres.length, Id.den)}</td></tr>`).join("")}</tbody><tfoot><tr><td>Semana</td><td class="n">${I.real.length}/${I.plan.length}</td><td class="n">${fh(I.horasMin)}</td><td class="n">${I.conv.length}</td><td class="n">${I.pres.length}</td><td class="n">${I.faltas}</td><td class="n">${pc(I.pres.length, I.den)}</td></tr></tfoot></table>` : `<p class="f-vazio">Nenhuma sessão nesta semana.</p>`}
  <h2 class="f-h">Sessões</h2>${tabSessoes(I.ss.slice().sort(ordSes))}
  <h2 class="f-h">Ausentes da semana <small>${aus.length} ${aus.length === 1 ? "registro" : "registros"} · reincidente = 2 ou mais ausências acumuladas</small></h2>${aus.length ? `<table class="f-tab"><thead><tr><th>Pessoa</th><th>Aula</th><th>Data</th><th>Situação</th><th>Motivo</th><th class="n">Ausências acumuladas</th><th>Reposição</th></tr></thead><tbody>${aus.map(({ v, s, p }) => { const n = reinc(v.pessoa_id), r = B.reposicoes.find(x => x.pessoa_id === v.pessoa_id && x.origem_sessao_id === s.id); return `<tr class="${n >= 2 ? "reinc" : ""}"><td>${esc(p ? p.nome : v.pessoa_id)}<br><i>${esc(v.gerente || "")}</i></td><td>${esc(nomeAula(B.aul.get(s.aula_id)))}</td><td>${dtc(s.data)}</td><td>${esc(v.presenca)}</td><td>${esc(v.motivo || "")}</td><td class="n">${n}${n >= 2 ? " · reincidente" : ""}</td><td>${r ? RST[r.status] + (r.data_programada && r.status !== "aberta" ? " " + dtc(r.data_programada) : "") : "Concluída depois"}</td></tr>`; }).join("")}</tbody></table>` : `<p class="f-vazio">Nenhuma ausência nas chamadas fechadas da semana.</p>`}
  <h2 class="f-h">Ações de reposição</h2>${kRel([[repNov, "Pendências novas", "faltas da semana"], [repConc, "Concluídas na semana"], [repAg, "Agendadas hoje"], [repAb, "Sem data hoje"]])}
  ${rodRel(I)}`;
}
function csv() {
  const ini = fRel.tipo === "diario" ? fRel.dia : fRel.semana, fim = fRel.tipo === "diario" ? fRel.dia : addDias(fRel.semana, 6);
  const l = B.convocacoes.map(v => ({ v, s: B.ses.get(v.sessao_id) })).filter(x => x.s.data >= ini && x.s.data <= fim).sort((a, b) => ordSes(a.s, b.s));
  const C = ["data", "inicio", "sessao", "situacao_sessao", "aula", "turma", "id_prestador", "nome", "presenca", "motivo", "obs", "gerente_na_aula", "superint_na_aula", "diretoria_na_aula", "lancado_por", "lancado_em"], c = x => { let s = String(x ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
  const linhas = l.map(({ v, s }) => [s.data, hm(s.inicio), s.id, s.status, s.aula_id, (B.tur.get(s.turma_id) || {}).nome, v.pessoa_id, (B.pes.get(v.pessoa_id) || {}).nome, v.presenca, v.motivo, v.obs, v.gerente, v.superintendente, v.diretoria, v.lancado_por, v.lancado_em].map(c).join(";"));
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿USO INTERNO\r\n" + C.join(";") + "\r\n" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" })); a.download = `metro_academy_chamadas_${ini}_${fim}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); avisa(`Arquivo baixado com ${l.length} linhas.`, "ok");
}

/* ===== Catálogo e regras ===== */
function vCat() {
  const C = B.C, chips = l => l.map(chipP).join(" ");
  casca(`<div class="kpis"><div class="kpi k-branco"><b>${B.aulas.filter(a => a.situacao !== "inativo").length}</b><span>Aulas no catálogo</span><small>${B.aulas.filter(a => a.situacao === "provisorio").length} com título provisório</small></div><div class="kpi k-branco"><b>${B.turmas.length}</b><span>Turmas</span></div><div class="kpi k-branco"><b>${B.sessoes.length}</b><span>Sessões registradas</span></div><div class="kpi k-branco"><b>${n0(B.pessoas.filter(ativo).length)}</b><span>Ativos com ID</span><small>${B.sem_id.length} sem ID (repetido)</small></div></div>
  <h2><i class="bolinha b-verde"></i>Aulas ${admin() ? `<button class="btn sec peq dir" data-a="nova-aula">${IC.mais}Nova aula</button>` : ""}</h2>
  <div class="tab"><table><thead><tr><th>Código</th><th>Nível</th><th>Título</th><th class="n">Duração padrão</th><th>Conteúdo</th>${admin() ? "<th></th>" : ""}</tr></thead><tbody>${B.aulas.map(a => `<tr><td><b>${esc(a.id)}</b></td><td>${esc(a.nivel)} · Aula ${a.numero}</td><td>${esc(a.titulo)}</td><td class="n">${fh(a.duracao_min)}</td><td><span class="chip ${a.situacao === "oficial" ? "p-pres" : a.situacao === "inativo" ? "p-na" : "p-mesa"}">${{ provisorio: "Provisório", oficial: "Oficial", inativo: "Inativo" }[a.situacao]}</span></td>${admin() ? `<td><button class="btn txt peq" data-ea="${a.id}">Editar</button></td>` : ""}</tr>`).join("")}</tbody></table></div>
  <p class="nota">${IC.info}<span>Catálogo oficial da UMC (19/11/2026): N1 a N4, todas as aulas com 1h30. Cada nível termina com prova de avaliação (só para quem concluiu todas as aulas) e entrega de certificado (só para aprovados), lançadas na aba Consultores.</span></p>
  <h2><i class="bolinha b-azul"></i>Turmas ${pode() ? `<button class="btn sec peq dir" data-a="nova-turma">${IC.mais}Nova turma</button>` : ""}</h2>
  <div class="tab"><table><thead><tr><th>Turma</th><th>Nível</th><th class="n">Sessões</th><th class="n">Pessoas</th><th>Observação</th>${pode() ? "<th></th>" : ""}</tr></thead><tbody>${B.turmas.map(t => { const ss = B.sessoes.filter(s => s.turma_id === t.id), pp = new Set(ss.flatMap(s => (B.porSes.get(s.id) || []).map(v => v.pessoa_id))); return `<tr><td><b>${esc(t.nome)}</b></td><td>${esc(t.nivel)}</td><td class="n">${ss.length}</td><td class="n">${pp.size}</td><td>${esc(t.obs || "")}</td>${pode() ? `<td><button class="btn txt peq" data-et="${t.id}">Editar</button></td>` : ""}</tr>`; }).join("") || `<tr><td colspan="6" class="muted">Nenhuma turma.</td></tr>`}</tbody></table></div>
  <h2><i class="bolinha b-verm"></i>Regras da chamada <small>"em mesa" e ordem confirmados pela UMC em 19/11/2026</small>${admin() ? `<button class="btn sec peq dir" data-a="regras">Editar regras</button>` : ""}</h2>
  <div class="painel regras"><div><b>Concluem a aula</b>${chips(C.status_conclui)}</div><div><b>Geram reposição</b>${chips(C.status_reposicao)}</div><div><b>Saem da conta da adesão</b>${chips(C.status_fora_denominador)}</div><div><b>Ordem das aulas</b>${C.exige_ordem ? "Só é elegível para a Aula N quem concluiu a anterior" : "Qualquer aula, em qualquer ordem"}</div><div><b>Equivalência</b>${C.permite_equivalencia ? "Permitida (admin, com motivo)" : "Desligada"}</div><div><b>Sala padrão</b>${esc(C.sala_padrao)}</div><div><b>Status vazio</b>Nunca vira falta: a chamada só fecha com todos lançados</div></div>
  <p class="rodape">Versão ${VER}${DEMO ? ` · <button class="lnk" data-a="reset">Reiniciar demonstração</button>` : ""}</p>`,
  { sub: "Aulas, turmas e regras que valem para todo o sistema" });
}

/* ===== Janelas ===== */
let focoAntes = null;
const fechaM = forcar => { if (!$modal.innerHTML || (forcar !== true && $modal.querySelector(".ocupado"))) return; $modal.innerHTML = ""; if (focoAntes && document.contains(focoAntes)) focoAntes.focus(); focoAntes = null; };
function modal(html, larga) { focoAntes = document.activeElement; $modal.innerHTML = `<div class="fundo-m"><div class="janela${larga ? " larga" : ""}" role="dialog" aria-modal="true" aria-labelledby="mt">${html}</div></div>`; const h = $modal.querySelector("h2"); if (h) h.id = "mt"; const f = $modal.querySelector("[autofocus]") || $modal.querySelector("input,textarea,select") || $modal.querySelector("[data-a=fecha]"); if (f) f.focus(); return $modal.firstChild; }
const erMsg = t => { const e = document.getElementById("er"); if (e) e.textContent = t; };
const ocupa = (b, s) => { if (!b) return; b.disabled = s; b.classList.toggle("ocupado", s); };
const val = id => { const e = document.getElementById(id); return e ? e.value : ""; };
/* Executa a ação do botão principal; em erro mostra a mensagem e libera o botão */
const age = (fn, ok) => async ev => { const bt = ev.currentTarget; ocupa(bt, true); try { await fn(); focoAntes = null; fechaM(true); await recarrega(); if (ok) avisa(ok, "ok"); } catch (e) { erMsg(msgErro(e)); ocupa(bt, false); } };
const bts = (txt, perigo) => `<div class="bts"><button class="btn txt" data-a="fecha">Voltar</button><button class="btn${perigo ? " perigo" : ""}" id="go">${txt}</button></div><div class="erro" id="er" role="alert"></div>`;

function dlgSessao(s, pre = {}) {
  const ed = !!s, a0 = s ? s.aula_id : pre.aula_id || (B.nivelAulas("N1")[0] || B.aulas[0] || {}).id, aulaDur = id => (B.aul.get(id) || {}).duracao_min || 90;
  const fimDe = (ini, id) => { const m = minutos(ini) + aulaDur(id); return String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };
  const turmas = B.turmas.map(t => [t.id, t.nome]);
  modal(`<h2>${ed ? "Editar sessão" : "Nova sessão"}</h2>
  <div class="grade2"><div class="campo c2"><label for="xa">Aula</label><select id="xa">${op(B.aulas.filter(a => a.situacao !== "inativo" || (s && a.id === s.aula_id)).map(a => [a.id, titAula(a)]), a0)}</select></div>
  <div class="campo c2"><label for="xt">Turma</label><select id="xt">${op(turmas, s ? s.turma_id : pre.turma_id || "")}<option value="__nova" ${!turmas.length ? "selected" : ""}>+ Nova turma…</option></select></div>
  <div class="campo c2 ${turmas.length ? "esconde" : ""}" id="xnw"><label for="xn">Nome da nova turma</label><input id="xn" placeholder="Ex.: N1 · Turma 05"></div>
  <div class="campo"><label for="xd">Data</label><input id="xd" type="date" value="${s ? s.data : pre.data || B.hoje}"></div><div class="campo"><label for="xc">Capacidade</label><input id="xc" type="number" min="1" inputmode="numeric" value="${s ? s.capacidade || "" : 20}"></div>
  <div class="campo"><label for="xi">Início</label><input id="xi" type="time" value="${s ? hm(s.inicio) : "09:00"}"></div><div class="campo"><label for="xf">Fim</label><input id="xf" type="time" value="${s ? hm(s.fim) : fimDe("09:00", a0)}"></div>
  <div class="campo"><label for="xr">Treinador</label><input id="xr" value="${esc(s ? s.treinador || "" : perfil.nome)}"></div><div class="campo"><label for="xs">Sala</label><input id="xs" value="${esc(s ? s.sala || "" : B.C.sala_padrao)}"></div>
  <div class="campo c2"><label for="xo">Observação</label><input id="xo" value="${esc(s ? s.obs || "" : "")}"></div></div>${bts(ed ? "Salvar" : "Criar sessão")}`, true);
  const xt = document.getElementById("xt"), nw = document.getElementById("xnw"); xt.oninput = () => nw.classList.toggle("esconde", xt.value !== "__nova");
  const ajusta = () => { if (!ed) document.getElementById("xf").value = fimDe(val("xi"), val("xa")); }; document.getElementById("xi").oninput = ajusta; document.getElementById("xa").oninput = ajusta;
  document.getElementById("go").onclick = async ev => { const bt = ev.currentTarget; ocupa(bt, true);
    const p = { id: s ? s.id : null, aula_id: val("xa"), turma_id: xt.value === "__nova" ? null : xt.value, turma_nova: xt.value === "__nova" ? val("xn") : "", data: val("xd"), inicio: val("xi"), fim: val("xf"), treinador: val("xr"), sala: val("xs"), capacidade: val("xc"), obs: val("xo") };
    try { const id = await rpc("academy_salvar_sessao", { p }); fechaM(true); focoAntes = null; B = null; await vai("sessao", id); avisa(ed ? "Sessão atualizada." : "Sessão criada. Agora convoque as pessoas.", "ok"); if (!ed && pre.convocar) dlgConvocar(id, pre.convocar); } catch (e) { erMsg(msgErro(e)); ocupa(bt, false); } };
}

function dlgConvocar(sid, preSel) {
  const s = B.ses.get(sid), a = B.aul.get(s.aula_id), ja = new Set((B.porSes.get(sid) || []).map(v => v.pessoa_id)), P = B.pessoas.filter(ativo);
  const sel = new Set(preSel || []); let f = { t: "", d: "", u: "", g: "", so: "elegiveis" };
  const tag = p => { if (ja.has(p.id)) return ["ja", "Já convocado"]; const e = estado(p.id, a); if (e.st === "concluida") return ["concl", "Já concluiu"]; if (e.st === "reposicao") return ["repo", "Reposição pendente"]; if (e.st === "agendada") return ["ag", e.s && e.s.data <= B.hoje ? `Em chamada aberta ${dtc(e.s.data)}` : `Agendado ${dtc(e.s && e.s.data)}`]; if (e.st === "proxima") return ["eleg", "Elegível"]; return ["nao", `Falta a Aula ${a.numero - 1}`]; };
  modal(`<h2>Convocar para ${esc(nomeAula(a))}</h2><p class="muted">${esc((B.tur.get(s.turma_id) || {}).nome)} · ${dataLonga(s.data)}, ${hm(s.inicio)}${s.capacidade ? ` · ${s.capacidade} lugares` : ""}</p>
  <div class="filtros f5 em-janela"><div class="bus">${IC.busca}<input id="ct2" type="search" placeholder="Nome, apelido ou ID" aria-label="Buscar" autofocus></div><select id="cd" aria-label="Diretor"><option value="">Diretores</option>${op(unicos(P, "diretor"))}</select><select id="cu" aria-label="Superintendente"><option value="">Superint.</option>${op(unicos(P, "superintendente"))}</select><select id="cg" aria-label="Gerente"><option value="">Gerentes</option>${op(unicos(P, "gerente"))}</select><select id="cs" aria-label="Mostrar">${op([["elegiveis", "Elegíveis e reposições"], ["todos", "Todos os ativos"]], "elegiveis")}</select></div>
  <div class="conv-topo"><span id="cq"></span><button class="btn txt peq" id="call">Marcar todos os elegíveis da lista</button></div><div class="conv-lista" id="cl"></div>
  ${B.sem_id.length ? `<p class="muted peq">${B.sem_id.length} ativos sem ID (ID repetido em outro CPF) não aparecem aqui até o cadastro ser ajustado.</p>` : ""}
  <div class="bts"><button class="btn txt" data-a="fecha">Voltar</button><button class="btn" id="go">Convocar</button></div><div class="erro" id="er" role="alert"></div>`, true);
  const lista = () => { const t = nk(f.t); return P.filter(p => (!t || nk(p.nome + " " + p.apelido + " " + p.id).includes(t)) && (!f.d || p.diretor === f.d) && (!f.u || p.superintendente === f.u) && (!f.g || p.gerente === f.g)).map(p => ({ p, tg: tag(p) })).filter(x => f.so === "todos" || ["eleg", "repo"].includes(x.tg[0]) || sel.has(x.p.id)); };
  const conta = () => { const tot = ja.size + sel.size; document.getElementById("cq").innerHTML = `<b>${sel.size}</b> selecionados · ${tot}${s.capacidade ? ` de ${s.capacidade}` : ""} na sessão${s.capacidade && tot > s.capacidade ? ` <span class="chip p-falta">passa da capacidade</span>` : ""}`; document.getElementById("go").textContent = sel.size ? `Convocar ${sel.size}` : "Convocar"; document.getElementById("go").disabled = !sel.size; };
  const pinta = () => { const l = lista(); document.getElementById("cl").innerHTML = l.slice(0, 250).map(({ p, tg }) => `<label class="cv ${tg[0]}"><input type="checkbox" value="${esc(p.id)}" ${sel.has(p.id) || ja.has(p.id) ? "checked" : ""} ${ja.has(p.id) ? "disabled" : ""}><span class="tx"><b>${quem(p)}</b><small>${esc(p.id)} · ${esc(p.gerente || "")} · ${esc(p.diretor || "")}</small></span><span class="tg ${tg[0]}">${tg[1]}</span></label>`).join("") + (l.length > 250 ? `<p class="muted peq">Mostrando 250 de ${l.length}. Use a busca ou os filtros.</p>` : "") || `<div class="vazio"><b>Ninguém nesse filtro</b>${f.so === "elegiveis" ? "Mude para “Todos os ativos” para ver quem já concluiu ou ainda não pode." : ""}</div>`; conta(); };
  document.getElementById("cl").onchange = ev => { const c = ev.target; if (c.type !== "checkbox") return; c.checked ? sel.add(c.value) : sel.delete(c.value); conta(); };
  [["ct2", "t"], ["cd", "d"], ["cu", "u"], ["cg", "g"], ["cs", "so"]].forEach(([id, k]) => document.getElementById(id).oninput = ev => { f[k] = ev.target.value; pinta(); });
  document.getElementById("call").onclick = () => { lista().forEach(({ p, tg }) => { if (["eleg", "repo"].includes(tg[0])) sel.add(p.id); }); pinta(); };
  const envia = async (forcar, bt) => { ocupa(bt, true); try { const r = await rpc("academy_convocar", { p_sessao: sid, p_pessoas: [...sel], p_forcar: forcar }); focoAntes = null; fechaM(true); await recarrega(); avisa(`${r.convocados} ${r.convocados === 1 ? "pessoa convocada" : "pessoas convocadas"}.`, "ok"); }
    catch (e) { ocupa(bt, false); if (e.message === "capacidade" && !forcar) { erMsg(""); const b2 = document.createElement("button"); b2.className = "btn perigo"; b2.textContent = "Convocar mesmo assim"; b2.onclick = () => envia(true, b2); erMsg(`A seleção passa dos ${s.capacidade} lugares da sessão.`); document.getElementById("er").append(" ", b2); } else erMsg(msgErro(e)); } };
  document.getElementById("go").onclick = ev => envia(false, ev.currentTarget); pinta();
}

function dlgSituacao(sid, pid) {
  const s = B.ses.get(sid), v = (B.porSes.get(sid) || []).find(x => x.pessoa_id === pid), p = B.pes.get(pid), fechada = s.status === "realizada";
  modal(`<h2>${fechada ? "Corrigir chamada" : "Situação na chamada"}</h2><p><b>${quem(p)}</b><br><span class="muted">${esc(nomeAula(B.aul.get(s.aula_id)))} · ${dtc(s.data)}</span></p>
  <div class="campo"><label for="xs2">Situação</label><select id="xs2">${op(STATUS.filter(x => !fechada || x !== "Pendente"), v.presenca)}</select></div>
  <div class="campo"><label for="xm">Motivo${fechada ? " da correção (obrigatório)" : ""}</label><input id="xm" value="${fechada ? "" : esc(v.motivo || "")}" placeholder="${fechada ? "Ex.: lançado errado, pessoa estava presente" : "Ex.: atestado, plantão no stand"}"></div>
  <div class="campo"><label for="xb">Observação</label><textarea id="xb" maxlength="1000">${esc(v.obs || "")}</textarea></div>
  ${fechada ? `<p class="muted peq">A chamada já foi fechada. A correção fica registrada com seu nome, a data e o motivo, e o histórico e as reposições se recalculam.</p>` : ""}${bts(fechada ? "Salvar correção" : "Salvar")}`);
  document.getElementById("go").onclick = age(() => rpc("academy_marcar", { p_sessao: sid, p_pessoa: pid, p_presenca: val("xs2"), p_motivo: val("xm"), p_obs: val("xb") }), fechada ? "Correção registrada." : "");
}

function dlgFechar(sid) {
  const s = B.ses.get(sid), c = contaSes(s), l = B.porSes.get(sid) || [];
  if (c.pend) return modal(`<h2>Ainda há pendentes</h2><p>${c.pend === 1 ? "Uma pessoa está" : `${c.pend} pessoas estão`} sem situação lançada. Campo vazio nunca vira falta sozinho: marque cada uma antes de encerrar.</p><div class="bts"><button class="btn txt" data-a="fecha">Voltar à chamada</button><button class="btn sec" id="go">Marcar ${c.pend} como presentes</button></div><div class="erro" id="er" role="alert"></div>`), document.getElementById("go").onclick = age(() => rpc("academy_marcar_pendentes", { p_sessao: sid, p_presenca: "Presente" }), "Pendentes marcados como presentes.");
  const dur = minutos(s.fim) - minutos(s.inicio), por = STATUS.filter(x => x !== "Pendente").map(x => [x, l.filter(v => v.presenca === x).length]).filter(x => x[1]);
  modal(`<h2>Encerrar a chamada?</h2><div class="resumo">${por.map(([x, n]) => `<div>${chipP(x)}<b>${n}</b></div>`).join("")}</div>
  <div class="campo"><label for="xdu">Duração real da aula (minutos)</label><input id="xdu" type="number" min="1" inputmode="numeric" value="${dur}"><small class="muted">Previsto: ${hm(s.inicio)} às ${hm(s.fim)} (${dur} min). Ajuste se começou ou terminou fora do horário.</small></div>
  <p class="muted peq">Ao encerrar, quem esteve presente conclui a aula e quem faltou entra na lista de reposição. Dá para reabrir depois, com motivo.</p>${bts("Encerrar chamada")}`);
  document.getElementById("go").onclick = age(() => rpc("academy_fechar_chamada", { p_sessao: sid, p_duracao_min: +val("xdu") }), "Chamada encerrada. Histórico e reposições atualizados.");
}

function dlgTexto(tit, txt, rot, fn, ok, botao, perigo) { modal(`<h2>${esc(tit)}</h2>${txt ? `<p>${txt}</p>` : ""}<div class="campo"><label for="tx">${esc(rot)}</label><textarea id="tx"></textarea></div>${bts(botao, perigo)}`); document.getElementById("go").onclick = ev => { if (!val("tx").trim()) { erMsg("Informe o motivo."); document.getElementById("tx").focus(); return; } return age(() => fn(val("tx")), ok)(ev); }; }

function dlgAgendar(rid) {
  const r = B.reposicoes.find(x => x.id === +rid), a = B.aul.get(r.aula_id), p = B.pes.get(r.pessoa_id), ss = B.sessoes.filter(s => s.aula_id === r.aula_id && s.status === "prevista" && s.data >= B.hoje).sort(ordSes);
  const trep = B.turmas.find(t => /reposi/i.test(t.nome));
  modal(`<h2>Agendar reposição</h2><p><b>${quem(p)}</b><br><span class="muted">${esc(titAula(a))}</span></p>
  ${ss.length ? `<div class="opcoes">${ss.map((s, i) => { const c = contaSes(s); return `<label class="cv"><input type="radio" name="rs" value="${s.id}" ${i ? "" : "checked"}><span class="tx"><b>${dataLonga(s.data)}, ${hm(s.inicio)}</b><small>${esc((B.tur.get(s.turma_id) || {}).nome)} · ${c.conv}${s.capacidade ? "/" + s.capacidade : ""} convocados</small></span></label>`; }).join("")}</div>${bts("Convocar para esta sessão")}`
    : `<p>Não há sessão futura de ${esc(nomeAula(a))}. Crie uma sessão de reposição e a pessoa já entra selecionada.</p><div class="bts"><button class="btn txt" data-a="fecha">Voltar</button><button class="btn" id="nova">Criar sessão de reposição</button></div>`}`);
  const go = document.getElementById("go"); if (go) go.onclick = ev => { const sid = +document.querySelector("input[name=rs]:checked").value; return age(() => rpc("academy_convocar", { p_sessao: sid, p_pessoas: [r.pessoa_id], p_forcar: true }), "Reposição agendada.")(ev); };
  const nv = document.getElementById("nova"); if (nv) nv.onclick = () => { fechaM(true); dlgSessao(null, { aula_id: r.aula_id, turma_id: trep ? trep.id : "", data: addDias(B.hoje, 1), convocar: [r.pessoa_id] }); };
}

function dlgAula(id) {
  const a = id ? B.aul.get(id) : null;
  modal(`<h2>${a ? "Editar aula" : "Nova aula"}</h2><div class="grade2"><div class="campo"><label for="an">Nível</label><select id="an" ${a ? "disabled" : ""}>${op(["N1", "N2", "N3", "N4"], a ? a.nivel : "N1")}</select></div><div class="campo"><label for="au">Número da aula</label><input id="au" type="number" min="1" value="${a ? a.numero : ""}" ${a ? "disabled" : ""}></div>
  <div class="campo c2"><label for="at">Título</label><input id="at" value="${esc(a ? a.titulo : "")}"></div><div class="campo"><label for="ad">Duração padrão (min)</label><input id="ad" type="number" min="1" value="${a ? a.duracao_min : 90}"></div><div class="campo"><label for="as">Conteúdo</label><select id="as">${op([["provisorio", "Provisório"], ["oficial", "Oficial"], ["inativo", "Inativo"]], a ? a.situacao : "provisorio")}</select></div></div>${bts("Salvar")}`);
  document.getElementById("go").onclick = age(() => rpc("academy_salvar_aula", { p: { nivel: val("an"), numero: val("au"), titulo: val("at"), duracao_min: val("ad"), situacao: val("as") } }), "Aula salva.");
}
function dlgTurma(id) {
  const t = id ? B.tur.get(+id) : null;
  modal(`<h2>${t ? "Editar turma" : "Nova turma"}</h2><div class="campo"><label for="tn">Nome</label><input id="tn" value="${esc(t ? t.nome : "")}" placeholder="Ex.: N1 · Turma 05"></div><div class="campo"><label for="tv">Nível</label><select id="tv" ${t ? "disabled" : ""}>${op(["N1", "N2", "N3", "N4"], t ? t.nivel : "N1")}</select></div><div class="campo"><label for="to">Observação</label><input id="to" value="${esc(t ? t.obs || "" : "")}"></div>${bts("Salvar")}`);
  document.getElementById("go").onclick = age(() => rpc("academy_salvar_turma", { p: { id: t ? t.id : null, nome: val("tn"), nivel: val("tv"), obs: val("to") } }), "Turma salva.");
}
function dlgRegras() {
  const C = B.C, grupo = (k, tit) => `<fieldset class="campo"><legend>${tit}</legend><div class="checks">${STATUS.filter(x => x !== "Pendente").map(x => `<label><input type="checkbox" data-g="${k}" value="${esc(x)}" ${C[k].includes(x) ? "checked" : ""}>${esc(x)}</label>`).join("")}</div></fieldset>`;
  modal(`<h2>Regras da chamada</h2><p class="muted peq">Valem para todas as chamadas, inclusive as já fechadas: ao salvar, conclusões e reposições são recalculadas. Registre aqui o que a UMC aprovar (D3 e D4).</p>
  ${grupo("status_conclui", "Concluem a aula")}${grupo("status_reposicao", "Geram reposição")}${grupo("status_fora_denominador", "Saem da conta da adesão")}
  <div class="checks"><label><input type="checkbox" id="ro" ${C.exige_ordem ? "checked" : ""}>Exigir a aula anterior concluída para ser elegível</label><label><input type="checkbox" id="re" ${C.permite_equivalencia ? "checked" : ""}>Permitir conclusão por equivalência (admin, com motivo)</label></div>
  <div class="campo"><label for="rs2">Sala padrão</label><input id="rs2" value="${esc(C.sala_padrao)}"></div>${bts("Salvar regras")}`, true);
  const pega = k => [...$modal.querySelectorAll(`[data-g=${k}]:checked`)].map(x => x.value);
  document.getElementById("go").onclick = age(() => rpc("academy_salvar_config", { p: { status_conclui: pega("status_conclui"), status_reposicao: pega("status_reposicao"), status_fora_denominador: pega("status_fora_denominador"), exige_ordem: document.getElementById("ro").checked, permite_equivalencia: document.getElementById("re").checked, sala_padrao: val("rs2") } }), "Regras salvas e histórico recalculado.");
}
/* Prova: lista quem concluiu todas as aulas do nível e ainda não foi aprovado; só entra quem tiver resultado escolhido */
function dlgProva(nv) {
  nv = B.niveis.includes(nv) ? nv : B.niveis[0] || "N1";
  const P = B.pessoas.filter(p => ativo(p) && aulasOk(p.id, nv) && !marcos(p.id, nv).ap), res = new Map(), nota = new Map(); let t = "";
  modal(`<h2>Lançar prova de avaliação</h2><p class="muted">Aparece quem concluiu todas as aulas do nível e ainda não foi aprovado. Escolha o resultado só de quem fez a prova; quem fica em branco não é lançado.</p>
  <div class="grade2"><div class="campo"><label for="pn">Nível</label><select id="pn">${op(B.niveis, nv)}</select></div><div class="campo"><label for="pd">Data da prova</label><input id="pd" type="date" max="${B.hoje}" value="${B.hoje}"></div></div>
  <div class="filtros f2 em-janela"><div class="bus">${IC.busca}<input id="pt2" type="search" placeholder="Nome, apelido ou ID" aria-label="Buscar"></div><button class="btn txt peq" id="pall">Marcar todos da lista como aprovados</button></div>
  <div class="conv-topo"><span id="pq"></span></div><div class="conv-lista" id="pl"></div>
  <div class="bts"><button class="btn txt" data-a="fecha">Voltar</button><button class="btn" id="go">Lançar</button></div><div class="erro" id="er" role="alert"></div>`, true);
  const lista = () => { const k = nk(t); return P.filter(p => !k || nk(p.nome + " " + p.apelido + " " + p.id).includes(k)); };
  const conta = () => { const l = [...res.values()], ap = l.filter(x => x === "aprovado").length; document.getElementById("pq").innerHTML = `<b>${l.length}</b> com resultado · ${ap} aprovados · ${l.length - ap} reprovados · ${P.length} aptos no ${esc(nv)}`; const g = document.getElementById("go"); g.textContent = l.length ? `Lançar ${l.length}` : "Lançar"; g.disabled = !l.length; };
  const pinta = () => { const l = lista(); document.getElementById("pl").innerHTML = l.map(p => { const m = marcos(p.id, nv), ult = m.tentativas[m.tentativas.length - 1];
    return `<div class="cv pv"><span class="tx"><b>${quem(p)}</b><small>${esc(p.id)} · ${esc(p.gerente || "")}${ult ? ` · reprovado em ${dtc(ult.data)}` : ""}</small></span><input class="nota" data-n="${esc(p.id)}" inputmode="decimal" placeholder="Nota" aria-label="Nota de ${esc(p.nome)}" value="${esc(nota.get(p.id) || "")}"><select data-r="${esc(p.id)}" aria-label="Resultado de ${esc(p.nome)}">${op([["", "Não lançar"], ["aprovado", "Aprovado"], ["reprovado", "Reprovado"]], res.get(p.id) || "")}</select></div>`; }).join("")
      || `<div class="vazio"><b>Ninguém apto no ${esc(nv)}</b>Para fazer a prova, a pessoa precisa ter concluído todas as aulas do nível.</div>`; conta(); };
  const pl = document.getElementById("pl");
  pl.oninput = ev => { const e = ev.target; if (e.dataset.r) { e.value ? res.set(e.dataset.r, e.value) : res.delete(e.dataset.r); conta(); } else if (e.dataset.n) nota.set(e.dataset.n, e.value); };
  document.getElementById("pt2").oninput = ev => { t = ev.target.value; pinta(); };
  document.getElementById("pn").oninput = ev => { fechaM(true); dlgProva(ev.target.value); };
  document.getElementById("pall").onclick = () => { lista().forEach(p => res.set(p.id, "aprovado")); pinta(); };
  document.getElementById("go").onclick = ev => { const itens = [...res].map(([pessoa, resultado]) => { const s = String(nota.get(pessoa) || "").trim().replace(",", "."); return { pessoa, resultado, nota: s === "" ? null : +s }; });
    if (itens.some(x => x.nota != null && !(x.nota >= 0 && x.nota <= 10))) { erMsg("A nota vai de 0 a 10 (pode usar vírgula)."); return; }
    if (!val("pd")) { erMsg("Informe a data da prova."); return; }
    return age(() => rpc("academy_lancar_prova", { p_nivel: nv, p_data: val("pd"), p_itens: itens }), `${itens.length} ${itens.length === 1 ? "resultado lançado" : "resultados lançados"}.`)(ev); };
  pinta();
}
/* Certificado: só para aprovados no nível que ainda não receberam */
function dlgCert(nv) {
  nv = B.niveis.includes(nv) ? nv : B.niveis[0] || "N1";
  const P = B.pessoas.filter(p => { const m = marcos(p.id, nv); return m.ap && !m.c; }), sel = new Set(P.map(p => p.id));
  modal(`<h2>Entregar certificados</h2><p class="muted">Aparece quem foi aprovado na prova do nível e ainda não recebeu o certificado.</p>
  <div class="grade2"><div class="campo"><label for="cn">Nível</label><select id="cn">${op(B.niveis, nv)}</select></div><div class="campo"><label for="cdt">Data da entrega</label><input id="cdt" type="date" max="${B.hoje}" value="${B.hoje}"></div></div>
  <div class="conv-topo"><span id="cq2"></span></div><div class="conv-lista" id="cl2">${P.map(p => { const m = marcos(p.id, nv); return `<label class="cv"><input type="checkbox" value="${esc(p.id)}" checked><span class="tx"><b>${quem(p)}</b><small>${esc(p.id)} · ${esc(p.gerente || "")} · aprovado em ${dtc(m.ap.data)}</small></span></label>`; }).join("") || `<div class="vazio"><b>Nenhum certificado a entregar no ${esc(nv)}</b>Quem for aprovado na prova aparece aqui.</div>`}</div>
  <div class="bts"><button class="btn txt" data-a="fecha">Voltar</button><button class="btn" id="go">Registrar entrega</button></div><div class="erro" id="er" role="alert"></div>`, true);
  const conta = () => { document.getElementById("cq2").innerHTML = `<b>${sel.size}</b> de ${P.length} selecionados`; const g = document.getElementById("go"); g.textContent = sel.size ? `Registrar ${sel.size} ${sel.size === 1 ? "entrega" : "entregas"}` : "Registrar entrega"; g.disabled = !sel.size; };
  document.getElementById("cl2").onchange = ev => { const c = ev.target; if (c.type !== "checkbox") return; c.checked ? sel.add(c.value) : sel.delete(c.value); conta(); };
  document.getElementById("cn").oninput = ev => { fechaM(true); dlgCert(ev.target.value); };
  document.getElementById("go").onclick = ev => { if (!val("cdt")) { erMsg("Informe a data da entrega."); return; } return age(() => rpc("academy_entregar_certificados", { p_nivel: nv, p_data: val("cdt"), p_pessoas: [...sel] }), `${sel.size} ${sel.size === 1 ? "certificado registrado" : "certificados registrados"}.`)(ev); };
  conta();
}
function dlgSemId() {
  modal(`<h2>Ativos sem ID</h2><p class="muted">O ID segue a regra da coluna ID da ETV: 3 primeiras letras do nome + 3 últimas + 3 primeiros dígitos do CPF. Quando dois CPFs geram o mesmo ID, ninguém com esse ID pode ser convocado até o RH ajustar o nome no cadastro; na próxima sincronização a pessoa aparece.</p><div class="lista-simples">${B.sem_id.map(p => `<div><b>${quem(p)}</b><small>${p.motivo ? esc(p.motivo) + " · " : ""}${lideranca(p)}</small></div>`).join("") || "<p>Nenhum.</p>"}</div><div class="bts"><button class="btn" data-a="fecha">Fechar</button></div>`, true);
}

/* ===== Cliques ===== */
document.addEventListener("click", async ev => {
  if (ev.target.classList && ev.target.classList.contains("fundo-m")) return fechaM();
  const b = ev.target.closest("button,tr[data-s],tr[data-p],.item[data-s]"); if (!b || b.disabled) return; const D = b.dataset;
  if (D.ir) { const t = document.getElementById(D.ir); if (t) { t.scrollIntoView({ behavior: MENOS_MOV() ? "auto" : "smooth", block: "start" }); t.tabIndex = -1; t.focus({ preventScroll: true }); } return; }
  if (D.r) return vai(D.r); if (D.s) return vai("sessao", +D.s); if (D.p) return vai("ficha", D.p);
  if (D.cf) { fCons.s = D.cf; fCons.n = "N1"; return vai("consultores"); }
  if (D.fr) { fRep.st = D.fr; return vai("reposicoes", null, true); }
  if (D.m) { const [sid, pid, st] = D.m.split("|"), v = (B.porSes.get(+sid) || []).find(x => x.pessoa_id === pid); if (!v || v.presenca === st) return;
    b.parentElement.querySelectorAll("button").forEach(x => x.disabled = true);
    try { await rpc("academy_marcar", { p_sessao: +sid, p_pessoa: pid, p_presenca: st, p_motivo: v.motivo, p_obs: v.obs }); v.presenca = st; vai("sessao", +sid, true); } catch (e) { avisa(msgErro(e), "erro"); vai("sessao", +sid, true); } return; }
  if (D.ou) { const [sid, pid] = D.ou.split("|"); return dlgSituacao(+sid, pid); }
  if (D.rm) { const [sid, pid] = D.rm.split("|"); try { await rpc("academy_desconvocar", { p_sessao: +sid, p_pessoa: pid }); await recarrega(); avisa("Convocação removida.", "ok"); } catch (e) { avisa(msgErro(e), "erro"); } return; }
  if (D.ag) return dlgAgendar(D.ag);
  if (D.cr) return dlgTexto("Cancelar reposição", "A pendência deixa de aparecer como aberta. O histórico da falta continua.", "Motivo", m => rpc("academy_cancelar_reposicao", { p_id: +D.cr, p_motivo: m }), "Reposição cancelada.", "Cancelar reposição", true);
  if (D.ra) { try { await rpc("academy_reativar_reposicao", { p_id: +D.ra }); await recarrega(); avisa("Reposição reativada.", "ok"); } catch (e) { avisa(msgErro(e), "erro"); } return; }
  if (D.eq) { const [pid, aid] = D.eq.split("|"); return dlgTexto(`Equivalência: ${nomeAula(B.aul.get(aid))}`, "Registra a aula como concluída sem presença. Use só com regra aprovada pela UMC.", "Motivo e regra aplicada", m => rpc("academy_equivalencia", { p_pessoa: pid, p_aula: aid, p_motivo: m }), "Equivalência registrada.", "Registrar"); }
  if (D.ea) return dlgAula(D.ea); if (D.et) return dlgTurma(D.et);
  if (D.xp) return dlgTexto("Excluir prova", "A tentativa sai do histórico da pessoa. A exclusão fica registrada com o motivo.", "Motivo", m => rpc("academy_excluir_prova", { p_id: +D.xp, p_motivo: m }), "Prova excluída.", "Excluir prova", true);
  if (D.xc) { const [pid, nv] = D.xc.split("|"); return dlgTexto("Excluir certificado", "A entrega deixa de constar. A exclusão fica registrada com o motivo.", "Motivo", m => rpc("academy_excluir_certificado", { p_pessoa: pid, p_nivel: nv, p_motivo: m }), "Certificado excluído.", "Excluir certificado", true); }
  const A = D.a; if (!A) return;
  if (A === "fecha") return fechaM();
  if (A === "sair") { await sair(); return telaLogin(); }
  if (A === "semid") return dlgSemId();
  if (A === "prova") return dlgProva(fCons.n);
  if (A === "certificado") return dlgCert(fCons.n);
  if (A === "nova-sessao") return dlgSessao(null);
  if (A === "editar-sessao") return dlgSessao(B.ses.get(arg));
  if (A === "convocar") return dlgConvocar(arg);
  if (A === "fechar") return dlgFechar(arg);
  if (A === "todos-presentes") { try { const n = await rpc("academy_marcar_pendentes", { p_sessao: arg, p_presenca: "Presente" }); await recarrega(); avisa(`${n} marcados como presentes.`, "ok"); } catch (e) { avisa(msgErro(e), "erro"); } return; }
  if (A === "cancelar-sessao") return dlgTexto("Cancelar sessão", "Sessão cancelada não conta horas nem gera conclusão. Reposições agendadas nela voltam a ficar sem data.", "Motivo do cancelamento", m => rpc("academy_cancelar_sessao", { p_sessao: arg, p_motivo: m }), "Sessão cancelada.", "Cancelar sessão", true);
  if (A === "reabrir") return dlgTexto("Reabrir chamada", "As conclusões e reposições geradas por esta chamada são desfeitas até ela ser encerrada de novo.", "Motivo", m => rpc("academy_reabrir_chamada", { p_sessao: arg, p_motivo: m }), "Chamada reaberta.", "Reabrir chamada", true);
  if (A === "mais") { limite += 150; return pintaCons && pintaCons(); }
  if (A === "limpa") { fCons = { t: "", d: "", u: "", g: "", s: "", n: fCons.n }; return vai("consultores"); }
  if (A === "imprimir") return window.print();
  if (A === "csv") return csv();
  if (A === "nova-aula") return dlgAula(null); if (A === "nova-turma") return dlgTurma(null); if (A === "regras") return dlgRegras();
  if (A === "reset") { if (!confirm("Apagar tudo o que foi feito na demonstração e voltar aos dados iniciais?")) return; AcademyDemo.reset(); B = null; fSes = fPai = fRel = null; await vai("hoje"); return avisa("Demonstração reiniciada.", "ok"); }
});
document.addEventListener("keydown", ev => { if (ev.key === "Escape") fechaM(); });

if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => { });
telaLogin();
})();
