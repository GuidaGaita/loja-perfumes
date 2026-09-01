# CRPARFUM — loja online

Loja estática de perfumes com navegação por categoria, busca, carrinho e fechamento
de pedido pelo WhatsApp, **com painel de administração próprio**. Não precisa de
servidor, banco de dados nem build.

Feita sobre o template [Olivia](https://themewagon.com/themes/olivia/) (Tailwind CSS + Alpine.js).

- **Loja:** `index.html`
- **Painel:** `admin.html`

---

## Para quem cuida do catálogo

Abra **`/admin.html`** no endereço do site (`seusite.com.br/admin.html`), entre com a
senha, altere o que precisar e clique em **Publicar**. O site atualiza sozinho em
cerca de 1 minuto. Funciona no celular.

O painel edita produtos, categorias, o carrossel da home e os dados da loja
(WhatsApp, textos de entrega e pagamento). As fotos são enviadas direto por ele e
reduzidas automaticamente — não precisa mexer em nada no computador.

### Primeiro acesso em um aparelho novo

O painel precisa de um **token do GitHub** para poder gravar as alterações. Ele fica
guardado cifrado só naquele navegador, destravado pela senha.

1. Abra [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
2. **Repository access** → *Only select repositories* → marque `loja-perfumes`
3. **Permissions → Repository permissions → Contents** → *Read and write*
4. **Expiration** → escolha a validade (o painel avisa quando estiver perto de vencer)
5. **Generate token**, copie o código e cole no painel junto com a senha que você escolher

O mesmo passo a passo aparece dentro da tela de primeiro acesso.

### Como a segurança funciona

O `admin.html` é uma página pública — qualquer um consegue abrir a tela de login. Isso
não é problema: **quem escreve no site é o token do GitHub, não a senha.** Sem o token,
não há como alterar nada, mesmo lendo todo o código da página. A senha existe para
proteger o token dentro do seu aparelho (cifrado com AES-GCM, chave derivada por
PBKDF2). O painel também se bloqueia sozinho após 30 minutos parado.

Se perder o aparelho: revogue o token em
[github.com/settings/tokens](https://github.com/settings/tokens?type=beta) e crie outro.

---

## Para quem mexe no código

### Rodar localmente

```bash
python -m http.server 8000
# loja:   http://localhost:8000
# painel: http://localhost:8000/admin.html
```

O painel precisa de um servidor (não funciona com `file://`) porque conversa com a
API do GitHub. A loja sozinha abre direto pelo arquivo.

### Estrutura

```
index.html              a loja inteira (Tailwind CDN + Alpine.js)
admin.html              o painel de administração
admin/cofre.js          guarda o token cifrado no navegador (WebCrypto)
admin/github.js         lê e grava no repositório pela API do GitHub
admin/catalogo.js       regras do catálogo: notas, totais, validação, serialização
admin/imagem.js         reduz e comprime as fotos no navegador
admin/app.js            componente Alpine que amarra tudo
data/catalogo.js        FONTE DE VERDADE do catálogo — gerado pelo painel
testes/                 verificação do serializador do catálogo
scripts/legado/         pipeline Python antigo (não use — veja o README de lá)
assets/produtos/        fotos dos produtos, por categoria
assets/marca/           fotos institucionais
assets/catalogos/       PDFs originais (hoje não referenciados no site)
```

### Como o painel publica

Tudo em um commit só, pela Git Data API: cria um blob por arquivo alterado, monta uma
árvore em cima da atual, cria o commit e move a branch `main`. O workflow
`.github/workflows/pages.yml` republica o site em seguida.

Antes de gravar, o painel confere se o sha da branch continua sendo o mesmo de quando
carregou. Se alguém commitou por fora nesse meio-tempo, ele avisa em vez de
sobrescrever.

### Verificar o catálogo

```bash
node testes/verificar-catalogo.js
```

Confere que o serializador do painel reproduz o catálogo atual sem perder campo,
mudar valor ou trocar a ordem dos produtos. Rode depois de mexer em
`admin/catalogo.js`.

### Detalhes que valem saber

- **O `id` do produto é o link dele** (`#/produto/<id>`) e é o que fica salvo no
  carrinho de quem visita. Mudar o `id` quebra links compartilhados e esvazia
  carrinhos — o painel avisa e pede confirmação antes.
- **`data/catalogo.js` não deve ser editado à mão.** Um `git push` direto no arquivo
  funciona, mas o painel vai reclamar de conflito na próxima publicação (é só
  recarregar).
- **Tailwind e Alpine vêm por CDN**, compilando no navegador. É o que permite o site
  não ter build. Se um dia o carregamento incomodar, o caminho é gerar o CSS do
  Tailwind uma vez e fixar a versão do Alpine.
- **`resumo` e `notas` são derivados da `descricao`**: o painel separa sozinho quando
  encontra os rótulos `Topo:`, `Coração:` e `Fundo:` na descrição.
- **Marca e tipo não têm cadastro próprio**: as listas do formulário saem dos próprios
  produtos, e criar um valor novo é uma ação explícita (`+ nova marca…`). Isso existe
  porque `tipo` alimenta o filtro que o cliente usa na loja (`tiposDisponiveis()` em
  `index.html`) — um "Perfumes" digitado no lugar de "Perfume" viraria uma opção extra
  no filtro, dividindo os produtos em silêncio. Ao digitar um valor novo, o painel
  ainda avisa se ele só difere por acento ou caixa de um já existente.
- **O carrossel da home tem uma lista de fábrica** em dois lugares que precisam ficar
  iguais: a reserva no `index.html` e `BANNER_PADRAO` em `admin/catalogo.js`. É o que a
  loja mostra quando o catálogo não tem a chave `home`, e é o que o painel abre para
  editar nesse caso — para a administradora ajustar o carrossel que está no ar em vez
  de montar um novo.

---

## Publicação e domínio

O site é publicado pelo **GitHub Pages** a cada push na `main`
(`.github/workflows/pages.yml`, sem build).

Para usar um domínio próprio:

1. Crie um arquivo `CNAME` na raiz do repositório com o domínio numa linha só
   (ex.: `crparfum.com.br`)
2. No DNS do registrador, aponte:
   - `A` de `@` para `185.199.108.153`, `185.199.109.153`, `185.199.110.153` e `185.199.111.153`
   - `CNAME` de `www` para `guidagaita.github.io`
3. Em **Settings → Pages** do repositório, preencha o *Custom domain* e marque
   **Enforce HTTPS** (o certificado leva alguns minutos para sair)

---

## Pendências conhecidas no catálogo

Coisas herdadas dos PDFs originais que valem uma conferida — todas ajustáveis pelo painel:

- **Sem preço nos PDFs** (aparecem como "Sob consulta"): Coco Chanel 25 ml,
  Sí 25 ml, L'Interdit 25 ml.
- **Hidratantes Armani Code e Polo Blue**: não constavam no PDF; foram cadastrados a
  R$ 49,99, o preço dos outros hidratantes da linha.
- **Fame Blooming Pink**: o PDF descrevia o Gucci Bloom nesse item. Ficou com uma
  descrição genérica até confirmar.
- **Invictus 200 ml (importado)**: o PDF repetia a descrição do 212 VIP Men; foi usada
  a descrição correta do Invictus.
- **No PDF mas sem foto** (por isso fora do site): Phantom Elixir 25 ml e o
  hidratante Fame.
- **`assets/catalogos/`**: os PDFs estão no repositório mas não são oferecidos para
  download em lugar nenhum do site.
