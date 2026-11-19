"use strict";
/* Modo demonstração: as MESMAS regras de banco/01_schema_academy.sql, rodando neste aparelho (localStorage).
   Serve para homologar com a Victoria sem tocar em dado real. Pessoas e turmas são fictícias. */
window.AcademyDemo = (() => {
const CHAVE = "academy_demo_v1";
let S = null, usuario = null;
const hojeISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const somaDias = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv-SE"); };
const agora = () => new Date().toISOString();
const erro = m => { throw new Error(m); };
const copia = o => JSON.parse(JSON.stringify(o));
const vazio = s => !String(s ?? "").trim();
function salva() { try { localStorage.setItem(CHAVE, JSON.stringify(S)); } catch (e) { } }
function carrega() { if (S) return; try { const t = localStorage.getItem(CHAVE); if (t) { S = JSON.parse(t); return; } } catch (e) { } semeia(); }
const ses = id => S.sessoes.find(s => s.id === +id) || erro("sessao_inexistente");
const ordS = s => s.data + " " + s.inicio + " " + String(s.id).padStart(10, "0");
const pessoaPorId = id => S.pessoas.find(p => p.id === id);
function audita(acao, alvo, antes, depois, motivo) { S.auditoria.push({ id: S.auditoria.length + 1, em: agora(), por: usuario.nome, acao, alvo, antes, depois, motivo: motivo || null }); }
function exige(...papeis) { if (!usuario) erro("sem_permissao"); if (papeis.length && !papeis.includes(usuario.papel)) erro("sem_permissao"); return usuario.nome; }

/* ===== Regra central: conclusão única + reposições (espelho de academy.recalcula) ===== */
function recalcula(pid, aid) {
  const c = S.config;
  const minhas = S.convocacoes.filter(v => v.pessoa_id === pid).map(v => ({ v, s: ses(v.sessao_id) })).filter(x => x.s.aula_id === aid).sort((a, b) => ordS(a.s) < ordS(b.s) ? -1 : 1);
  const conc = minhas.find(x => x.s.status === "realizada" && c.status_conclui.includes(x.v.presenca));
  const k = S.conclusoes.find(x => x.pessoa_id === pid && x.aula_id === aid);
  if (conc) { if (!k) S.conclusoes.push({ pessoa_id: pid, aula_id: aid, sessao_id: conc.s.id, criterio: "presenca", motivo: null, em: agora() }); else if (k.criterio === "presenca" && k.sessao_id !== conc.s.id) { k.sessao_id = conc.s.id; k.em = agora(); } }
  else if (k && k.criterio === "presenca") S.conclusoes = S.conclusoes.filter(x => x !== k);
  const tem = S.conclusoes.some(x => x.pessoa_id === pid && x.aula_id === aid), origens = [];
  minhas.forEach((f, i) => {
    if (f.s.status !== "realizada" || !c.status_reposicao.includes(f.v.presenca)) return;
    origens.push(f.s.id);
    const px = minhas.slice(i + 1).find(x => x.s.status !== "cancelada");
    let st, nova = px ? px.s.id : null, data = px ? px.s.data : null;
    if (tem) { st = "concluida"; if (conc && ordS(conc.s) > ordS(f.s)) { nova = conc.s.id; data = conc.s.data; } }
    else if (!px) st = "aberta";
    else if (px.s.status === "prevista") st = "agendada";
    else st = c.status_reposicao.includes(px.v.presenca) ? "nao_compareceu" : "encerrada";
    let r = S.reposicoes.find(x => x.pessoa_id === pid && x.aula_id === aid && x.origem_sessao_id === f.s.id);
    if (r && r.status === "cancelada" && st === "aberta") return;
    if (!r) { r = { id: ++S.seq.rep, pessoa_id: pid, aula_id: aid, origem_sessao_id: f.s.id, motivo: null, criado_em: agora() }; S.reposicoes.push(r); }
    Object.assign(r, { origem_presenca: f.v.presenca, nova_sessao_id: nova, data_programada: data, status: st, atualizado_em: agora() });
  });
  S.reposicoes = S.reposicoes.filter(x => !(x.pessoa_id === pid && x.aula_id === aid && !origens.includes(x.origem_sessao_id)));
}
const recalculaSessao = sid => { const s = ses(sid); S.convocacoes.filter(v => v.sessao_id === s.id).forEach(v => recalcula(v.pessoa_id, s.aula_id)); };

/* ===== API (mesmos nomes e erros das funções public.academy_*) ===== */
const F = {
  academy_perfil() { exige(); return { nome: usuario.nome, papel: usuario.papel }; },
  academy_base() {
    exige(); const ativo = p => String(p.situacao || "").trim().toUpperCase() === "ATIVO";
    return copia({ hoje: hojeISO(), sync_em: S.sync_em, config: S.config,
      pessoas: S.pessoas.filter(p => p.id && (ativo(p) || S.convocacoes.some(v => v.pessoa_id === p.id))).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      sem_id: S.pessoas.filter(p => !p.id && ativo(p)).map(({ nome, apelido, gerente, superintendente, diretor }) => ({ nome, apelido, gerente, superintendente, diretor })),
      aulas: S.aulas, turmas: S.turmas, sessoes: S.sessoes, convocacoes: S.convocacoes, conclusoes: S.conclusoes, reposicoes: S.reposicoes });
  },
  academy_salvar_config({ p }) {
    const por = exige("admin"), antes = copia(S.config);
    ["status_conclui", "status_reposicao", "status_fora_denominador", "exige_ordem", "permite_equivalencia"].forEach(k => { if (k in p) S.config[k] = p[k]; });
    if (!vazio(p.sala_padrao)) S.config.sala_padrao = p.sala_padrao.trim();
    if (S.config.status_conclui.some(x => S.config.status_reposicao.includes(x))) { S.config = antes; erro("regra_conflitante"); }
    S.config.atualizado_em = agora(); S.config.atualizado_por = por; audita("salvar_config", "config", antes, copia(S.config));
    const pares = new Set(S.convocacoes.map(v => v.pessoa_id + "|" + ses(v.sessao_id).aula_id)); pares.forEach(x => { const [a, b] = x.split("|"); recalcula(a, b); });
  },
  academy_salvar_aula({ p }) {
    exige("admin"); if (vazio(p.titulo) || !(+p.duracao_min > 0) || !(+p.numero > 0) || !/^N[1-4]$/.test(p.nivel)) erro("dados_invalidos");
    const id = `${p.nivel}-A${+p.numero}`; let a = S.aulas.find(x => x.id === id);
    if (!a) { a = { id, nivel: p.nivel, numero: +p.numero }; S.aulas.push(a); S.aulas.sort((x, y) => x.nivel < y.nivel ? -1 : x.nivel > y.nivel ? 1 : x.numero - y.numero); }
    Object.assign(a, { titulo: p.titulo.trim(), duracao_min: +p.duracao_min, situacao: p.situacao || "provisorio" }); audita("salvar_aula", id, null, p); return id;
  },
  academy_salvar_turma({ p }) {
    const por = exige("admin", "operador"); if (vazio(p.nome)) erro("dados_invalidos");
    if (S.turmas.some(t => t.nome.toUpperCase() === p.nome.trim().toUpperCase() && t.id !== +p.id)) erro("turma_existente");
    let t; if (!p.id) { t = { id: ++S.seq.tur, nome: p.nome.trim(), nivel: p.nivel || "N1", obs: p.obs || null, criada_por: por, criada_em: agora() }; S.turmas.push(t); }
    else { t = S.turmas.find(x => x.id === +p.id); t.nome = p.nome.trim(); t.obs = p.obs || null; }
    audita("salvar_turma", String(t.id), null, p); return t.id;
  },
  academy_salvar_sessao({ p }) {
    const por = exige("admin", "operador"); if (!p.aula_id || !p.data || !p.inicio || !p.fim || p.fim <= p.inicio) erro("dados_invalidos");
    let turma = p.turma_id ? +p.turma_id : null;
    if (!vazio(p.turma_nova)) turma = F.academy_salvar_turma({ p: { nome: p.turma_nova, nivel: S.aulas.find(a => a.id === p.aula_id).nivel } });
    if (!turma) erro("dados_invalidos");
    const campos = { turma_id: turma, aula_id: p.aula_id, data: p.data, inicio: p.inicio, fim: p.fim, treinador: vazio(p.treinador) ? null : p.treinador.trim(), sala: vazio(p.sala) ? S.config.sala_padrao : p.sala.trim(), capacidade: +p.capacidade > 0 ? +p.capacidade : null, obs: p.obs || null };
    if (!p.id) { const s = { id: ++S.seq.ses, ...campos, duracao_min: null, status: "prevista", motivo_cancelamento: null, criada_por: por, criada_em: agora(), fechada_por: null, fechada_em: null }; S.sessoes.push(s); audita("criar_sessao", String(s.id), null, p); return s.id; }
    const s = ses(p.id); if (s.status !== "prevista") erro("sessao_fechada"); const antes = copia(s), aulaAntes = s.aula_id;
    Object.assign(s, campos); audita("editar_sessao", String(s.id), antes, p);
    if (aulaAntes !== s.aula_id) { S.convocacoes.filter(v => v.sessao_id === s.id).forEach(v => recalcula(v.pessoa_id, aulaAntes)); recalculaSessao(s.id); }
    return s.id;
  },
  academy_cancelar_sessao({ p_sessao, p_motivo }) {
    exige("admin", "operador"); if (vazio(p_motivo)) erro("motivo_obrigatorio");
    const s = ses(p_sessao); if (s.status !== "prevista") erro("sessao_fechada"); const antes = copia(s);
    s.status = "cancelada"; s.motivo_cancelamento = p_motivo.trim(); audita("cancelar_sessao", String(s.id), antes, null, p_motivo); recalculaSessao(s.id);
  },
  academy_convocar({ p_sessao, p_pessoas, p_forcar }) {
    const por = exige("admin", "operador"), s = ses(p_sessao); if (s.status !== "prevista") erro("sessao_fechada");
    const ja = S.convocacoes.filter(v => v.sessao_id === s.id), novos = [...new Set(p_pessoas)].filter(id => !ja.some(v => v.pessoa_id === id));
    if (s.capacidade && !p_forcar && ja.length + novos.length > s.capacidade) erro("capacidade");
    novos.forEach(id => { const p = pessoaPorId(id); if (!p) erro("pessoa_inexistente");
      const repo = S.reposicoes.some(r => r.pessoa_id === id && r.aula_id === s.aula_id && ["aberta", "agendada"].includes(r.status));
      S.convocacoes.push({ sessao_id: s.id, pessoa_id: id, situacao_convocacao: repo ? "reposicao" : "regular", presenca: "Pendente", motivo: null, obs: null, diretoria: p.diretor, superintendente: p.superintendente, gerente: p.gerente, funcao: p.funcao, convocado_por: por, convocado_em: agora(), lancado_por: null, lancado_em: null });
      recalcula(id, s.aula_id); });
    audita("convocar", String(s.id), null, novos); return { convocados: novos.length, ja_estavam: p_pessoas.length - novos.length };
  },
  academy_desconvocar({ p_sessao, p_pessoa }) {
    exige("admin", "operador"); const s = ses(p_sessao), v = S.convocacoes.find(x => x.sessao_id === s.id && x.pessoa_id === p_pessoa);
    if (s.status !== "prevista") erro("sessao_fechada"); if (!v) erro("nao_convocado"); if (v.presenca !== "Pendente") erro("ja_lancado");
    S.convocacoes = S.convocacoes.filter(x => x !== v); audita("desconvocar", `${s.id}/${p_pessoa}`, v, null); recalcula(p_pessoa, s.aula_id);
  },
  academy_marcar({ p_sessao, p_pessoa, p_presenca, p_motivo, p_obs }) {
    const por = exige("admin", "operador"), s = ses(p_sessao), v = S.convocacoes.find(x => x.sessao_id === s.id && x.pessoa_id === p_pessoa);
    if (!v) erro("nao_convocado"); if (s.status === "cancelada") erro("sessao_cancelada"); if (s.data > hojeISO()) erro("sessao_futura");
    if (!STATUS.includes(p_presenca)) erro("status_invalido");
    if (s.status === "realizada") { if (p_presenca === "Pendente") erro("status_invalido"); if (vazio(p_motivo)) erro("motivo_obrigatorio"); }
    const antes = copia(v); Object.assign(v, { presenca: p_presenca, motivo: vazio(p_motivo) ? null : p_motivo.trim(), obs: vazio(p_obs) ? null : p_obs.trim(), lancado_por: por, lancado_em: agora() });
    if (s.status === "realizada") { audita("corrigir_chamada", `${s.id}/${p_pessoa}`, antes, { presenca: p_presenca, motivo: p_motivo, obs: p_obs }, p_motivo); recalcula(p_pessoa, s.aula_id); }
  },
  academy_marcar_pendentes({ p_sessao, p_presenca }) {
    const por = exige("admin", "operador"), s = ses(p_sessao); if (s.status !== "prevista") erro("sessao_fechada"); if (s.data > hojeISO()) erro("sessao_futura");
    let n = 0; S.convocacoes.forEach(v => { if (v.sessao_id === s.id && v.presenca === "Pendente") { Object.assign(v, { presenca: p_presenca, lancado_por: por, lancado_em: agora() }); n++; } }); return n;
  },
  academy_fechar_chamada({ p_sessao, p_duracao_min }) {
    const por = exige("admin", "operador"), s = ses(p_sessao); if (s.status !== "prevista") erro("sessao_fechada"); if (s.data > hojeISO()) erro("sessao_futura");
    const l = S.convocacoes.filter(v => v.sessao_id === s.id); if (!l.length) erro("sem_convocados");
    const n = l.filter(v => v.presenca === "Pendente").length; if (n) erro("pendentes:" + n); if (!(+p_duracao_min > 0)) erro("dados_invalidos");
    Object.assign(s, { status: "realizada", duracao_min: +p_duracao_min, fechada_por: por, fechada_em: agora() }); audita("fechar_chamada", String(s.id), null, { duracao_min: +p_duracao_min }); recalculaSessao(s.id);
  },
  academy_reabrir_chamada({ p_sessao, p_motivo }) {
    exige("admin", "operador"); if (vazio(p_motivo)) erro("motivo_obrigatorio"); const s = ses(p_sessao); if (s.status !== "realizada") erro("sessao_aberta");
    const antes = copia(s); Object.assign(s, { status: "prevista", fechada_por: null, fechada_em: null }); audita("reabrir_chamada", String(s.id), antes, null, p_motivo); recalculaSessao(s.id);
  },
  academy_cancelar_reposicao({ p_id, p_motivo }) {
    exige("admin", "operador"); if (vazio(p_motivo)) erro("motivo_obrigatorio"); const r = S.reposicoes.find(x => x.id === +p_id); if (!r || r.status !== "aberta") erro("status_invalido");
    const antes = copia(r); Object.assign(r, { status: "cancelada", motivo: p_motivo.trim(), atualizado_em: agora() }); audita("cancelar_reposicao", String(r.id), antes, null, p_motivo);
  },
  academy_reativar_reposicao({ p_id }) {
    exige("admin", "operador"); const r = S.reposicoes.find(x => x.id === +p_id); if (!r || r.status !== "cancelada") erro("status_invalido");
    const antes = copia(r); Object.assign(r, { status: "aberta", motivo: null, atualizado_em: agora() }); audita("reativar_reposicao", String(r.id), antes, null); recalcula(r.pessoa_id, r.aula_id);
  },
  academy_equivalencia({ p_pessoa, p_aula, p_motivo }) {
    const por = exige("admin"); if (!S.config.permite_equivalencia) erro("equivalencia_desligada"); if (vazio(p_motivo)) erro("motivo_obrigatorio");
    if (!S.conclusoes.some(x => x.pessoa_id === p_pessoa && x.aula_id === p_aula)) S.conclusoes.push({ pessoa_id: p_pessoa, aula_id: p_aula, sessao_id: null, criterio: "equivalencia", motivo: p_motivo.trim(), registrado_por: por, em: agora() });
    audita("equivalencia", `${p_pessoa}/${p_aula}`, null, null, p_motivo); recalcula(p_pessoa, p_aula);
  }
};
const STATUS = ["Pendente", "Presente", "Falta", "Em mesa", "Justificada / afastado", "Desligado", "Não se aplica"];

/* ===== Dados fictícios de homologação: montados chamando as próprias funções, como a Victoria faria ===== */
function semeia() {
  const H = hojeISO(), D = window.AcademyDemoDados.gera();
  S = { seq: { ses: 0, tur: 0, rep: 0 }, sync_em: new Date(Date.now() - 23 * 60000).toISOString(),
    config: { status_conclui: ["Presente"], status_reposicao: ["Falta", "Justificada / afastado", "Em mesa"], status_fora_denominador: ["Não se aplica", "Desligado"], exige_ordem: true, permite_equivalencia: false, sala_padrao: "Sala de vidro – 39º andar", atualizado_em: null, atualizado_por: null },
    pessoas: D.pessoas, aulas: [
      { id: "N1-A1", nivel: "N1", numero: 1, titulo: "Título a confirmar pela UMC", duracao_min: 120, situacao: "provisorio" },
      { id: "N1-A2", nivel: "N1", numero: 2, titulo: "Título a confirmar pela UMC", duracao_min: 180, situacao: "provisorio" },
      { id: "N1-A3", nivel: "N1", numero: 3, titulo: "Título a confirmar pela UMC", duracao_min: 180, situacao: "provisorio" },
      { id: "N1-A4", nivel: "N1", numero: 4, titulo: "Título a confirmar pela UMC", duracao_min: 180, situacao: "provisorio" }],
    turmas: [], sessoes: [], convocacoes: [], conclusoes: [], reposicoes: [], auditoria: [] };
  const eu = usuario; usuario = { nome: "Victoria Soares", papel: "operador" };
  const g = D.grupos, T = n => F.academy_salvar_turma({ p: { nome: n, nivel: "N1" } });
  const t1 = T("N1 · Turma 01"), t2 = T("N1 · Turma 02"), t3 = T("N1 · Turma 03"), t4 = T("N1 · Turma 04"), tr = T("N1 · Reposições");
  const sessao = (turma, aula, dd, ini, fim, cap, trein) => F.academy_salvar_sessao({ p: { turma_id: turma, aula_id: aula, data: somaDias(H, dd), inicio: ini, fim, capacidade: cap, treinador: trein } });
  const conv = (s, l) => F.academy_convocar({ p_sessao: s, p_pessoas: l.map(p => p.id), p_forcar: true });
  const marca = (s, p, st, mot, obs) => F.academy_marcar({ p_sessao: s, p_pessoa: p.id, p_presenca: st, p_motivo: mot, p_obs: obs });
  const fecha = (s, min) => F.academy_fechar_chamada({ p_sessao: s, p_duracao_min: min });
  const todos = (s, st) => F.academy_marcar_pendentes({ p_sessao: s, p_presenca: st });
  // Turma 01: A1 há 14 dias (2 faltas e 1 justificada) e A2 há 7 dias
  let s = sessao(t1, "N1-A1", -14, "09:00", "11:00", 20, "Victoria Soares"); conv(s, g.t1);
  marca(s, g.t1[9], "Falta", "Não avisou"); marca(s, g.t1[10], "Falta", "Plantão no stand", "Gerente pediu para ficar no stand"); marca(s, g.t1[11], "Justificada / afastado", "Atestado médico"); todos(s, "Presente"); fecha(s, 120);
  // Transferência depois da aula: a gestão da época continua gravada na convocação
  Object.assign(g.t1[0], D.outroGerente(g.t1[0]));
  s = sessao(t1, "N1-A2", -7, "09:00", "12:00", 20, "Victoria Soares"); conv(s, g.t1.slice(0, 9));
  marca(s, g.t1[8], "Falta", "Sem justificativa"); todos(s, "Presente"); fecha(s, 170);
  // Desligamento depois da A2: o histórico fica
  g.t1[5].situacao = "INATIVO"; g.t1[5].saida = somaDias(H, -4);
  // Turma 02: A1 há 9 dias (1 em mesa) e A2 há 2 dias (1 falta)
  s = sessao(t2, "N1-A1", -9, "14:00", "16:00", 15, "Victoria Soares"); conv(s, g.t2); marca(s, g.t2[9], "Em mesa", "Atendendo cliente no plantão"); todos(s, "Presente"); fecha(s, 125);
  s = sessao(t2, "N1-A2", -2, "14:00", "17:00", 15, "Victoria Soares"); conv(s, g.t2.slice(0, 9)); marca(s, g.t2[3], "Falta", "Não avisou"); todos(s, "Presente"); fecha(s, 180);
  // Reposição da A1 há 3 dias: uma pessoa conclui (uma conclusão só), outra falta de novo (reincidência)
  s = sessao(tr, "N1-A1", -3, "17:00", "19:00", 10, "Victoria Soares"); conv(s, [g.t1[9], g.t1[10]]); marca(s, g.t1[10], "Falta", "Plantão no stand"); todos(s, "Presente"); fecha(s, 115);
  // Turma 03: A1 há 6 dias; A2 cancelada há 5 dias (não conta hora nem conclusão); A2 refeita ontem com chamada ABERTA
  s = sessao(t3, "N1-A1", -6, "09:00", "11:00", 15, "Victoria Soares"); conv(s, g.t3); marca(s, g.t3[2], "Falta", "Não avisou"); todos(s, "Presente"); fecha(s, 120);
  s = sessao(t3, "N1-A2", -5, "09:00", "12:00", 15, "Victoria Soares"); conv(s, g.t3.filter((_, i) => i !== 2)); F.academy_cancelar_sessao({ p_sessao: s, p_motivo: "Treinador indisponível" });
  s = sessao(t3, "N1-A2", -1, "09:00", "12:00", 15, "Victoria Soares"); conv(s, g.t3.filter((_, i) => i !== 2));
  g.t3.filter((_, i) => i !== 2).slice(0, 5).forEach(p => marca(s, p, "Presente"));
  // Hoje: A1 da Turma 04 de manhã e A3 da Turma 01 à tarde (chamadas a fazer)
  s = sessao(t4, "N1-A1", 0, "09:00", "11:00", 12, "Victoria Soares"); conv(s, g.t4);
  s = sessao(t1, "N1-A3", 0, "14:00", "17:00", 20, "Victoria Soares"); conv(s, g.t1.slice(0, 8).filter((_, i) => i !== 5));
  // Próximos dias: A3 da Turma 02 e reposição da A1 (fica "agendada")
  s = sessao(t2, "N1-A3", 2, "14:00", "17:00", 15, "Victoria Soares"); conv(s, g.t2.slice(0, 9).filter((_, i) => i !== 3));
  s = sessao(tr, "N1-A1", 3, "17:00", "19:00", 10, "Victoria Soares"); conv(s, [g.t1[10], g.t1[11]]);
  S.auditoria = []; usuario = eu; salva();
}

return {
  entrar(email) { carrega(); const e = String(email).toLowerCase(); usuario = e.startsWith("victoria") ? { nome: "Victoria Soares", papel: "operador" } : e.startsWith("gestor") || e.startsWith("umc") ? { nome: "Superintendência UMC", papel: "gestor" } : { nome: "Pedro Aquino", papel: "admin" }; },
  sair() { usuario = null; },
  rpc(fn, args) { carrega(); if (!F[fn]) erro("funcao_inexistente"); const r = F[fn](args || {}); salva(); return copia(r ?? null); },
  reset() { S = null; try { localStorage.removeItem(CHAVE); } catch (e) { } const eu = usuario; carrega(); usuario = eu; }
};
})();
