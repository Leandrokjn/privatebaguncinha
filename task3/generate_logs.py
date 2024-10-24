# generate_logs.py
import random
from datetime import datetime

log_levels = ['INFO', 'WARNING', 'ERROR', 'CRITICAL', 'DEBUG']

def generate_log(log_file):
    with open(log_file, 'a') as f:
        for _ in range(50):  # Gerar 50 entradas de log
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            level = random.choice(log_levels)
            message = f"{timestamp} - {level} - Log message example"
            f.write(message + '\n')

# Gerar logs para server1 e server2
generate_log(r"C:\Users\User\Desktop\neon_teste\task3\logs\server1\app.log")
generate_log(r"C:\Users\User\Desktop\neon_teste\task3\logs\server2\app.log")

