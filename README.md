# 🚍 DF No Ponto - Integracões de API's

Este repositório está sendo montado para coletar e organizar informações referentes ao sistema de linhas, horários e serviços relacionados ao transporte público do Distrito Federal.

As informações utilizadas são obtidas através de endpoints que servem o aplicativo e o site do DF no Ponto, bem como dados em servidores públicos disponibilizados pela SEMOB (Secretaria de Transporte e Mobilidade).

---

# ⚙️ Tecnologias utilizadas

- Node.js
- Express
- CORS

---

# 📦 Como utilizar

## Clone o repositório

```bash
git clone https://github.com/batistadaniel/api_df_no_ponto.git
```

## Entre na pasta

```bash
cd api_df_no_ponto
```

## Instale as dependências

```bash
npm install
```

## Inicie o servidor

Pode ser executado normalmente com:

```bash
node server.js
```

Ou utilizando o script configurado no `package.json`:

```bash
npm run dev
```

Script configurado:

```json
"scripts": {
  "dev": "node --watch --no-warnings server.js"
}
```

O parâmetro `--watch` faz o Node monitorar alterações nos arquivos e reiniciar automaticamente a aplicação sempre que houver mudanças no código, sem precisar parar e iniciar manualmente a execução a cada alteração.

---

# 📥 Alternativa

Você também pode baixar o projeto em `.zip` diretamente pelo GitHub e depois executar:

```bash
npm install
```

---

# 🌐 Rotas disponíveis

## `/detalhes-do-projeto`

```txt
http://localhost:3000/detalhes-do-projeto
```

Esta rota retorna informações gerais do projeto, incluindo:

- ID das operadoras em formato hash (exemplo: `1pq1`)
- Nome das operadoras
- Frequência das atualizações em tempo real
- Link do OTP (planejador de viagens do DF No Ponto)

---

# 📌 Objetivo

O objetivo deste projeto é estudar, documentar e facilitar o acesso às informações públicas relacionadas ao transporte coletivo do Distrito Federal, permitindo futuras integrações, análises e experimentações utilizando dados públicos e endpoints já existentes.

---

# 🚧 Status do projeto

Projeto em desenvolvimento. Novas rotas e documentações serão adicionadas futuramente.