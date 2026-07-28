"""
Utilitários relacionados a colunas: conversão entre a notação de letra
usada em planilhas (A, B, ..., Z, AA, ...) e o índice numérico da
coluna, além de funções auxiliares de apoio à seleção de colunas.
"""

import unicodedata

import pandas as pd


def letra_para_indice(letra: str) -> int:
    """Converte uma letra de coluna em índice zero-based: 'A' -> 0, 'B' -> 1, 'AA' -> 26."""
    letra = letra.strip().upper()
    indice = 0
    for c in letra:
        if not ("A" <= c <= "Z"):
            raise ValueError(f"Letra de coluna inválida: '{letra}'")
        indice = indice * 26 + (ord(c) - ord("A") + 1)
    return indice - 1


def indice_para_letra(indice: int) -> str:
    """Converte um índice zero-based em letra de coluna: 0 -> 'A', 1 -> 'B'."""
    indice += 1
    letra = ""
    while indice > 0:
        indice, resto = divmod(indice - 1, 26)
        letra = chr(65 + resto) + letra
    return letra


def remover_acentos(texto: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn"
    )


def calcular_preenchimento(serie: pd.Series) -> float:
    """Retorna a fração de células não vazias em uma coluna."""
    total = len(serie)
    if total == 0:
        return 0.0
    preenchidas = serie.dropna().astype(str).str.strip().ne("").sum()
    return preenchidas / total
