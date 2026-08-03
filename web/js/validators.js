import { config } from './config.js';

export function removerAcentos(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}

export function limparDigitos(v) {
  if (v === null || v === undefined) return "";
  return String(v).replace(/\D/g, "");
}

export function normalizarTelefone(v) {
  let d = limparDigitos(v);
  if (!d) return null;
  if (d.startsWith("55") && (d.length === config.TAM_MIN + 2 || d.length === config.TAM_MAX + 2)) d = d.slice(2);
  if ((d.length === config.TAM_MIN + 1 || d.length === config.TAM_MAX + 1) && d.startsWith("0")) d = d.slice(1);
  if (d.length !== config.TAM_MIN && d.length !== config.TAM_MAX) return null;
  const ddd = parseInt(d.slice(0, 2), 10);
  if (!config.DDD_VALIDOS.has(ddd)) return null;
  if (d.length === config.TAM_MAX && d[2] !== "9") return null;
  return d;
}

export function pareceTelefone(v) { 
  return normalizarTelefone(v) !== null; 
}

export function cpfValido(d) {
  if (d.length !== 11) return false;
  if (d.split("").every(c => c === d[0])) return false;
  
  function dv(parcial) {
    let peso = parcial.length + 1, soma = 0;
    for (let i = 0; i < parcial.length; i++) soma += parseInt(parcial[i], 10) * (peso - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? "0" : String(resto);
  }
  
  const dv1 = dv(d.slice(0, 9));
  const dv2 = dv(d.slice(0, 9) + dv1);
  return d.slice(-2) === dv1 + dv2;
}

export function pareceCpf(v) {
  const d = limparDigitos(v);
  if (d.length !== 11) return false;
  const texto = String(v).trim();
  const formatoCpf = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(texto);
  return cpfValido(d) || formatoCpf;
}

export function pareceTexto(v) {
  if (v === null || v === undefined) return false;
  const texto = String(v).trim();
  if (!texto) return false;
  const letras = (texto.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
  return letras / Math.max(texto.length, 1) > 0.5;
}

export function pareceEmail(v) {
  if (v === null || v === undefined) return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v).trim());
}

export function pareceCabecalhoDeDado(nomeColuna) {
  const texto = String(nomeColuna).trim();
  if (!texto || texto.toLowerCase().startsWith("coluna_auto")) return false;
  if (pareceEmail(texto)) return true;
  const d = texto.replace(/\D/g, "");
  return d.length >= 8;
}
