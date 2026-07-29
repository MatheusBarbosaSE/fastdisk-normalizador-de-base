"""
Orquestração do fluxo completo de normalização: lê a planilha de
entrada, seleciona as colunas relevantes, normaliza os dados e produz
o CSV final junto com a legenda de colunas.

Este módulo não implementa regras de validação ou de leitura de arquivo
-- ele apenas coordena os módulos especializados (`io_reader`,
`column_selector`, `validators`, `exporter`) na ordem correta.
"""

from pathlib import Path

from . import column_selector, exporter, validators
from .column_utils import indice_para_letra
from .io_reader import ler_planilha


def processar_planilha(
    caminho_entrada: str,
    caminho_saida: str,
    colunas_extras_letras: list | None = None,
    verbose: bool = True,
) -> dict:
    """
    Processa a planilha de entrada e gera o CSV pronto para a discadora.

    Args:
        caminho_entrada: caminho do arquivo de origem (.csv, .xlsx ou .xls).
        caminho_saida: caminho do CSV a ser gerado.
        colunas_extras_letras: letras de colunas adicionais a manter,
            além de Nome/CPF/Telefone (ex.: ["B", "D"]).
        verbose: se True, imprime um resumo do processamento no console.

    Returns:
        Um dicionário com as estatísticas do processamento.

    Raises:
        ValueError: se a planilha estiver vazia, se nenhuma coluna de
            telefone válida for encontrada, ou se uma letra de coluna
            extra informada não existir na planilha.
    """
    caminho_entrada = Path(caminho_entrada)
    colunas_extras_letras = colunas_extras_letras or []

    df, sem_cabecalho_detectado, letras_originais = ler_planilha(caminho_entrada)

    if df.empty:
        raise ValueError("A planilha está vazia.")

    total_linhas_original = len(df)
    letra_para_coluna = {letra: coluna for coluna, letra in letras_originais.items()}

    ja_usadas: set = set()

    col_nome = column_selector.selecionar_coluna_nome(df, ja_usadas)
    if col_nome:
        ja_usadas.add(col_nome)

    col_cpf = column_selector.selecionar_coluna_cpf(df, ja_usadas)
    if col_cpf:
        ja_usadas.add(col_cpf)

    colunas_extras = []
    for letra in colunas_extras_letras:
        letra = letra.strip().upper()
        coluna = letra_para_coluna.get(letra)
        if coluna is None:
            raise ValueError(
                f"A coluna de letra '{letra}' não existe nesta planilha "
                f"(ela tem {len(df.columns)} colunas, de A a "
                f"{indice_para_letra(len(df.columns) - 1)})."
            )
        if coluna not in ja_usadas:
            colunas_extras.append(coluna)
            ja_usadas.add(coluna)

    colunas_telefone = column_selector.selecionar_colunas_telefone(df, ja_usadas)
    if not colunas_telefone:
        raise ValueError(
            "Nenhuma coluna de telefone válida foi identificada na planilha "
            "(verifique se os números possuem DDD válido)."
        )
    ja_usadas.update(colunas_telefone)

    colunas_comuns = [c for c in [col_nome, col_cpf] if c] + colunas_extras

    df_saida = df[colunas_comuns + colunas_telefone].copy()

    for coluna in colunas_telefone:
        df_saida[coluna] = df[coluna].apply(validators.normalizar_telefone)

    for coluna in colunas_comuns:
        df_saida[coluna] = df_saida[coluna].astype(str).str.strip()
        df_saida[coluna] = df_saida[coluna].replace({"nan": "", "None": ""})

    linhas_antes = len(df_saida)
    df_saida = df_saida[df_saida[colunas_telefone].notna().any(axis=1)]
    linhas_sem_telefone = linhas_antes - len(df_saida)

    linhas_antes_dedupe = len(df_saida)
    df_saida = df_saida.drop_duplicates(subset=[colunas_telefone[0]], keep="first")
    duplicados_removidos = linhas_antes_dedupe - len(df_saida)

    exporter.exportar_csv(df_saida, caminho_saida)

    legenda = exporter.montar_legenda(col_nome, col_cpf, colunas_extras, colunas_telefone, letras_originais)
    caminho_legenda = exporter.exportar_legenda(
        legenda, caminho_saida, total_colunas_comuns=len(colunas_comuns),
        total_colunas_telefone=len(colunas_telefone),
    )

    resumo = {
        "linhas_originais": total_linhas_original,
        "linhas_finais": len(df_saida),
        "sem_cabecalho_detectado": sem_cabecalho_detectado,
        "coluna_nome_encontrada": bool(col_nome),
        "coluna_cpf_encontrada": bool(col_cpf),
        "colunas_extras_usadas": colunas_extras,
        "colunas_telefone_usadas": colunas_telefone,
        "linhas_removidas_sem_telefone_valido": linhas_sem_telefone,
        "linhas_removidas_duplicadas": duplicados_removidos,
        "legenda_colunas": legenda,
        "arquivo_csv_discadora": str(caminho_saida),
        "arquivo_legenda": str(caminho_legenda),
    }

    if verbose:
        imprimir_resumo(resumo)

    return resumo


def imprimir_resumo(resumo: dict) -> None:
    """Imprime no console um resumo legível do processamento realizado."""
    print("=" * 60)
    print("RESUMO DO PROCESSAMENTO")
    print("=" * 60)

    if resumo["sem_cabecalho_detectado"]:
        print("ℹ Planilha identificada como SEM cabeçalho (nenhuma linha perdida).")

    print(f"Linhas na planilha original : {resumo['linhas_originais']}")
    print(f"Linhas na base final        : {resumo['linhas_finais']}")

    if not resumo["coluna_nome_encontrada"]:
        print("\nℹ Nenhuma coluna de Nome foi identificada (seguiu sem ela).")
    if not resumo["coluna_cpf_encontrada"]:
        print("ℹ Nenhuma coluna de CPF foi identificada (seguiu sem ela).")

    print(f"\nLinhas removidas (sem telefone válido): {resumo['linhas_removidas_sem_telefone_valido']}")
    print(f"Linhas removidas (telefone duplicado)  : {resumo['linhas_removidas_duplicadas']}")

    total_comuns = (
        (1 if resumo["coluna_nome_encontrada"] else 0)
        + (1 if resumo["coluna_cpf_encontrada"] else 0)
        + len(resumo["colunas_extras_usadas"])
    )

    print("\n" + "-" * 60)
    print(f"📌 Nº de colunas de dados comuns (informar na discadora): {total_comuns}")
    print(f"📌 Nº de colunas de telefone                            : {len(resumo['colunas_telefone_usadas'])}")
    print("-" * 60)
    print("\nOrdem das colunas no arquivo final:")
    for item in resumo["legenda_colunas"]:
        print(f"  Coluna {item['posicao']}: {item['rotulo']:<28} (original: {item['coluna_original']})")

    print()
    print(f"✅ CSV para a discadora: {resumo['arquivo_csv_discadora']}")
    print(f"📋 Legenda das colunas : {resumo['arquivo_legenda']}")
    print("=" * 60)
