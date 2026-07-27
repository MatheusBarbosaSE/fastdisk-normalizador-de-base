"""
Funções de validação e reconhecimento de tipo de dado.

Cada função aqui responde a uma pergunta objetiva sobre um único valor
("isso parece um telefone?", "isso é um CPF válido?"), sem conhecimento
de planilha, coluna ou arquivo. Esse isolamento é o que permite testar
a lógica de validação de forma unitária e reaproveitá-la tanto na
seleção de colunas quanto na normalização dos dados de saída.
"""

import re

import pandas as pd

from . import config


def limpar_para_digitos(valor) -> str:
    """Remove tudo que não é dígito de um valor."""
    if pd.isna(valor):
        return ""
    return re.sub(r"\D", "", str(valor))


def normalizar_telefone(valor) -> str | None:
    """
    Tenta transformar um valor em um telefone brasileiro válido: DDD
    real + número, sem DDI. Retorna None se o valor não corresponder a
    um telefone válido.
    """
    digitos = limpar_para_digitos(valor)
    if not digitos:
        return None

    tam_min, tam_max = config.TAMANHO_TELEFONE_MIN, config.TAMANHO_TELEFONE_MAX

    if digitos.startswith("55") and len(digitos) in (tam_min + 2, tam_max + 2):
        digitos = digitos[2:]

    if len(digitos) in (tam_min + 1, tam_max + 1) and digitos.startswith("0"):
        digitos = digitos[1:]

    if len(digitos) not in (tam_min, tam_max):
        return None

    ddd = int(digitos[:2])
    if ddd not in config.DDD_VALIDOS:
        return None

    # Números de celular (11 dígitos) sempre começam com 9 após o DDD.
    if len(digitos) == tam_max and digitos[2] != "9":
        return None

    return digitos


def parece_telefone(valor) -> bool:
    return normalizar_telefone(valor) is not None


def cpf_valido(digitos: str) -> bool:
    """Valida um CPF pelo algoritmo oficial de dígitos verificadores."""
    if len(digitos) != 11 or digitos == digitos[0] * 11:
        return False

    def calcular_dv(cpf_parcial: str) -> str:
        peso = len(cpf_parcial) + 1
        soma = sum(int(d) * (peso - i) for i, d in enumerate(cpf_parcial))
        resto = (soma * 10) % 11
        return "0" if resto == 10 else str(resto)

    dv1 = calcular_dv(digitos[:9])
    dv2 = calcular_dv(digitos[:9] + dv1)
    return digitos[-2:] == dv1 + dv2


def parece_cpf(valor) -> bool:
    """
    Considera um valor como CPF se o dígito verificador for válido ou
    se estiver no formato de exibição usual (000.000.000-00) -- isso
    cobre tanto CPFs reais quanto bases de teste com CPFs fictícios.
    """
    digitos = limpar_para_digitos(valor)
    if len(digitos) != 11:
        return False

    texto = str(valor).strip()
    formato_cpf = bool(re.match(r"^\d{3}\.\d{3}\.\d{3}-\d{2}$", texto))
    return cpf_valido(digitos) or formato_cpf


def parece_texto(valor) -> bool:
    """Verdadeiro quando o valor é majoritariamente composto por letras."""
    if pd.isna(valor):
        return False
    texto = str(valor).strip()
    if not texto:
        return False
    letras = sum(c.isalpha() for c in texto)
    return letras / max(len(texto), 1) > 0.5


def parece_email(valor) -> bool:
    if pd.isna(valor):
        return False
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", str(valor).strip()))
