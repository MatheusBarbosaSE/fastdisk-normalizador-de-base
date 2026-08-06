import { config } from './config.js';
import {
  removerAcentos, pareceTelefone, pareceCpf, pareceTexto, pareceEmail,
  pareceCabecalhoDeDado, normalizarTelefone
} from './validators.js';

export function indiceParaLetra(i) {
  i += 1; let letra = "";
  while (i > 0) { const resto = (i - 1) % 26; letra = String.fromCharCode(65 + resto) + letra; i = Math.floor((i - 1) / 26); }
  return letra;
}

export function letraParaIndice(letra) {
  letra = letra.trim().toUpperCase();
  let idx = 0;
  for (const c of letra) { idx = idx * 26 + (c.charCodeAt(0) - 64); }
  return idx - 1;
}

export function bateChave(nomeColuna, palavras) {
  const n = removerAcentos(String(nomeColuna)).toLowerCase();
  return palavras.some(p => n.includes(p));
}

export function calcularPreenchimento(valores) {
  if (valores.length === 0) return 0;
  const preenchidas = valores.filter(v => v !== null && v !== undefined && String(v).trim() !== "").length;
  return preenchidas / valores.length;
}

export function amostraValida(valores) {
  return valores.filter(v => v !== null && v !== undefined && String(v).trim() !== "").slice(0, 200);
}

export function selecionarColunaNome(colunas, jaUsadas) {
  const disponiveis = colunas.filter(c => !jaUsadas.has(c.idx));
  const candHeader = disponiveis.filter(c => bateChave(c.nome, config.PALAVRAS_NOME));
  if (candHeader.length) {
    return candHeader.reduce((a, b) => calcularPreenchimento(b.valores) > calcularPreenchimento(a.valores) ? b : a);
  }

  let melhores = [];
  for (const c of disponiveis) {
    const amostra = amostraValida(c.valores);
    if (!amostra.length) continue;
    const taxaTexto = amostra.filter(pareceTexto).length / amostra.length;
    const taxaCpf = amostra.filter(pareceCpf).length / amostra.length;
    const taxaTel = amostra.filter(pareceTelefone).length / amostra.length;
    const taxaEmail = amostra.filter(pareceEmail).length / amostra.length;
    if (taxaTexto >= 0.6 && taxaCpf < 0.3 && taxaTel < 0.3 && taxaEmail < 0.3) {
      melhores.push([c, taxaTexto]);
    }
  }
  if (melhores.length) {
    melhores.sort((a, b) => b[1] - a[1]);
    return melhores[0][0];
  }
  return null;
}

export function selecionarColunaCpf(colunas, jaUsadas) {
  const disponiveis = colunas.filter(c => !jaUsadas.has(c.idx));
  let cands = [];
  for (const c of disponiveis) {
    const amostra = amostraValida(c.valores);
    if (!amostra.length) continue;
    const taxa = amostra.filter(pareceCpf).length / amostra.length;
    if (taxa >= 0.7) cands.push([c, taxa]);
  }
  if (!cands.length) return null;
  const comHeader = cands.filter(([c]) => bateChave(c.nome, config.PALAVRAS_CPF));
  if (comHeader.length) return comHeader[0][0];
  cands.sort((a, b) => b[1] - a[1]);
  return cands[0][0];
}

export function selecionarColunasTelefone(colunas, jaUsadas) {
  const disponiveis = colunas.filter(c => !jaUsadas.has(c.idx));
  let cands = [];
  for (const c of disponiveis) {
    const amostra = amostraValida(c.valores);
    if (!amostra.length) continue;
    const taxa = amostra.filter(pareceTelefone).length / amostra.length;
    if (taxa >= 0.7) cands.push([c, taxa, calcularPreenchimento(c.valores)]);
  }
  cands.sort((a, b) => (b[1] - a[1]) || (b[2] - a[2]));
  return cands.slice(0, config.MAX_COLUNAS_TELEFONE).map(x => x[0]);
}

export function decodeBestEffort(buffer) {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const bad = (utf8.match(/\uFFFD/g) || []).length;
  if (bad > 0) {
    try { return new TextDecoder("windows-1252").decode(buffer); } catch (e) {}
  }
  return utf8;
}

export function parseCsv(buffer) {
  const text = decodeBestEffort(buffer);
  const parsed = Papa.parse(text, { delimiter: "", skipEmptyLines: true });
  return parsed.data;
}

export function parseExcel(buffer) {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
}

export function processarLinhas(rows) {
  if (!rows.length) throw new Error("A planilha está vazia.");

  const largura = Math.max(...rows.map(r => r.length));
  rows = rows.map(r => {
    const novo = r.slice();
    while (novo.length < largura) novo.push("");
    return novo;
  });

  const primeiraLinha = rows[0];
  const suspeitas = primeiraLinha.filter(pareceCabecalhoDeDado).length;
  const semCabecalho = largura > 0 && (suspeitas / largura) >= 0.5;

  let headerRow, dataRows;
  if (semCabecalho) {
    headerRow = primeiraLinha.map((_, i) => `Coluna ${indiceParaLetra(i)}`);
    dataRows = rows;
  } else {
    headerRow = primeiraLinha.map((v, i) => (v === undefined || String(v).trim() === "") ? `Coluna ${indiceParaLetra(i)}` : String(v).trim());
    dataRows = rows.slice(1);
  }

  const totalLinhasOriginal = dataRows.length;
  const colunas = [];
  for (let i = 0; i < largura; i++) {
    colunas.push({
      idx: i,
      letra: indiceParaLetra(i),
      nome: headerRow[i],
      valores: dataRows.map(r => r[i])
    });
  }

  return { colunas, dataRows, totalLinhasOriginal, semCabecalho };
}

// A assinatura agora recebe o parâmetro concatLetras
export function montarBase(colunas, dataRows, totalLinhasOriginal, semCabecalho, extrasLetras, telManual = "", concatLetras = "") {
  const jaUsadas = new Set();
  
  // Clona as matrizes para permitir injeção de colunas virtuais sem afetar o estado global da preview
  let colunasMod = [...colunas];
  let dataRowsMod = dataRows.map(r => [...r]);

  let colunaConcat = null;

  // Lógica de concatenação dinâmica de colunas
  if (concatLetras) {
    const letras = concatLetras.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    if (letras.length > 1) {
      const indices = letras.map(letra => {
        const idx = letraParaIndice(letra);
        if (!colunasMod.find(c => c.idx === idx)) {
          throw new Error(`A coluna '${letra}' informada para concatenação não existe.`);
        }
        return idx;
      });

      const novoIdx = colunasMod.length;
      
      // Concatena os valores com um espaço em branco e injeta na nova coluna da linha
      dataRowsMod.forEach(row => {
        const valores = indices.map(idx => (row[idx] !== undefined && row[idx] !== null) ? String(row[idx]).trim() : "");
        row.push(valores.filter(Boolean).join(" "));
      });

      // Cria a estrutura da coluna virtual
      colunaConcat = {
        idx: novoIdx,
        letra: `CONCAT(${letras.join('+')})`,
        nome: "Concatenada",
        valores: dataRowsMod.map(r => r[novoIdx])
      };
      colunasMod.push(colunaConcat);
    } else if (letras.length === 1) {
      throw new Error("Para concatenar, informe pelo menos duas letras separadas por vírgula (ex: A,B).");
    }
  }

  const colNome = selecionarColunaNome(colunasMod, jaUsadas);
  if (colNome) jaUsadas.add(colNome.idx);

  const colCpf = selecionarColunaCpf(colunasMod, jaUsadas);
  if (colCpf) jaUsadas.add(colCpf.idx);

  const colunasExtras = [];
  
  // Força a inclusão da coluna concatenada como extra, se ela foi criada
  if (colunaConcat) {
    colunasExtras.push(colunaConcat);
    jaUsadas.add(colunaConcat.idx);
  }

  for (let letra of extrasLetras) {
    letra = letra.trim().toUpperCase();
    if (!letra) continue;
    const idx = letraParaIndice(letra);
    const col = colunasMod.find(c => c.idx === idx);
    if (!col) {
      throw new Error(`A coluna de letra '${letra}' não existe nesta planilha.`);
    }
    if (!jaUsadas.has(col.idx)) {
      colunasExtras.push(col);
      jaUsadas.add(col.idx);
    }
  }

  let colunasTelefone = [];
  if (telManual) {
    const letra = telManual.toUpperCase();
    const idx = letraParaIndice(letra);
    const col = colunasMod.find(c => c.idx === idx);
    
    if (!col) {
      throw new Error(`A coluna de telefone informada ('${letra}') não existe nesta planilha.`);
    }
    colunasTelefone.push(col);
  } else {
    colunasTelefone = selecionarColunasTelefone(colunasMod, jaUsadas);
  }

  if (!colunasTelefone.length) {
    throw new Error("Nenhuma coluna de telefone válida foi detectada. Verifique a planilha ou use a seleção manual.");
  }
  colunasTelefone.forEach(c => jaUsadas.add(c.idx));

  const colunasComuns = [colNome, colCpf].filter(Boolean).concat(colunasExtras);
  const colunasFinais = colunasComuns.concat(colunasTelefone);

  let linhasFinais = dataRowsMod.map(row => {
    return colunasFinais.map(col => {
      if (colunasTelefone.includes(col)) return normalizarTelefone(row[col.idx]);
      const v = row[col.idx];
      return (v === undefined || v === null) ? "" : String(v).trim();
    });
  });

  const idxTelInicio = colunasComuns.length;
  let removidasSemTelefone = 0;
  linhasFinais = linhasFinais.filter(linha => {
    const temTel = linha.slice(idxTelInicio).some(v => v !== null && v !== "");
    if (!temTel) removidasSemTelefone++;
    return temTel;
  });

  let removidasDuplicadas = 0;
  const vistos = new Set();
  linhasFinais = linhasFinais.filter(linha => {
    const chave = linha[idxTelInicio];
    if (vistos.has(chave)) { removidasDuplicadas++; return false; }
    vistos.add(chave);
    return true;
  });

  const legenda = [];
  let pos = 1;
  if (colNome) { legenda.push({ posicao: pos++, rotulo: "Nome", original: `${colNome.letra} ("${colNome.nome}")` }); }
  if (colCpf) { legenda.push({ posicao: pos++, rotulo: "CPF", original: `${colCpf.letra} ("${colCpf.nome}")` }); }
  
  colunasExtras.forEach(c => { 
    const isConcat = c.letra.startsWith('CONCAT');
    legenda.push({ 
      posicao: pos++, 
      rotulo: isConcat ? "Extra (Concatenada)" : "Extra (pedida manualmente)", 
      original: isConcat ? c.letra : `${c.letra} ("${c.nome}")` 
    }); 
  });
  
  colunasTelefone.forEach((c, i) => { legenda.push({ posicao: pos++, rotulo: `Telefone ${i + 1}`, original: `${c.letra} ("${c.nome}")` }); });

  return {
    linhasFinais,
    legenda,
    totalLinhasOriginal,
    totalLinhasFinal: linhasFinais.length,
    semCabecalho,
    removidasSemTelefone,
    removidasDuplicadas,
    qtdComuns: colunasComuns.length,
    qtdTelefone: colunasTelefone.length,
    colNome: !!colNome,
    colCpf: !!colCpf,
  };
}

export function linhasParaCsv(linhas) {
  const DELIM = ";";
  return linhas.map(linha =>
    linha.map(v => {
      const s = (v === null || v === undefined) ? "" : String(v);
      const precisaAspas = new RegExp('["' + DELIM + '\\n]').test(s);
      if (precisaAspas) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }).join(DELIM)
  ).join("\r\n") + "\r\n";
}

export function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
