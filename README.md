# Sistema de Gestao Publica

## Como abrir amanha

1. Abra o PowerShell.
2. Entre na pasta do projeto:

```powershell
cd C:\Users\erivam\Documents\Playground\sistema-gestao-publica
```

3. Rode este comando:

```powershell
npm run abrir
```

O script vai:

- verificar se o sistema ja esta rodando;
- aplicar as migrations do banco;
- gerar o build se ainda nao existir;
- subir o sistema na porta `3000`;
- abrir o navegador automaticamente.

## Endereco local

Depois de abrir, use:

[http://localhost:3000](http://localhost:3000)

## Se der erro

- Confirme que o PostgreSQL esta ligado na porta `5432`.
- Se faltar dependencia, rode `npm install`.
- Se quiser recriar o build manualmente, rode `npm run build`.
- Os logs do servidor ficam em `prod-server.log` e `prod-server.err.log`.

## Comandos uteis

```powershell
npm run abrir
npm run build
npm run start
npm run dev
```

## Fluxo recomendado

Use este fluxo para manter o desenvolvimento organizado:

1. Fazer mudancas localmente.
2. Testar localmente com `npm run abrir` ou `npm run dev`.
3. Validar o banco e o comportamento do sistema.
4. So depois publicar a versao aprovada para a AWS.

Sua maquina continua sendo o ambiente de desenvolvimento. A AWS recebe apenas a copia validada.

## AWS

O projeto foi preparado para subir em container, que e o caminho mais simples para manter o sistema como esta hoje.

Arquivos criados para isso:

- `Dockerfile`
- `.dockerignore`
- `scripts/start-aws.sh`

### Melhor caminho para este projeto

Hoje, o caminho mais simples e seguro e:

1. Subir o codigo para GitHub.
2. Criar um banco PostgreSQL no Amazon RDS.
3. Subir a aplicacao em AWS App Runner usando o repositório GitHub e o arquivo `apprunner.yaml`.
4. Configurar a variavel `DATABASE_URL` no App Runner.

### Publicar hoje via GitHub + App Runner

1. Criar um repositorio novo no GitHub.
2. Fazer o primeiro push deste projeto.
3. Na AWS, abrir App Runner.
4. Escolher `Source code repository`.
5. Conectar o GitHub.
6. Selecionar este repositorio e a branch principal.
7. Escolher configuracao via `apprunner.yaml`.
8. Informar a variavel `DATABASE_URL`.
9. Criar o servico.

Ao final, a propria AWS entrega uma URL publica do App Runner.

### Variaveis necessarias na AWS

Voce vai precisar pelo menos de:

```text
DATABASE_URL=postgresql://usuario:senha@host:5432/banco?schema=public
PORT=3000
NODE_ENV=production
```

### O que acontece no container

Ao iniciar na AWS, o container:

1. roda `prisma migrate deploy`
2. sobe o Next.js em `0.0.0.0:3000`

### Teste local com Docker

Se quiser testar o mesmo empacotamento da AWS localmente:

```powershell
docker build -t sistema-gestao-publica .
docker run --rm -p 3000:3000 --env-file .env sistema-gestao-publica
```

### O que vai para GitHub

Nao vao:

- `node_modules`
- `.next`
- `.env`
- logs
- backups locais

Ou seja, o repositorio sera muito menor do que o tamanho total visto no disco.
