# CRPARFUM — loja online

Loja estática de perfumes com navegação por categoria, busca, carrinho e fechamento
de pedido pelo WhatsApp. Não precisa de servidor, banco de dados nem build: é só abrir
o `index.html` no navegador ou subir a pasta em qualquer hospedagem.

Feita sobre o template [Olivia](https://themewagon.com/themes/olivia/) (Tailwind CSS + Alpine.js).

---

## Como abrir

Clique duas vezes em `index.html`, ou rode um servidor local:

```bash
python -m http.server 8000
# depois abra http://localhost:8000
```

---

## O que precisa ser preenchido

Abra `gerar-catalogo.py`, edite o bloco `LOJA` no topo e rode `python gerar-catalogo.py`:

| Campo | Situação |
|---|---|
| `whatsapp` | **Pendente.** Está `5500000000000` (placeholder). Formato: `55` + DDD + número, só dígitos — ex.: `5511987654321`. Enquanto não for trocado, aparece um aviso vermelho no carrinho. |
| `nome` | `CRPARFUM` |
| `instagram` | Vazio (opcional) |
| `entrega`, `pagamento` | Textos que aparecem na home e na página do produto |

---

## Estrutura

```
index.html              a loja inteira (Tailwind CDN + Alpine.js)
data/catalogo.js        catálogo gerado — NÃO edite à mão
gerar-catalogo.py       fonte dos dados: preços, descrições, categorias
otimizar-imagens.py     gera as versões web das fotos
assets/produtos/        fotos otimizadas, por categoria
assets/marca/           fotos institucionais (as "Fotos da Carla")
assets/catalogos/       os PDFs originais, para download no site
```

As pastas originais (`PERFUMES ARABES ORIGINAIS/`, `FOTOS DA CARLA...` etc.) continuam
intactas — elas são a fonte para os scripts. **Não apague**: sem elas não dá para
regerar as imagens.

As fotos originais somam 222 MB; as versões usadas no site somam 11 MB
(produtos com 900 px, institucionais com 1500 px, JPEG qualidade 82).

---

## Tarefas do dia a dia

### Corrigir um preço ou uma descrição

1. Abra `gerar-catalogo.py` e procure o produto dentro de `DADOS` (a chave é o nome do
   arquivo da foto, sem acento e em minúsculas — ex.: `"yara-25-ml"`).
2. Edite e rode:

```bash
python gerar-catalogo.py
```

### Adicionar um produto novo

1. Coloque a foto na pasta original da categoria, com o nome do perfume no arquivo.
2. Gere a versão web:

```bash
python otimizar-imagens.py
```

3. Rode `python gerar-catalogo.py`. Ele avisa quais fotos ainda estão **sem dados**
   e o nome exato da chave a usar.
4. Cadastre o produto em `DADOS` seguindo o formato:

```python
"slug-da-foto": D("Nome", "Marca", "100 ml", "feminino", "Perfume", 199.99,
    "Descrição com as notas de topo, coração e fundo.", True),
```

O último argumento (`True`) marca o produto como destaque na home — a home mostra
os 8 primeiros marcados.

- `genero`: `feminino`, `masculino` ou `unissex`
- `preco`: use `None` para o site mostrar "Sob consulta"

### Criar uma categoria

Adicione uma entrada em `CATEGORIAS` (em `gerar-catalogo.py`) e o caminho da pasta de
fotos em `CATEGORIAS` dentro de `otimizar-imagens.py`.

---

## Pendências conhecidas no catálogo

Coisas que os PDFs não resolvem e que valem uma conferida:

- **Sem preço nos PDFs** (aparecem como "Sob consulta"): Coco Chanel 25 ml,
  Sí 25 ml, L'Interdit 25 ml.
- **Hidratantes Armani Code (164) e Polo Blue (174)**: não constam no PDF; foram
  cadastrados a R$ 49,99, que é o preço de todos os outros hidratantes da linha.
- **Fame Blooming Pink (378)**: o PDF descreve o Gucci Bloom nesse item, o que parece
  troca de texto. Ficou com uma descrição genérica até confirmar.
- **Invictus 200 ml (importado)**: o PDF repete a descrição do 212 VIP Men. Foi usada
  a descrição correta do Invictus, que consta no PDF da Brand Collection.
- **No PDF mas sem foto** (por isso fora do site): Phantom Elixir 25 ml (440) e o
  hidratante Fame (365).

---

## Publicar

Qualquer hospedagem de site estático serve — GitHub Pages, Netlify, Vercel, Cloudflare
Pages ou a hospedagem que você já tiver. Suba a pasta inteira (exceto, se quiser
economizar espaço, as pastas de fotos originais, que só são necessárias para regerar
o catálogo).
