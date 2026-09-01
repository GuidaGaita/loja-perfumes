# -*- coding: utf-8 -*-
"""Gera versoes web (leves) das fotos de produto e das fotos institucionais.
Uso: python otimizar-imagens.py
Saida: assets/produtos/<categoria>/<slug>.jpg  e  assets/marca/<n>.jpg
"""
import json
import os
import re
import unicodedata

from PIL import Image, ImageOps

RAIZ = os.path.dirname(os.path.abspath(__file__))

CATEGORIAS = {
    "arabes-originais": "PERFUMES ARABES ORIGINAIS",
    "miniaturas-arabes": "MINIATURAS ARABES",
    "brand-nacionais": "BRAND - PERFUMES E HIDRATANTES NACIONAIS",
    "importados": "IMPORTADOS ORIGINAIS",
    "isabelle-la-belle": "ISABELLE LA BELLE LINHA ARABES",
}
MARCA = "FOTOS DA CARLA PARA O CATALOGO"

LARGURA_PRODUTO = 900
LARGURA_MARCA = 1500
QUALIDADE = 82


def slug(texto):
    texto = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    texto = re.sub(r"[^a-zA-Z0-9]+", "-", texto).strip("-").lower()
    return re.sub(r"-{2,}", "-", texto)


def salvar(origem, destino, largura):
    im = Image.open(origem)
    im = ImageOps.exif_transpose(im)
    if im.mode in ("RGBA", "LA", "P"):
        fundo = Image.new("RGB", im.size, "white")
        im = im.convert("RGBA")
        fundo.paste(im, mask=im.split()[-1])
        im = fundo
    else:
        im = im.convert("RGB")
    if max(im.size) > largura:
        im.thumbnail((largura, largura), Image.LANCZOS)
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    im.save(destino, "JPEG", quality=QUALIDADE, optimize=True, progressive=True)
    return im.size


def main():
    manifesto = {"produtos": {}, "marca": []}

    for categoria, pasta in CATEGORIAS.items():
        caminho = os.path.join(RAIZ, pasta)
        itens = []
        for arquivo in sorted(os.listdir(caminho)):
            if not arquivo.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            nome = os.path.splitext(arquivo)[0]
            destino_rel = "assets/produtos/%s/%s.jpg" % (categoria, slug(nome))
            tamanho = salvar(os.path.join(caminho, arquivo), os.path.join(RAIZ, destino_rel), LARGURA_PRODUTO)
            itens.append({"arquivo": arquivo, "nome": nome, "imagem": destino_rel, "tamanho": tamanho})
            print("  %-52s -> %s" % (nome[:52], destino_rel))
        manifesto["produtos"][categoria] = itens
        print("%s: %d imagens" % (categoria, len(itens)))

    caminho_marca = os.path.join(RAIZ, MARCA)
    for arquivo in sorted(os.listdir(caminho_marca), key=lambda a: int(re.findall(r"\d+", a)[0])):
        if not arquivo.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        destino_rel = "assets/marca/%s.jpg" % os.path.splitext(arquivo)[0]
        salvar(os.path.join(caminho_marca, arquivo), os.path.join(RAIZ, destino_rel), LARGURA_MARCA)
        manifesto["marca"].append(destino_rel)
    print("marca: %d imagens" % len(manifesto["marca"]))

    with open(os.path.join(RAIZ, "manifesto-imagens.json"), "w", encoding="utf-8") as f:
        json.dump(manifesto, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
