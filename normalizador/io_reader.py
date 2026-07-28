"""
Leitura de planilhas de entrada (.csv, .xlsx, .xls).

Responsabilidades deste módulo:
  - detectar o encoding correto de arquivos CSV;
  - detectar se a planilha possui ou não uma linha de cabeçalho;
  - devolver os dados já em um DataFrame pandas, junto com o mapeamento
    de cada coluna para sua letra de posição original (A, B, C, ...).
"""

from pathlib import Path

import pandas as pd

from . import validators
from .column_utils import indice_para_letra

ENCODINGS_SUPORTADOS = ["utf-8", "utf-8-sig", "cp1252", "latin-1"]


def ler_csv_com_encoding(caminho, header="infer") -> pd.DataFrame:
    """
    Tenta ler um CSV testando, em ordem, os encodings mais comuns em
    planilhas de origem brasileira.
    """
    ultimo_erro = None
    for encoding in ENCODINGS_SUPORTADOS:
        try:
            return pd.read_csv(
                caminho, dtype=str, sep=None, engine="python",
                encoding=encoding, header=header,
            )
        except (UnicodeDecodeError, UnicodeError) as erro:
            ultimo_erro = erro
            continue

    raise ValueError(
        f"Não foi possível ler o arquivo com nenhum dos encodings testados "
        f"({', '.join(ENCODINGS_SUPORTADOS)}). Erro original: {ultimo_erro}"
    )


def parece_cabecalho_de_dado(nome_coluna) -> bool:
    """
    Indica se um 'nome de coluna' na verdade parece ser um dado (email,
    telefone, CPF, número longo) -- sinal de que a planilha não tinha
    cabeçalho e a primeira linha de dados foi lida como se fosse um.
    """
    texto = str(nome_coluna).strip()
    if not texto or texto.lower().startswith("unnamed"):
        return False
    if validators.parece_email(texto):
        return True
    digitos = "".join(c for c in texto if c.isdigit())
    return len(digitos) >= 8


def ler_planilha(caminho_entrada: Path):
    """
    Lê a planilha de entrada e devolve:
      - df: DataFrame com os dados (todos os valores como string);
      - sem_cabecalho: True se a planilha não possuía cabeçalho;
      - letras_originais: dict {nome_da_coluna_no_df: letra_original}.
    """
    is_csv = caminho_entrada.suffix.lower() == ".csv"

    if is_csv:
        df = ler_csv_com_encoding(caminho_entrada)
    else:
        df = pd.read_excel(caminho_entrada, dtype=str)

    colunas_suspeitas = sum(parece_cabecalho_de_dado(c) for c in df.columns)
    sem_cabecalho = len(df.columns) > 0 and colunas_suspeitas / len(df.columns) >= 0.5

    if sem_cabecalho:
        if is_csv:
            df = ler_csv_com_encoding(caminho_entrada, header=None)
        else:
            df = pd.read_excel(caminho_entrada, dtype=str, header=None)

    letras_originais = {df.columns[i]: indice_para_letra(i) for i in range(len(df.columns))}

    if sem_cabecalho:
        df.columns = [f"Coluna {letras_originais[c]}" for c in df.columns]
        letras_originais = {df.columns[i]: indice_para_letra(i) for i in range(len(df.columns))}

    return df, sem_cabecalho, letras_originais
