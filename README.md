# Enterprise Architecture System 🏢

Sistema web para **mapeamento e análise de arquitetura empresarial**, permitindo visualizar dependências, identificar ativos críticos e analisar impactos entre componentes de TI.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Acessar%20Aplicação-00C7B7?style=for-the-badge)](https://arquitetura-empresarial.onrender.com/)
[![GitHub](https://img.shields.io/badge/Source%20Code-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/juliamergulhao/enterprise-architecture-system)

Sistema web desenvolvido para **mapeamento e análise de arquitetura empresarial**, permitindo organizar ativos tecnológicos, visualizar dependências e identificar pontos críticos dentro de uma estrutura corporativa.

A aplicação permite representar diferentes camadas da arquitetura de TI e analisar como serviços, aplicações e componentes tecnológicos se relacionam.

---

## 🎯 Objetivo

Centralizar informações relacionadas à arquitetura empresarial e facilitar a análise das dependências entre diferentes componentes de tecnologia.

A solução permite mapear:

- Domínios arquiteturais
- Serviços de negócio
- Serviços de aplicação
- Componentes tecnológicos

A partir desses relacionamentos, o sistema auxilia na identificação de **dependências, redundâncias, ativos críticos e impactos entre componentes**.

---

## ⚙️ Funcionalidades

- Cadastro, edição e exclusão de ativos
- Cadastro de relacionamentos entre componentes
- Definição de níveis de impacto
- Visualização da arquitetura em camadas
- Identificação de ativos críticos
- Detecção de possíveis redundâncias
- Ranking de concentração de dependências
- Análise de impacto cruzado
- Persistência de dados utilizando SQLite
- Geração de relatório em PDF

---

## 🛠️ Tecnologias

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)

---

## 🧩 Arquitetura da Aplicação

A aplicação utiliza uma arquitetura simples composta por:

**Frontend**  
HTML, CSS e JavaScript responsáveis pela interface e interação com o usuário.

**Backend**  
Node.js e Express responsáveis pela API e regras da aplicação.

**Banco de Dados**  
SQLite utilizado para persistência dos ativos e relacionamentos cadastrados.

---

## 📂 Estrutura

```text
enterprise-architecture-system/
│
├── public/
│   └── index.html
│
├── servidor.js
├── package.json
├── package-lock.json
├── README.md
└── .gitignore
