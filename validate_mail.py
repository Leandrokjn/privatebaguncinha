import csv
import re

# Função para validar o formato do email
def validar_email(email):
    padrao = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return re.match(padrao, email) is not None

# Função para extrair e listar domínios de email únicos
def extrair_dominios_emails(arquivo_csv):
    dominios = set()  # Usar set para evitar duplicados
    emails_invalidos = []

    with open(arquivo_csv, mode="r", newline="", encoding="utf-8") as file:
        leitor_csv = csv.DictReader(file)
        for linha in leitor_csv:
            email = linha["Email"]
            if validar_email(email):
                # Extrair o domínio do email
                dominio = email.split('@')[-1]
                dominios.add(dominio)
            else:
                emails_invalidos.append(email)

    return dominios, emails_invalidos

# Nome do arquivo CSV (alterar conforme necessário)
arquivo_csv = "usuarios.csv"

# Extraindo domínios únicos e verificando emails inválidos
dominios_unicos, emails_invalidos = extrair_dominios_emails(arquivo_csv)

# Imprimindo os resultados
print("Domínios de email únicos:")
for dominio in dominios_unicos:
    print(dominio)

if emails_invalidos:
    print("\nEmails inválidos encontrados:")
    for email in emails_invalidos:
        print(email)
