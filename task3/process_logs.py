import re
import os
import shutil
from datetime import datetime

log_dir = r"C:\Users\User\Desktop\neon_teste\task3\logs"   # Diretório de origem dos logs
backup_dir = r"C:\Users\User\Desktop\neon_teste\task3\backup"   # Diretório de backup
processed_dir = r"C:\Users\User\Desktop\neon_teste\task3\processed" # Diretório para logs processados

# Função para flagar erros
def process_log(file_path):
    flagged_errors = []
    with open(file_path, 'r') as file:
        for line in file:
            if re.search(r'ERROR|CRITICAL', line):  # Flagging erros e críticos
                flagged_errors.append(line)
    
    return flagged_errors

# Função para arquivar logs
def archive_log(file_path):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    shutil.move(file_path, f"{backup_dir}/{os.path.basename(file_path)}_{timestamp}.log")

# Processando todos os logs no diretório de origem
for server in os.listdir(log_dir):
    server_path = os.path.join(log_dir, server)
    
    if os.path.isdir(server_path):  # Verificar se é um diretório (servidor)
        for log_file in os.listdir(server_path):
            if log_file.endswith(".log"):
                file_path = os.path.join(server_path, log_file)
                errors = process_log(file_path)
                
                if errors:
                    # Salvar logs com erros processados
                    with open(f"{processed_dir}/flagged_{log_file}", 'w') as flagged_log:
                        flagged_log.write("\n".join(errors))
                
                # Arquivar logs
                archive_log(file_path)

print("Logs processados e arquivados com sucesso.")