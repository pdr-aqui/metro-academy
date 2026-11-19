"use strict";
/* Pessoas FICTÍCIAS para a demonstração (nenhuma vem da ETV). Mesmo formato do cadastro real: ID no padrão da coluna ID da ETV. */
window.AcademyDemoDados = {
  gera() {
    let sem = 20261118; const rnd = () => (sem = (sem * 1103515245 + 12345) % 2147483648) / 2147483648, pega = l => l[Math.floor(rnd() * l.length)];
    const NOMES = ["ANA", "BRUNO", "CAMILA", "DIEGO", "ELAINE", "FABIO", "GABRIELA", "HUGO", "ISABELA", "JOAO", "KARINA", "LUCAS", "MARIANA", "NATAN", "OLIVIA", "PAULO", "QUEZIA", "RAFAEL", "SABRINA", "TIAGO", "VANESSA", "WAGNER", "YASMIN", "ALINE", "BEATRIZ", "CAIO", "DANIELA", "EDUARDO", "FERNANDA", "GUSTAVO", "HELENA", "IGOR", "JULIA", "LEANDRO", "MELISSA", "NICOLAS", "PRISCILA", "RENATO", "SUELEN", "THAIS", "VINICIUS", "LARISSA", "MATEUS", "RENATA", "SAMUEL", "TATIANE", "VITOR", "BIANCA", "CARLOS", "DEBORA"];
    const SOBRE = ["ALMEIDA", "BARBOSA", "CARDOSO", "DIAS", "ESTEVES", "FARIAS", "GOMES", "HOLANDA", "IGNACIO", "JARDIM", "LIMA", "MACEDO", "NOGUEIRA", "OLIVEIRA", "PEIXOTO", "QUEIROZ", "RAMOS", "SANTANA", "TEIXEIRA", "VIANA", "XAVIER", "ZANETTI", "MOURA", "PRADO", "REIS", "SALES", "TAVARES", "VALENTE", "AZEVEDO", "BRAGA"];
    const DIR = ["DIRETOR FICTICIO NORTE", "DIRETOR FICTICIO SUL", "DIRETOR FICTICIO LESTE"];
    const hier = []; DIR.forEach((d, i) => [1, 2].forEach(k => { const sup = `SUPERINT. FICTICIO ${i * 2 + k}`; [1, 2, 3].forEach(m => hier.push({ diretor: d, superintendente: sup, gerente: `GERENTE FICTICIO ${(i * 2 + k - 1) * 3 + m}` })); }));
    const usados = new Set(), pessoas = [];
    for (let i = 0; i < 150; i++) {
      let nome; do { nome = `${pega(NOMES)} ${pega(SOBRE)} ${pega(SOBRE)}`; } while (usados.has(nome)); usados.add(nome);
      const p1 = nome.split(" "), h = hier[i % hier.length]; let id;
      do { id = (p1[0].slice(0, 3) + p1[2].slice(-3) + String(100 + Math.floor(rnd() * 900))).toUpperCase(); } while (usados.has(id)); usados.add(id);
      pessoas.push({ id, nome, apelido: rnd() < .45 ? `${p1[0].charAt(0)}${p1[0].slice(1).toLowerCase()} ${p1[1].charAt(0)}.` : "", funcao: rnd() < .08 ? "COORDENADOR DE VENDAS 3.0" : `CONSULTOR DE VENDAS ${pega(["1.0", "1.5", "2.0"])}`, situacao: "ATIVO", ...h, entrada: null, saida: null });
    }
    // 4 IDs repetidos: quem entrou depois recebe o sufixo -2 (mesma regra do banco); 2 com nome incompleto ficam sem ID
    pessoas.slice(144, 148).forEach((p, i) => { p.id = pessoas[60 + i].id + "-2"; });
    pessoas.slice(148).forEach(p => { p.id = null; });
    const grupos = { t1: pessoas.slice(0, 12), t2: pessoas.slice(12, 22), t3: pessoas.slice(22, 32), t4: pessoas.slice(32, 40), t0: pessoas.slice(40, 52) };
    return { pessoas, grupos, outroGerente: p => { const h = hier.find(x => x.gerente !== p.gerente && x.diretor !== p.diretor); return { ...h }; } };
  }
};
