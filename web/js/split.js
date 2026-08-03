import { linhasParaCsv, downloadBlob } from './core.js';

export function calcularDivisao(totalLinhas, partesTexto) {
  let partes = parseInt(partesTexto, 10);
  if (isNaN(partes) || partes < 2) return null;
  if (partes > totalLinhas) partes = totalLinhas;
  
  return {
    partes: partes,
    tamanhoParte: Math.ceil(totalLinhas / partes)
  };
}

export function baixarPartes(linhasFinais, partes, tamanhoParte, todas, parteEspecifica, lastOutName) {
  if (todas) {
    // Atraso de 600ms entre os downloads para evitar bloqueio anti-spam do navegador
    for (let i = 1; i <= partes; i++) {
      setTimeout(() => baixarParteUnica(linhasFinais, i, tamanhoParte, lastOutName), (i - 1) * 600);
    }
  } else {
    baixarParteUnica(linhasFinais, parteEspecifica, tamanhoParte, lastOutName);
  }
}

function baixarParteUnica(linhas, indice, tamanhoParte, lastOutName) {
  const inicio = (indice - 1) * tamanhoParte;
  const fim = Math.min(inicio + tamanhoParte, linhas.length);
  const pedaco = linhas.slice(inicio, fim);

  if (pedaco.length === 0) return;

  const csv = linhasParaCsv(pedaco);
  const nomeArquivo = `${lastOutName}_parte${indice}.csv`;
  downloadBlob(csv, nomeArquivo, 'text/csv;charset=utf-8');
}
