import requests
import json

# Função para obter repositórios de um usuário do GitHub
def get_repositories(user):
    url = f"https://api.github.com/users/{user}/repos"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Erro ao fazer GET request: {response.status_code}")
        return []

# Função para filtrar repositórios com mais de 100 estrelas
def filter_repositories(repos, stars_threshold=100):
    filtered_repos = []
    for repo in repos:
        if repo.get('stargazers_count', 0) > stars_threshold:
            # Somente os campos desejados no JSON final
            filtered_repos.append({
                'name': repo['name'],
                'created_at': repo['created_at'],
                'html_url': repo['html_url'],
                'stargazers_count': repo['stargazers_count']
            })
    return filtered_repos

# Função para enviar os dados filtrados para uma API mock
def post_filtered_data(filtered_data, mock_api_url="https://671a2a7bacf9aa94f6a96b0e.mockapi.io/api/v1/badtux"):
    headers = {'Content-Type': 'application/json'}
    response = requests.post(mock_api_url, data=json.dumps(filtered_data), headers=headers)
    if response.status_code == 200 or response.status_code == 201:
        print("Dados enviados com sucesso!")
    else:
        print(f"Erro ao fazer POST request: {response.status_code}")

# Main
if __name__ == "__main__":
    github_user = "badtuxx"  # Substitua pelo usuário desejado
    repositories = get_repositories(github_user)
    
    if repositories:
        # Filtra os repositórios com mais de 100 estrelas
        filtered_repos = filter_repositories(repositories)
        
        if filtered_repos:
            # Envia os dados filtrados para a API mock
            post_filtered_data(filtered_repos)
        else:
            print("Nenhum repositório com mais de 100 estrelas foi encontrado.")
    else:
        print("Nenhum repositório foi encontrado ou houve um erro na requisição.")
