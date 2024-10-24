import csv
import random

# Função para gerar erros em emails
def gerar_email_com_erro(nome):
    dominios_corretos = ["gmail.com", "yahoo.com", "outlook.com"]
    dominios_errados = ["gmaill.com", "yahho.com", "outlok.com"]
    
    if random.random() < 0.3:  # 30% de chance de erro no domínio
        dominio = random.choice(dominios_errados)
    else:
        dominio = random.choice(dominios_corretos)
    
    nome_corrigido = nome.lower().replace(" ", ".")
    
    if random.random() < 0.2:  # 20% de chance de erro de digitação
        nome_corrigido = nome_corrigido.replace('a', '@').replace('e', '3')
    
    return f"{nome_corrigido}@{dominio}"

# Lista de exemplos de pessoas
pessoas = [
    {"nome": "Maria Silva", "idade": 28, "cidade": "São Paulo"},
    {"nome": "João Souza", "idade": 35, "cidade": "Rio de Janeiro"},
    {"nome": "Ana Pereira", "idade": 24, "cidade": "Belo Horizonte"},
    {"nome": "Carlos Oliveira", "idade": 42, "cidade": "Porto Alegre"},
    {"nome": "Fernanda Costa", "idade": 30, "cidade": "Salvador"}
]

# Nome do arquivo CSV
arquivo_csv = "usuarios.csv"

# Gerando o CSV
with open(arquivo_csv, mode="w", newline="", encoding="utf-8") as file:
    escritor = csv.writer(file)
    escritor.writerow(["Nome", "Idade", "Cidade", "Email"])  # Cabeçalho
    
    for pessoa in pessoas:
        email = gerar_email_com_erro(pessoa["nome"])
        escritor.writerow([pessoa["nome"], pessoa["idade"], pessoa["cidade"], email])

print(f"Arquivo CSV '{arquivo_csv}' gerado com sucesso.")
