"""
Configurações e constantes utilizadas pelo normalizador de bases.

Centralizar esses valores aqui facilita ajustar o comportamento do
sistema (limites de colunas, formato de saída, DDDs válidos etc.) sem
precisar alterar a lógica de negócio nos outros módulos.
"""

# Número máximo de colunas de telefone aceitas na base final.
MAX_COLUNAS_TELEFONE = 6

# Tamanho de um telefone brasileiro sem o DDI (55), já com o DDD:
# fixo = 2 (DDD) + 8 dígitos | celular = 2 (DDD) + 9 dígitos.
TAMANHO_TELEFONE_MIN = 10
TAMANHO_TELEFONE_MAX = 11

# Formato aceito pela discadora: sem cabeçalho, campos separados por
# ponto e vírgula, com quebra de linha no padrão Windows (CRLF).
DELIMITADOR_SAIDA = ";"
QUEBRA_DE_LINHA_SAIDA = "\r\n"

# DDDs oficiais em uso no Brasil (ANATEL). Um número cujo DDD não está
# nesta lista não é considerado um telefone válido, mesmo que tenha a
# quantidade correta de dígitos -- isso evita que outros identificadores
# numéricos de mesmo tamanho (matrícula, protocolo, código de benefício
# etc.) sejam confundidos com telefone.
DDD_VALIDOS = frozenset({
    11, 12, 13, 14, 15, 16, 17, 18, 19,
    21, 22, 24, 27, 28,
    31, 32, 33, 34, 35, 37, 38,
    41, 42, 43, 44, 45, 46, 47, 48, 49,
    51, 53, 54, 55,
    61, 62, 63, 64, 65, 66, 67, 68, 69,
    71, 73, 74, 75, 77, 79,
    81, 82, 83, 84, 85, 86, 87, 88, 89,
    91, 92, 93, 94, 95, 96, 97, 98, 99,
})

# Palavras-chave (sem acento, minúsculas) usadas para reconhecer o
# propósito de uma coluna pelo nome do cabeçalho original.
PALAVRAS_CHAVE_NOME = ["nome", "cliente", "titular", "razao social", "consumidor", "devedor"]
PALAVRAS_CHAVE_CPF = ["cpf"]

# Limiares de decisão: fração mínima de valores de uma amostra que
# precisa bater com o padrão esperado para a coluna ser classificada
# como tal.
LIMIAR_TEXTO_NOME = 0.6
LIMIAR_CPF = 0.7
LIMIAR_TELEFONE = 0.7

# Quantidade máxima de valores não vazios amostrados por coluna ao
# calcular os limiares acima -- suficiente para uma decisão confiável
# sem percorrer a planilha inteira.
TAMANHO_AMOSTRA = 200
