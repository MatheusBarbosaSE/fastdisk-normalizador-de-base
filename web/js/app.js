import { 
  parseCsv, parseExcel, processarLinhas, montarBase, linhasParaCsv, downloadBlob,
  selecionarColunaNome, selecionarColunaCpf, selecionarColunasTelefone
} from './core.js';

import { calcularDivisao, baixarPartes } from './split.js';

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const dzFile = document.getElementById('dzFile');
const dzFileName = document.getElementById('dzFileName');
const extrasInput = document.getElementById('extrasInput');
const processBtn = document.getElementById('processBtn');
const msgBox = document.getElementById('msgBox');
const results = document.getElementById('results');
const splitPartsInput = document.getElementById('splitParts');
const splitInfo = document.getElementById('splitInfo');
const splitDownloads = document.getElementById('splitDownloads');

const telManualWrapper = document.getElementById('telManualWrapper');
const telManualInput = document.getElementById('telManualInput');
const concatInput = document.getElementById('concatInput');

let currentFile = null;
let currentParsed = null;
let lastResult = null;
let lastOutName = "base_pronta";
let ordemConcat = [];

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
dropzone.addEventListener('drop', e => {
  e.preventDefault(); dropzone.classList.remove('drag');
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});

extrasInput.addEventListener('input', () => {
  const valoresDigitados = extrasInput.value.split(',').map(s => s.trim().toUpperCase());
  document.querySelectorAll('.extra-col-cb').forEach(cb => {
    cb.checked = valoresDigitados.includes(cb.value);
  });
});

concatInput.addEventListener('input', () => {
  const digitado = concatInput.value.toUpperCase();
  const letrasMencionadas = digitado.match(/[A-Z]+/g) || [];
  
  document.querySelectorAll('.concat-col-cb').forEach(cb => {
    cb.checked = letrasMencionadas.includes(cb.value);
  });
});

telManualInput.addEventListener('input', () => {
  const valoresDigitados = telManualInput.value.split(',').map(s => s.trim().toUpperCase());
  document.querySelectorAll('.tel-col-cb').forEach(cb => {
    cb.checked = valoresDigitados.includes(cb.value);
  });
});

async function parseArquivo(file) {
  const buffer = await file.arrayBuffer();
  const ext = file.name.split('.').pop().toLowerCase();
  const rows = (ext === 'csv') ? parseCsv(buffer) : parseExcel(buffer);
  return processarLinhas(rows);
}

async function handleFile(file) {
  currentFile = file;
  dzFileName.textContent = file.name;
  dzFile.style.display = 'flex';
  hideMsg();
  results.style.display = 'none';
  document.getElementById('previewSection').style.display = 'none';
  processBtn.disabled = true;
  lastOutName = file.name.replace(/\.(csv|xlsx|xls)$/i, "") + "_pronta";
  
  extrasInput.value = ''; 
  concatInput.value = '';
  telManualInput.value = '';
  ordemConcat = [];

  try {
    currentParsed = await parseArquivo(file);
    renderPreviewGrid(currentParsed);
    processBtn.disabled = false;
  } catch (err) {
    showMsg("Erro ao ler o arquivo: " + err.message, "err");
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderPreviewGrid(parsed) {
  const { colunas, dataRows, semCabecalho } = parsed;
  const jaUsadas = new Set();
  
  const colNome = selecionarColunaNome(colunas, jaUsadas);
  if (colNome) jaUsadas.add(colNome.idx);
  
  const colCpf = selecionarColunaCpf(colunas, jaUsadas);
  if (colCpf) jaUsadas.add(colCpf.idx);
  
  const colunasTelefone = selecionarColunasTelefone(colunas, jaUsadas);
  const telIdx = new Set(colunasTelefone.map(c => c.idx));

  const table = document.getElementById('excelGrid');
  table.innerHTML = '';

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  const corner = document.createElement('th');
  corner.className = 'corner';
  corner.textContent = '#';
  trHead.appendChild(corner);

  colunas.forEach(col => {
    const th = document.createElement('th');
    let det = '';
    let badge = '-';
    let detectadaAuto = false;

    if (colNome && col.idx === colNome.idx) { det = 'det-nome'; badge = 'Nome'; detectadaAuto = true; }
    else if (colCpf && col.idx === colCpf.idx) { det = 'det-cpf'; badge = 'CPF'; detectadaAuto = true; }
    else if (telIdx.has(col.idx)) { det = 'det-tel'; badge = 'Telefone'; detectadaAuto = true; }

    const wrap = document.createElement('div');
    wrap.className = 'col-head ' + det;

    let conteudoHtml = `<div class="letter">${col.letra}${!semCabecalho ? ' · ' + escapeHtml(String(col.nome)) : ''}</div>`;

    if (detectadaAuto) {
      conteudoHtml += `
        <div style="display:flex; flex-direction:column; align-items:flex-start; gap:4px; margin-top:3px;">
          <span class="badge">${badge}</span>
          <label class="col-check" title="Concatenar esta coluna com outra">
            <input type="checkbox" class="concat-col-cb" value="${col.letra}">
            <span>Concatenar</span>
          </label>
        </div>
      `;
    } else {
      conteudoHtml += `
        <div style="display:flex; flex-direction:column; align-items:flex-start; margin-top:3px;">
          <label class="col-check" title="Definir como coluna de Telefone">
            <input type="checkbox" class="tel-col-cb" value="${col.letra}">
            <span>Telefone</span>
          </label>
          <label class="col-check" title="Adicionar como coluna extra">
            <input type="checkbox" class="extra-col-cb" value="${col.letra}">
            <span>Manter</span>
          </label>
          <label class="col-check" title="Concatenar esta coluna com outra">
            <input type="checkbox" class="concat-col-cb" value="${col.letra}">
            <span>Concatenar</span>
          </label>
        </div>
      `;
    }

    wrap.innerHTML = conteudoHtml;
    th.appendChild(wrap);
    trHead.appendChild(th);
  });
  
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const linhasVisiveis = dataRows.slice(0, 15);
  linhasVisiveis.forEach((row, i) => {
    const tr = document.createElement('tr');
    const tdNum = document.createElement('td');
    tdNum.className = 'rownum';
    tdNum.textContent = i + 1;
    tr.appendChild(tdNum);
    
    colunas.forEach(col => {
      const td = document.createElement('td');
      td.className = 'cell';
      td.textContent = row[col.idx] ?? '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  
  table.appendChild(tbody);
  document.getElementById('previewRowCount').textContent =
    `· ${dataRows.length} linha${dataRows.length === 1 ? '' : 's'}${dataRows.length > 15 ? ' (mostrando as 15 primeiras)' : ''}${semCabecalho ? ' · sem cabeçalho detectado' : ''}`;

  document.querySelectorAll('.extra-col-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const selecionadas = Array.from(document.querySelectorAll('.extra-col-cb'))
        .filter(c => c.checked)
        .map(c => c.value);
      extrasInput.value = selecionadas.join(',');
    });
  });

  document.querySelectorAll('.concat-col-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      if (e.target.checked) {
        ordemConcat.push(e.target.value);
      } else {
        ordemConcat = ordemConcat.filter(v => v !== e.target.value);
      }
      // Mantemos o que já havia sido digitado após uma vírgula, e atualizamos o primeiro grupo com os clicks
      const partes = concatInput.value.split(',');
      partes[0] = ordemConcat.join('+');
      concatInput.value = partes.join(',').replace(/^,|,$/g, '');
    });
  });

  document.querySelectorAll('.tel-col-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const selecionadas = Array.from(document.querySelectorAll('.tel-col-cb'))
        .filter(c => c.checked)
        .map(c => c.value);
      telManualInput.value = selecionadas.join(',');
      
      if (selecionadas.length > 0) {
        telManualWrapper.style.display = 'block';
      }
    });
  });

  if (!colunasTelefone.length) {
    telManualWrapper.style.display = 'block';
    showMsg("ℹ Nenhuma coluna de telefone detectada automaticamente. Marque o checkbox 'Telefone' na tabela ou digite a letra no campo destacado.", "warn");
  } else {
    telManualWrapper.style.display = 'none';
    telManualInput.value = ''; 
  }

  document.getElementById('previewSection').style.display = 'block';
}

function showMsg(text, type) {
  msgBox.textContent = text;
  msgBox.className = 'msg ' + type;
}

function hideMsg() {
  msgBox.className = 'msg';
}

processBtn.addEventListener('click', async () => {
  if (!currentParsed) return;
  hideMsg();
  processBtn.disabled = true;
  processBtn.textContent = "Processando...";

  try {
    const { colunas, dataRows, totalLinhasOriginal, semCabecalho } = currentParsed;
    const extrasLetras = extrasInput.value.split(',').map(s => s.trim()).filter(Boolean);
    const telManual = telManualInput.value.trim();
    const concatLetras = concatInput.value.trim();
    
    const resultado = montarBase(colunas, dataRows, totalLinhasOriginal, semCabecalho, extrasLetras, telManual, concatLetras);

    lastResult = resultado;
    renderResultado(resultado);

    if (semCabecalho) showMsg("ℹ Planilha identificada como SEM cabeçalho, nenhuma linha de dado foi perdida.", "warn");
    if (!resultado.colNome) showMsg((msgBox.textContent ? msgBox.textContent + " · " : "") + "Nenhuma coluna de Nome foi identificada.", "warn");
    if (!resultado.colCpf) showMsg((msgBox.textContent ? msgBox.textContent + " · " : "") + "Nenhuma coluna de CPF foi identificada.", "warn");

  } catch (err) {
    showMsg("Erro: " + err.message, "err");
    results.style.display = 'none';
  } finally {
    processBtn.disabled = false;
    processBtn.textContent = "Processar base";
  }
});

function renderResultado(r) {
  results.style.display = 'block';

  document.getElementById('statLinhas').textContent = r.totalLinhasFinal;
  document.getElementById('statComuns').textContent = r.qtdComuns;
  document.getElementById('statTel').textContent = r.qtdTelefone;
  document.getElementById('statRemovidas').textContent = r.removidasSemTelefone + r.removidasDuplicadas;

  const chain = document.getElementById('chain');
  chain.innerHTML = '';
  r.legenda.forEach((item, i) => {
    if (i > 0) {
      const arrow = document.createElement('span');
      arrow.className = 'arrow'; arrow.textContent = '→';
      chain.appendChild(arrow);
    }
    const chip = document.createElement('div');
    const isTel = item.rotulo.startsWith('Telefone');
    const isExtra = item.rotulo.startsWith('Extra');
    chip.className = 'chip' + (isTel ? ' tel' : '') + (isExtra ? ' extra' : '');
    chip.innerHTML = `<span class="k ${isExtra ? 'extra-k' : ''}">${item.posicao}. ${item.rotulo}</span><span class="v">${item.original}</span>`;
    chain.appendChild(chip);
  });

  const table = document.getElementById('previewTable');
  table.innerHTML = '';
  const thead = document.createElement('tr');
  r.legenda.forEach(item => {
    const th = document.createElement('th');
    th.textContent = item.rotulo;
    thead.appendChild(th);
  });
  table.appendChild(thead);
  
  r.linhasFinais.slice(0, 5).forEach(linha => {
    const tr = document.createElement('tr');
    linha.forEach(v => {
      const td = document.createElement('td');
      td.textContent = v === null ? '' : v;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  document.getElementById('outFileName').textContent = lastOutName + '.csv';

  splitPartsInput.value = 2;
  atualizarInfoDivisaoUI();
}

document.getElementById('downloadBtn').addEventListener('click', () => {
  if (!lastResult) return;
  const csv = linhasParaCsv(lastResult.linhasFinais);
  downloadBlob(csv, lastOutName + '.csv', 'text/csv;charset=utf-8');
});

document.getElementById('downloadLegendaBtn').addEventListener('click', () => {
  if (!lastResult) return;
  let txt = `LEGENDA DAS COLUNAS - ${lastOutName}.csv\n`;
  txt += '='.repeat(60) + '\n';
  txt += `Nº de colunas de dados comuns (informar na discadora): ${lastResult.qtdComuns}\n`;
  txt += `Nº de colunas de telefone: ${lastResult.qtdTelefone}\n\n`;
  lastResult.legenda.forEach(item => {
    txt += `Coluna ${item.posicao}: ${item.rotulo}  (coluna original do cliente: ${item.original})\n`;
  });
  downloadBlob(txt, lastOutName + '_legenda.txt', 'text/plain;charset=utf-8');
});

function atualizarInfoDivisaoUI() {
  if (!lastResult || !lastResult.linhasFinais.length) return;

  const configDivisao = calcularDivisao(lastResult.linhasFinais.length, splitPartsInput.value);
  
  if (!configDivisao) {
    splitInfo.textContent = 'Mínimo de 2 partes necessárias.';
    splitDownloads.style.display = 'none';
    return;
  }

  splitInfo.innerHTML = `Cada arquivo terá no máximo <strong style="color: var(--accent);">${configDivisao.tamanhoParte}</strong> linhas.`;
  gerarBotoesDivisaoUI(configDivisao.partes, configDivisao.tamanhoParte);
}

function gerarBotoesDivisaoUI(partes, tamanhoParte) {
  splitDownloads.innerHTML = '';
  splitDownloads.style.display = 'flex';

  const btnBaixarTodas = document.createElement('button');
  btnBaixarTodas.className = 'primary';
  btnBaixarTodas.textContent = '⬇ Baixar todas as partes';
  btnBaixarTodas.onclick = () => baixarPartes(lastResult.linhasFinais, partes, tamanhoParte, true, null, lastOutName);
  splitDownloads.appendChild(btnBaixarTodas);

  for (let i = 1; i <= partes; i++) {
    const btn = document.createElement('button');
    btn.className = 'ghost';
    btn.textContent = `Parte ${i}`;
    btn.onclick = () => baixarPartes(lastResult.linhasFinais, partes, tamanhoParte, false, i, lastOutName);
    splitDownloads.appendChild(btn);
  }
}

splitPartsInput.addEventListener('input', atualizarInfoDivisaoUI);
