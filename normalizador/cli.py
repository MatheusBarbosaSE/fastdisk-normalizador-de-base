"""Interface de linha de comando do normalizador de bases."""

import sys

from .pipeline import processar_planilha

USO = (
    "Uso: python main.py <entrada> [saida.csv] [colunas_extras]\n\n"
    "  entrada         Caminho da planilha de origem (.csv, .xlsx ou .xls)\n"
    "  saida.csv       Caminho do CSV a ser gerado (padrão: base_normalizada.csv)\n"
    "  colunas_extras  Letras de colunas adicionais a manter, separadas por\n"
    "                  vírgula (ex.: B,D)\n"
)


def main(argv: list | None = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]

    if not argv:
        print(USO)
        return 1

    entrada = argv[0]
    saida = argv[1] if len(argv) > 1 else "base_normalizada.csv"
    extras = argv[2].split(",") if len(argv) > 2 else []

    try:
        processar_planilha(entrada, saida, colunas_extras_letras=extras)
    except (ValueError, FileNotFoundError) as erro:
        print(f"Erro: {erro}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
