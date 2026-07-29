"""
Exportação dos artefatos finais do processamento: o CSV pronto para a
discadora e o arquivo de legenda que documenta a ordem e o significado
de cada coluna do CSV gerado.
"""

from pathlib import Path

import pandas as pd

from . import config


def exportar_csv(df_saida: pd.DataFrame, caminho_saida: Path) -> None:
    """Grava o CSV final no formato aceito pela discadora: sem cabeçalho,
    separado por `config.DELIMITADOR_SAIDA`, com quebra de linha
    `config.QUEBRA_DE_LINHA_SAIDA`."""
    df_saida.to_csv(
        caminho_saida,
        index=False,
        header=False,
        sep=config.DELIMITADOR_SAIDA,
        lineterminator=config.QUEBRA_DE_LINHA_SAIDA,
    )


def montar_legenda(col_nome, col_cpf, colunas_extras, colunas_telefone, letras_originais) -> list[dict]:
    """
    Monta a lista ordenada que descreve o que é cada coluna do CSV final,
    na mesma ordem em que elas aparecem no arquivo.
    """
    legenda = []
    posicao = 1

    if col_nome:
        legenda.append({
            "posicao": posicao,
            "rotulo": "Nome",
            "coluna_original": f'{letras_originais[col_nome]} ("{col_nome}")',
        })
        posicao += 1

    if col_cpf:
        legenda.append({
            "posicao": posicao,
            "rotulo": "CPF",
            "coluna_original": f'{letras_originais[col_cpf]} ("{col_cpf}")',
        })
        posicao += 1

    for coluna in colunas_extras:
        legenda.append({
            "posicao": posicao,
            "rotulo": "Extra (selecionada manualmente)",
            "coluna_original": f'{letras_originais[coluna]} ("{coluna}")',
        })
        posicao += 1

    for indice, coluna in enumerate(colunas_telefone, start=1):
        legenda.append({
            "posicao": posicao,
            "rotulo": f"Telefone {indice}",
            "coluna_original": f'{letras_originais[coluna]} ("{coluna}")',
        })
        posicao += 1

    return legenda


def exportar_legenda(
    legenda: list[dict],
    caminho_saida: Path,
    total_colunas_comuns: int,
    total_colunas_telefone: int,
) -> Path:
    """Grava o arquivo `<nome>_legenda.txt` ao lado do CSV de saída."""
    caminho_legenda = Path(caminho_saida).with_name(Path(caminho_saida).stem + "_legenda.txt")

    with open(caminho_legenda, "w", encoding="utf-8") as arquivo:
        arquivo.write(f"LEGENDA DAS COLUNAS - {Path(caminho_saida).name}\n")
        arquivo.write("=" * 60 + "\n")
        arquivo.write(f"Nº de colunas de dados comuns (informar na discadora): {total_colunas_comuns}\n")
        arquivo.write(f"Nº de colunas de telefone: {total_colunas_telefone}\n\n")

        for item in legenda:
            arquivo.write(
                f"Coluna {item['posicao']}: {item['rotulo']}  "
                f"(coluna original do cliente: {item['coluna_original']})\n"
            )

    return caminho_legenda
