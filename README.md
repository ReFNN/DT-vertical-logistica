# API para Importação de Pedidos

## Objetivo do Desafio 

Faça um sistema que receba um arquivo via API REST e processe-o para ser retornado via API REST. 

## Considerações

A escolha da stack para desenvolver essa API, foi por conta do foco em agilidade e simplicidade, já que o Node.js + Express permitem suporte nativo a Streams, permitindo controlar o uso de memória, pois o arquivo é armazenado no disco e lidos em chunks, linha a linha.
O MySQL armazena os dados já normalizados permitindo transações e restrições para manter a consistência.
Decidi separar a API para registrar a importação do arquivo, enquanto o worker processa ele em segundo plano.
Apesar da stack, a mesma solução poderia ser replicada sem problemas em outras linguagens caso fosse necessário...
Utilizei uma arquitetura de monólito modular em camadas: rotas, controllers, processamento e repositories.

## Tecnologias

- Node.js e Express
- MySQL
- Multer
- Streams e readline
- Jest e Supertest
- Docker Compose

## Como executar (DOCKER)

```bash
docker compose up --build -d
```

A API ficará disponível em `http://localhost:3000`. As migrations são executadas automaticamente antes da inicialização.

## Postman

A collection para testar o fluxo da API está disponível em [`postman/vertical-logistica.postman_collection.json`](postman/vertical-logistica.postman_collection.json).

Depois do upload, o `import_id` retornado é salvo automaticamente para as próximas requisições.

## Fluxo da importação

1. A API recebe o arquivo e o salva no volume de uploads.
2. A importação é registrada como `PENDING`.
3. O worker altera o status para `PROCESSING` e lê o arquivo linha por linha.
4. Os registros válidos são gravados no MySQL em lotes de 1.000.
5. A importação termina como `COMPLETED` ou `FAILED`.

Uma importação só fica disponível para consulta depois de concluída.

## API

### Enviar arquivo

```http
POST /v1/imports
Content-Type: multipart/form-data
```

O campo do arquivo deve se chamar `file`.

```powershell
curl.exe -F "file=@C:\caminho\data_1.txt" http://localhost:3000/v1/imports
```

Resposta:

```json
{
  "import_id": "ae13cd93-8b07-4ed2-b146-2018ee67311c",
  "status": "PENDING"
}
```

O limite padrão por arquivo é de 2 GB e pode ser alterado pela variável `MAX_FILE_SIZE_MB`.

### Consultar importação

```http
GET /v1/imports/:id
```

```json
{
  "import_id": "ae13cd93-8b07-4ed2-b146-2018ee67311c",
  "file_name": "data_1.txt",
  "file_size": 225792,
  "status": "COMPLETED",
  "processed_lines": 2352,
  "valid_lines": 2352,
  "invalid_lines": 0,
  "error_message": null
}
```

### Consultar pedidos

```http
GET /v1/orders
```

Filtros disponíveis:

```text
import_id
order_id
start_date
end_date
page
limit
```

Exemplos:

```http
GET /v1/orders?order_id=753
GET /v1/orders?start_date=2021-03-01&end_date=2021-03-31
GET /v1/orders?import_id=ae13cd93-8b07-4ed2-b146-2018ee67311c&page=1&limit=100
```

Sem `import_id`, a API usa a importação concluída mais recente. A paginação retorna os headers `X-Page`, `X-Page-Size` e `X-Has-Next`. O limite padrão é 100 e o máximo é 500 pedidos.

Exemplo de resposta:

```json
[
  {
    "user_id": 70,
    "name": "Palmer Prosacco",
    "orders": [
      {
        "order_id": 753,
        "total": "4252.53",
        "date": "2021-03-08",
        "products": [
          {
            "product_id": 3,
            "value": "1836.74"
          }
        ]
      }
    ]
  }
]
```

## Formato do arquivo

Cada linha possui 95 bytes:

| Campo | Posição | Tamanho |
| --- | ---: | ---: |
| ID do usuário | 0-9 | 10 |
| Nome | 10-54 | 45 |
| ID do pedido | 55-64 | 10 |
| ID do produto | 65-74 | 10 |
| Valor do produto | 75-86 | 12 |
| Data da compra | 87-94 | 8 |

Os valores monetários são convertidos para centavos. A saída sempre usa duas casas decimais.

## Linhas inválidas

Linhas com tamanho, identificadores, valor ou data inválidos são registradas em `import_errors`. Se houver qualquer erro, a importação recebe status `FAILED` e seus pedidos não ficam disponíveis para consulta.

## Uso de memória

O Multer grava o upload diretamente em disco. O worker usa `createReadStream` e `readline`, mantendo em memória apenas o buffer atual e um lote de até 1.000 registros. O consumo de memória não cresce na mesma proporção do arquivo.

O arquivo é removido depois de uma importação concluída. Arquivos com falha são mantidos para investigação.

## Testes

```bash
npm install
npm test
npm run test:coverage
```

Os testes cobrem upload, status da importação, parser, processamento, linhas inválidas, filtros e agrupamento da resposta.

## Benchmark do parser

Para gerar um arquivo de 100 MB:

```bash
npm run generate:file -- 100
```

Para medir leitura, parsing e memória:

```bash
npm run benchmark -- storage/benchmarks/arquivo-100mb.txt
```

O benchmark mede o parser isoladamente. O tempo completo de importação também depende do disco e do MySQL.

Em uma execução local de referência, um arquivo de 100 MB com 1.092.267 linhas foi lido em 3,50 segundos, com pico de 90,20 MB de memória. Esse número serve apenas como referência e varia conforme a máquina.

## Decisões e limites

- O projeto usa um worker para manter a API disponível durante o processamento.
- O banco guarda valores em centavos para evitar erros de ponto flutuante.
- A paginação atual usa página e limite. Em um volume maior, pode ser substituída por cursor.
- Os arquivos ficam em volume local. Em produção, poderiam ser armazenados em um serviço de objetos como AWS.
- A configuração atual executa um worker. Para múltiplas instâncias, seria necessário acrescentar controle de expiração do processamento.

## Uso de IA

Usei o Codex como apoio na definição das especificações, revisão da arquitetura, implementação, criação de casos de teste e investigação de falhas. As sugestões foram analisadas e validadas durante cada etapa do desenvolvimento.