# Testes

O repositório não tem dependências instaladas — os testes rodam com o Node que você
já tiver.

## Sem instalar nada

```bash
node testes/verificar-catalogo.js   # o serializador não altera o catálogo atual
node testes/verificar-modulos.js    # cofre, base64 dos commits, validação, notas, diff
```

O `verificar-catalogo.js` é o mais importante: ele garante que gravar o catálogo pelo
painel não perde campo, não muda valor e não embaralha a ordem dos produtos. Rode
depois de mexer em `admin/catalogo.js`.

## Teste de ponta a ponta (precisa de Chrome)

`verificar-painel.js` abre o Chrome de verdade e dirige o painel inteiro contra uma
API do GitHub simulada em memória: primeiro acesso, token inválido, edição de produto,
pré-visualização, publicação, conflito com alteração externa e relogin. **Nenhum commit
real é feito** e nada sai da máquina.

```bash
# 1. servidor local, numa aba
python -m http.server 8765 --bind 127.0.0.1

# 2. puppeteer-core numa pasta fora do repositório (para não sujar o projeto)
cd /tmp && npm init -y && npm i puppeteer-core

# 3. o teste, apontando o NODE_PATH para lá
cd /caminho/do/loja-perfumes
NODE_PATH=/tmp/node_modules node testes/verificar-painel.js
```

Dá para trocar o caminho do Chrome e a porta:

```bash
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe" BASE=http://127.0.0.1:8765 \
  NODE_PATH=/tmp/node_modules node testes/verificar-painel.js
```
