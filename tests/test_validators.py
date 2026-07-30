from normalizador import validators


class TestNormalizarTelefone:
    def test_celular_com_ddi_e_formatacao(self):
        assert validators.normalizar_telefone("55 (11) 98765-4321") == "11987654321"

    def test_celular_sem_formatacao(self):
        assert validators.normalizar_telefone("11987654321") == "11987654321"

    def test_fixo_valido(self):
        assert validators.normalizar_telefone("2136547890") == "2136547890"

    def test_rejeita_ddd_inexistente(self):
        # DDD 10 não existe -- não deve ser tratado como telefone.
        assert validators.normalizar_telefone("10234567891") is None

    def test_rejeita_celular_sem_nono_digito(self):
        # 11 dígitos, mas sem o "9" característico de celular após o DDD.
        assert validators.normalizar_telefone("11123456789") is None

    def test_rejeita_valor_vazio(self):
        assert validators.normalizar_telefone("") is None
        assert validators.normalizar_telefone(None) is None


class TestCpf:
    def test_cpf_com_digito_verificador_valido(self):
        assert validators.cpf_valido("11144477735") is True

    def test_cpf_com_digito_verificador_invalido(self):
        assert validators.cpf_valido("11144477700") is False

    def test_cpf_com_todos_digitos_iguais_e_invalido(self):
        assert validators.cpf_valido("11111111111") is False

    def test_parece_cpf_aceita_formato_mesmo_com_dv_invalido(self):
        # Bases de teste às vezes usam CPFs fictícios: o formato ainda
        # deve ser reconhecido para fins de identificação de coluna.
        assert validators.parece_cpf("123.456.789-00") is True

    def test_parece_cpf_rejeita_telefone_de_11_digitos(self):
        assert validators.parece_cpf("11987654321") is False


class TestTextoEEmail:
    def test_parece_texto(self):
        assert validators.parece_texto("Maria Souza") is True
        assert validators.parece_texto("123456789") is False

    def test_parece_email(self):
        assert validators.parece_email("cliente@fasttelecombrasil.com.br") is True
        assert validators.parece_email("nao-e-email") is False
