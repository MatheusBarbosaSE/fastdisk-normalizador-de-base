import pandas as pd

from normalizador.column_utils import (
    calcular_preenchimento,
    indice_para_letra,
    letra_para_indice,
)


class TestConversaoLetraIndice:
    def test_letras_simples(self):
        assert letra_para_indice("A") == 0
        assert letra_para_indice("B") == 1
        assert letra_para_indice("Z") == 25

    def test_letras_duplas(self):
        assert letra_para_indice("AA") == 26
        assert letra_para_indice("AB") == 27

    def test_ida_e_volta(self):
        for indice in range(0, 60):
            letra = indice_para_letra(indice)
            assert letra_para_indice(letra) == indice

    def test_case_insensitive(self):
        assert letra_para_indice("b") == letra_para_indice("B")


class TestCalcularPreenchimento:
    def test_coluna_totalmente_preenchida(self):
        serie = pd.Series(["a", "b", "c"])
        assert calcular_preenchimento(serie) == 1.0

    def test_coluna_parcialmente_preenchida(self):
        serie = pd.Series(["a", "", None, "d"])
        assert calcular_preenchimento(serie) == 0.5

    def test_coluna_vazia(self):
        serie = pd.Series([], dtype=object)
        assert calcular_preenchimento(serie) == 0.0
