# Pipeline antigo (histórico)

Estes arquivos **não são mais usados** e ficam aqui só como registro de como o
catálogo foi montado da primeira vez, a partir dos PDFs e das fotos originais.

A fonte de verdade agora é `data/catalogo.js`, editado pelo painel `admin.html`.

## Não rode estes scripts

`gerar-catalogo.py` reescreve `data/catalogo.js` a partir dos dicionários Python
que estão dentro dele — que estão congelados no estado de setembro de 2025.
Rodá-lo hoje **apagaria tudo que foi publicado pelo painel desde então**.

| Arquivo | O que fazia |
|---|---|
| `gerar-catalogo.py` | Juntava os dados dos produtos com o manifesto de imagens e gravava `data/catalogo.js` |
| `otimizar-imagens.py` | Reduzia as fotos originais para 900 px (produtos) e 1500 px (institucionais), JPEG q82 |
| `manifesto-imagens.json` | Saída do `otimizar-imagens.py`, entrada do `gerar-catalogo.py` |

O painel faz as duas coisas hoje: redimensiona a foto no navegador com as mesmas
medidas e grava o catálogo direto no repositório.

## Se um dia precisar de uma carga em massa

Prefira exportar o `data/catalogo.js` atual, alterar o JSON com um script à parte e
gravar de volta — assim nada do que está publicado se perde. `gerar-catalogo.py`
serve como referência das regras (principalmente `separar_notas`, que hoje vive em
`admin/catalogo.js`).
