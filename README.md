# FastDisk Normalizador de Base

Ferramenta para normalização automática de bases de contatos destinadas
a sistemas de discagem (discadoras VOIP), disponível tanto como script
Python (CLI) quanto como interface web executada inteiramente no
navegador.

## O problema

Discadoras VOIP costumam exigir que a base de contatos siga um formato
bem específico: sem cabeçalho, com um número limitado de colunas, e com
os números de telefone já limpos (sem DDI, sem espaços ou caracteres
especiais). Na prática, as planilhas recebidas de clientes raramente
chegam nesse formato — vêm com colunas fora de ordem, dados irrelevantes
misturados (e-mail, endereço, número de benefício, protocolo etc.),
telefones formatados de maneiras diferentes, e nem sempre um padrão
consistente entre um cliente e outro.

Esse tratamento manual é repetitivo, sujeito a erro humano e consome
tempo de suporte que poderia ser evitado. Este projeto automatiza esse
processo: identifica as colunas relevantes (Nome, CPF e Telefone),
valida e limpa os dados, e gera diretamente o arquivo pronto para
importação.

## O que o sistema faz

1. Lê a planilha de entrada (`.csv`, `.xlsx` ou `.xls`), detectando
   automaticamente o encoding do arquivo e se ele possui ou não uma
   linha de cabeçalho.
2. Identifica a coluna de **Nome** (opcional) e de **CPF** (opcional),
   priorizando o nome do cabeçalho original quando disponível, e
   recorrendo à análise de conteúdo (incluindo validação do dígito
   verificador do CPF) quando não há um cabeçalho informativo.
3. Identifica a(s) coluna(s) de **Telefone** (obrigatória), validando
   cada número por tamanho **e por DDD real brasileiro** — o que evita
   que outro identificador numérico de mesmo tamanho (matrícula,
   protocolo, código de benefício etc.) seja confundido com telefone.
4. Permite informar manualmente, por letra de coluna (A, B, C...),
   qualquer dado adicional que deva ser mantido na base final.
5. Remove linhas sem nenhum telefone válido e remove duplicados pelo
   primeiro telefone da linha.
6. Gera o CSV final no formato aceito pela discadora (sem cabeçalho,
   campos separados por `;`, quebra de linha estilo Windows) e um
   arquivo de legenda (`_legenda.txt`) descrevendo o que é cada coluna
   e em que posição ela está.

## Tecnologias

| Camada                  | Tecnologia                                    |
|-------------------------|------------------------------------------------|
| Processamento de dados  | Python 3.11+, pandas                          |
| Leitura de planilhas    | openpyxl (`.xlsx`), xlrd (`.xls`)             |
| Testes                  | pytest                                        |
| Interface web           | HTML + JavaScript (sem dependência de build)  |
| Parsing no navegador    | PapaParse (CSV), SheetJS (`.xlsx`/`.xls`)     |

## Arquitetura

O projeto segue separação de responsabilidades (SoC): cada módulo do
pacote `normalizador/` cuida de uma única parte do processo, e o
`pipeline.py` apenas orquestra a ordem de execução.

```
fastdisk-normalizador-de-base/
├── main.py                     # ponto de entrada (CLI)
├── normalizador/
│   ├── config.py               # constantes e limites de validação
│   ├── validators.py           # validação de telefone, CPF, texto, email
│   ├── column_utils.py         # letra <-> índice de coluna, preenchimento
│   ├── io_reader.py            # leitura de planilhas (encoding, cabeçalho)
│   ├── column_selector.py      # seleção automática de Nome/CPF/Telefone
│   ├── exporter.py             # exportação do CSV final e da legenda
│   ├── pipeline.py             # orquestração do fluxo completo
│   └── cli.py                  # interface de linha de comando
├── web/
│   └── normalizador.html       # interface web (mesma lógica, em JavaScript)
└── tests/
    ├── test_validators.py
    └── test_column_utils.py
```

A interface web é um porte independente da mesma lógica de validação e
seleção de colunas, escrito em JavaScript puro, para permitir o uso sem
qualquer instalação — todo o processamento acontece localmente no
navegador, sem envio de dados para nenhum servidor.

## Instalação

### Pré-requisitos

- Python 3.11 ou superior

### Criando o ambiente virtual

```bash
python3 -m venv .venv
```

Ativando o ambiente:

```bash
# Linux / macOS
source .venv/bin/activate

# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# Windows (cmd)
.venv\Scripts\activate.bat
```

### Instalando as dependências

```bash
# Uso normal (apenas para rodar o normalizador)
pip install -r requirements.txt

# Ambiente de desenvolvimento (inclui pytest)
pip install -r requirements-dev.txt
```

## Uso

### Via linha de comando

```bash
python main.py <planilha_de_entrada> [csv_de_saida] [colunas_extras]
```

Exemplos:

```bash
# Uso básico
python main.py planilha_do_cliente.xlsx base_pronta.csv

# Mantendo também a coluna E da planilha original (ex.: e-mail)
python main.py planilha_do_cliente.csv base_pronta.csv E

# Mantendo mais de uma coluna extra
python main.py planilha_do_cliente.csv base_pronta.csv B,E
```

Ao final da execução, dois arquivos são gerados:

- `base_pronta.csv` — arquivo pronto para importação na discadora;
- `base_pronta_legenda.txt` — descrição, em ordem, do que é cada coluna
  do CSV gerado.

### Via interface web

Basta abrir `web/normalizador.html` diretamente em um navegador
(Chrome, Edge ou Firefox). Não há necessidade de servidor, instalação
ou conexão com backend algum:

1. Arraste a planilha para a área de upload (ou clique para selecionar).
2. A planilha original é exibida com as colunas já identificadas
   (Nome, CPF, Telefone) destacadas visualmente.
3. Se necessário, informe a letra de alguma coluna adicional a manter.
4. Clique em **Processar base** para gerar o CSV final e a legenda.

## Executando os testes

```bash
pytest
```

## Limitações conhecidas

- A validação de telefone assume DDDs brasileiros; números
  internacionais não são suportados.
- A detecção de Nome/CPF por conteúdo é heurística: planilhas com dados
  muito atípicos podem exigir o uso da coluna extra manual.
- A remoção de duplicados considera apenas o primeiro telefone da linha
  como chave.

## Autor

**Matheus Barbosa**
[github.com/MatheusBarbosaSE](https://github.com/MatheusBarbosaSE)
