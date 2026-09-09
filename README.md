# Mapa de Arquitetura Empresarial

Sistema web desenvolvido para atender ao objetivo do slide: organizar uma visão empresarial em camadas, mapear relações entre domínios, distinguir serviço de negócio, serviço de aplicação e componente tecnológico, identificar redundâncias/pontos críticos e realizar análise de impacto cruzado.

## Tecnologias
- HTML5
- CSS3
- JavaScript puro (frontend em um único `public/index.html`)
- Node.js + Express
- SQLite

## Funcionalidades
1. Cadastro/edição/exclusão de ativos:
   - Domínio arquitetural
   - Serviço de negócio
   - Serviço de aplicação
   - Componente tecnológico
2. Cadastro de relacionamentos e nível de impacto.
3. Visão da arquitetura em camadas.
4. Identificação de ativos críticos.
5. Detecção de redundância por nome/tipo.
6. Ranking de pontos de concentração de dependências.
7. Análise de impacto cruzado usando dependências recursivas.
8. Persistência real no arquivo `arquitetura.db`.

## Executar localmente

Requisitos: Node.js 18+.

```bash
npm install
npm start
```

Depois abra:
http://localhost:3000

O banco SQLite é criado automaticamente na primeira execução.

## Deploy

O projeto pode ser publicado em qualquer ambiente que aceite uma aplicação Node.js e mantenha armazenamento de arquivos persistente.

Comando de inicialização:
```bash
npm start
```

Porta:
- Usa `process.env.PORT` quando fornecida pelo provedor.
- Caso contrário, usa 3000.

### Observação sobre SQLite em plataformas cloud
SQLite grava em arquivo. Em plataformas com filesystem efêmero, os dados podem ser perdidos após reinicialização/deploy. Para uma entrega acadêmica ou servidor com disco persistente, o SQLite atende ao requisito. Em produção com múltiplas instâncias, recomenda-se migrar para PostgreSQL/MySQL.

## Estrutura

```text
arquitetura-empresarial/
├── public/
│   └── index.html
├── server.js
├── package.json
├── README.md
└── .gitignore
```

O arquivo `arquitetura.db` não é incluído no ZIP porque ele é criado automaticamente no primeiro start.
