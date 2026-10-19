# Uso: python3 -I procs.py <saida-do-rea-search.json>
# Lista as funções internas (fora de EXTERNAL) com nome, uma por linha: endereço  nome
import json, sys
d = json.load(open(sys.argv[1]))
for x in d['normalized_result']:
    a, v = x['address'], x['value']
    if a.startswith('EXTERNAL') or v.startswith('FUN_'):
        continue
    print(a, v)
