"""
Seleção automática das colunas relevantes de uma planilha: Nome, CPF e
Telefone(s).

A estratégia é sempre a mesma para cada tipo de coluna:
  1. tentar identificar pelo nome do cabeçalho original, quando ele é
     informativo (ex.: uma coluna chamada "CPF" quase certamente é um CPF);
  2. na ausência de um cabeçalho útil, decidir pelo conteúdo, amostrando
     os valores da coluna e aplicando os validadores de `validators.py`.
"""

import pandas as pd

from . import config, validators
from .column_utils import calcular_preenchimento, remover_acentos


def _bate_palavra_chave(nome_coluna, palavras) -> bool:
    nome_norm = remover_acentos(str(nome_coluna)).lower()
    return any(p in nome_norm for p in palavras)


def _amostra_valida(serie: pd.Series):
    amostra = serie.dropna().astype(str)
    amostra = amostra[amostra.str.strip() != ""]
    return amostra.head(config.TAMANHO_AMOSTRA)


def selecionar_coluna_nome(df: pd.DataFrame, ja_usadas: set) -> str | None:
    disponiveis = [c for c in df.columns if c not in ja_usadas]

    candidatos_header = [c for c in disponiveis if _bate_palavra_chave(c, config.PALAVRAS_CHAVE_NOME)]
    if candidatos_header:
        return max(candidatos_header, key=lambda c: calcular_preenchimento(df[c]))

    candidatos_conteudo = []
    for coluna in disponiveis:
        amostra = _amostra_valida(df[coluna])
        if amostra.empty:
            continue

        taxa_texto = amostra.apply(validators.parece_texto).mean()
        taxa_cpf = amostra.apply(validators.parece_cpf).mean()
        taxa_telefone = amostra.apply(validators.parece_telefone).mean()
        taxa_email = amostra.apply(validators.parece_email).mean()

        # Uma coluna só é candidata a "Nome" se for majoritariamente texto
        # e não tiver traços fortes de CPF, telefone ou email -- isso
        # evita confundir, por exemplo, uma coluna de cidade.
        if (
            taxa_texto >= config.LIMIAR_TEXTO_NOME
            and taxa_cpf < 0.3
            and taxa_telefone < 0.3
            and taxa_email < 0.3
        ):
            candidatos_conteudo.append((coluna, taxa_texto))

    if candidatos_conteudo:
        return max(candidatos_conteudo, key=lambda item: item[1])[0]

    return None


def selecionar_coluna_cpf(df: pd.DataFrame, ja_usadas: set) -> str | None:
    disponiveis = [c for c in df.columns if c not in ja_usadas]

    candidatos = []
    for coluna in disponiveis:
        amostra = _amostra_valida(df[coluna])
        if amostra.empty:
            continue
        taxa_cpf = amostra.apply(validators.parece_cpf).mean()
        if taxa_cpf >= config.LIMIAR_CPF:
            candidatos.append((coluna, taxa_cpf))

    if not candidatos:
        return None

    candidatos_header = [c for c, _ in candidatos if _bate_palavra_chave(c, config.PALAVRAS_CHAVE_CPF)]
    if candidatos_header:
        return candidatos_header[0]

    return max(candidatos, key=lambda item: item[1])[0]


def selecionar_colunas_telefone(df: pd.DataFrame, ja_usadas: set) -> list:
    disponiveis = [c for c in df.columns if c not in ja_usadas]

    candidatos = []
    for coluna in disponiveis:
        amostra = _amostra_valida(df[coluna])
        if amostra.empty:
            continue
        taxa_telefone = amostra.apply(validators.parece_telefone).mean()
        if taxa_telefone >= config.LIMIAR_TELEFONE:
            candidatos.append((coluna, taxa_telefone, calcular_preenchimento(df[coluna])))

    # Prioriza colunas com maior taxa de acerto e, em empate, maior preenchimento.
    candidatos.sort(key=lambda item: (item[1], item[2]), reverse=True)
    return [coluna for coluna, _, _ in candidatos[: config.MAX_COLUNAS_TELEFONE]]
