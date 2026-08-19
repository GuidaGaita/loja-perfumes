# -*- coding: utf-8 -*-
"""Gera data/catalogo.js a partir do manifesto de imagens + dados dos catalogos PDF.

Fluxo:  python otimizar-imagens.py  ->  python gerar-catalogo.py

Para corrigir preco, nome ou descricao de um produto, edite DADOS abaixo
(a chave e o nome do arquivo da foto, sem acentos e em minusculas) e rode de novo.
"""
import json
import os

RAIZ = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# DADOS DA LOJA - edite aqui nome, WhatsApp e redes sociais.
# O WhatsApp deve estar no formato internacional, so numeros: 55 + DDD + numero.
# ---------------------------------------------------------------------------
LOJA = {
    "nome": "Carla Perfumaria",
    "assinatura": "Árabes originais, importados e nacionais",
    "whatsapp": "5561981131320",
    "instagram": "",
    "entrega": "Enviamos para todo o Brasil — combine a entrega pelo WhatsApp",
    "pagamento": "Pix, cartão e dinheiro",
}

CATEGORIAS = [
    {
        "slug": "arabes-originais",
        "nome": "Árabes Originais",
        "chamada": "Lattafa, Maison Alhambra, Al Wataniah e Armaf — 100 ml",
        "descricao": "Fragrâncias árabes originais de 100 ml, com alta fixação e projeção. "
                     "Perfis orientais, amadeirados e gourmand para quem quer marcar presença.",
        "capa": "assets/marca/18.jpg",
        "pdf": "assets/catalogos/arabes-originais.pdf",
    },
    {
        "slug": "miniaturas-arabes",
        "nome": "Miniaturas Árabes",
        "chamada": "As fragrâncias árabes em 25 ml",
        "descricao": "Versões de 25 ml das fragrâncias árabes mais procuradas. Cabem na bolsa, são ideais "
                     "para experimentar antes do tamanho grande e para presentear.",
        "capa": "assets/marca/31.jpg",
        "pdf": "assets/catalogos/miniaturas-arabes.pdf",
    },
    {
        "slug": "brand-nacionais",
        "nome": "Brand Collection",
        "chamada": "Perfumes e hidratantes nacionais",
        "descricao": "Linha nacional Brand Collection: miniaturas de 25 ml, tamanhos grandes de 80/100 ml e "
                     "hidratantes perfumados que repetem a inspiração olfativa de cada fragrância.",
        "capa": "assets/marca/29.jpg",
        "pdf": "assets/catalogos/brand-nacionais.pdf",
    },
    {
        "slug": "importados",
        "nome": "Importados Originais",
        "chamada": "Chanel, Dior, Carolina Herrera, Lancôme e Rabanne",
        "descricao": "Perfumes importados originais, lacrados e em tamanhos grandes. "
                     "Os clássicos de perfumaria que todo mundo reconhece.",
        "capa": "assets/marca/19.jpg",
        "pdf": "assets/catalogos/importados.pdf",
    },
    {
        "slug": "isabelle-la-belle",
        "nome": "Isabelle La Belle",
        "chamada": "Body splash 300 ml + hidratante 200 g",
        "descricao": "Kits de body splash de 300 ml acompanhados do hidratante de 200 g na mesma fragrância. "
                     "Perfume leve para o dia a dia e pele macia no mesmo ritual.",
        "capa": "assets/marca/8.jpg",
        "pdf": "assets/catalogos/isabelle-la-belle.pdf",
    },
    {
        "slug": "acessorios",
        "nome": "Acessórios",
        "chamada": "Decantes e frascos para levar seu perfume",
        "descricao": "Decantes e frascos atomizadores recarregáveis para transportar sua fragrância favorita "
                     "na bolsa, na mochila ou na viagem.",
        "capa": "assets/marca/32.jpg",
        "pdf": "assets/catalogos/acessorios.pdf",
    },
]


def D(nome, marca, volume, genero, tipo, preco, descricao, destaque=False):
    """genero: feminino | masculino | unissex.  preco None -> 'Sob consulta'."""
    return {
        "nome": nome, "marca": marca, "volume": volume, "genero": genero,
        "tipo": tipo, "preco": preco, "descricao": descricao, "destaque": destaque,
    }


DADOS = {}

# --------------------------- ARABES ORIGINAIS (100 ml) ---------------------
DADOS.update({
"asad-tradicional-original": D("Asad Tradicional", "Lattafa", "100 ml", "masculino", "Perfume", 250.00,
    "Oriental masculino intenso, quente, especiado e marcante. Topo: pimenta preta, tabaco e abacaxi. "
    "Coração: patchouli, café e íris. Fundo: baunilha, âmbar, madeira seca, benjoim e ládano.", True),
"asad-elixir-original": D("Asad Elixir", "Lattafa", "100 ml", "masculino", "Perfume", 289.99,
    "Oriental masculino intenso e sofisticado. Topo: pimenta rosa, açafrão e toranja. "
    "Coração: tabaco, baunilha e cedro. Fundo: âmbar claro, olíbano, patchouli e cashmeran."),
"asad-bourbon-original": D("Asad Bourbon", "Lattafa", "100 ml", "masculino", "Perfume", 310.00,
    "Oriental especiado com forte apelo adocicado e gourmand. Topo: lavanda, ameixa mirabelle e pimenta rosa. "
    "Coração: cacau, noz-moscada e davana. Fundo: baunilha bourbon, âmbar e vetiver.", True),
"al-noble-safeer-original": D("Al Noble Safeer", "Lattafa", "100 ml", "unissex", "Perfume", 189.99,
    "Compartilhável fresco, cítrico e amadeirado. Topo: toranja, bergamota, gengibre e pimenta preta. "
    "Coração: caramelo, jasmim e heliotrópio. Fundo: madeira guaiac, almíscar, nagarmota, âmbar cinzento e cashmeran."),
"fakhar-black-original": D("Fakhar Black", "Lattafa", "100 ml", "masculino", "Perfume", 199.99,
    "Oriental masculino fresco, aromático e amadeirado. Topo: maçã, bergamota e gengibre. "
    "Coração: lavanda, sálvia, bagas de zimbro e gerânio. Fundo: fava tonka, cedro, madeira de âmbar e vetiver."),
"spectre-amazonite-original": D("Sceptre Amazonite", "Maison Alhambra", "100 ml", "unissex", "Perfume", 180.00,
    "Amadeirado especiado compartilhável. Topo: noz-moscada e canela. Coração: nagarmota e olíbano. "
    "Fundo: agarwood (oud), almíscar negro e açafrão."),
"niche-emirati-khanjar-original": D("Niche Emirati Khanjar", "Lattafa", "100 ml", "unissex", "Perfume", 349.99,
    "Compartilhável com aroma especiado, amadeirado e sofisticado. Topo: noz-moscada, pimenta e gengibre. "
    "Coração: violeta, patchouli e cashmeran. Fundo: couro, incenso, almíscar e vetiver."),
"eternal-vanille-original": D("Eternal Vanille", "Lattafa", "100 ml", "unissex", "Perfume", 259.99,
    "Compartilhável cremoso, doce e envolvente. Topo: amora. Coração: cocoapulse, caviar de baunilha e cacau. "
    "Fundo: akigalawood, fava tonka, ambrofix, benjoim, cedro e almíscar.", True),
"philos-opus-noir-original": D("Philos Opus Noir", "Maison Alhambra", "100 ml", "unissex", "Perfume", 130.00,
    "Amadeirado aromático compartilhável. Topo: frutas e rosa turca. Coração: ylang ylang, couro, noz-moscada e âmbar. "
    "Fundo: patchouli, baunilha, vetiver, almíscar e cedro."),
"dream-of-haze-original": D("Dream of Haze", "Lattafa", "100 ml", "unissex", "Perfume", 320.00,
    "Oriental fougère compartilhável, fresco e envolvente com toque adocicado e especiado. "
    "Topo: hortelã e narguilé de maçã. Coração: canela, lavanda e artemísia. Fundo: fava tonka, âmbar e patchouli."),
"musamman-black-intense-original": D("Musamman Black Intense", "Lattafa", "100 ml", "unissex", "Perfume", 415.00,
    "Amadeirado aromático compartilhável. Topo: lavanda, noz-moscada, sálvia e bergamota. "
    "Coração: cedro, gerânio, rosyfolia e mahonial. Fundo: cocoapulse, fava tonka, bordo, ambrofix e patchouli."),
"salvo-edp-original": D("Salvo Elixir EDP", "Maison Alhambra", "100 ml", "masculino", "Perfume", 179.99,
    "Oriental fougère masculino, quente e amadeirado com toque adocicado. Topo: pimenta preta, tabaco e abacaxi. "
    "Coração: patchouli, íris e café. Fundo: notas amadeiradas, âmbar, baunilha, benjoim e ládano."),
"special-oud-original": D("Special Oud", "Al Wataniah", "100 ml", "unissex", "Perfume", 149.99,
    "Compartilhável quente, doce e intenso com toque amadeirado. Topo: couro, pêssego, açafrão, caramelo e bagas "
    "vermelhas. Coração: notas amadeiradas, pimenta rosa, nagarmota, ládano e gengibre. "
    "Fundo: agarwood (oud), patchouli, baunilha, benjoim, bálsamo do peru e almíscar."),
"club-de-nuit-intense-original": D("Club de Nuit Intense Man", "Armaf", "100 ml", "masculino", "Perfume", 292.00,
    "Amadeirado especiado masculino. Topo: limão, abacaxi, bergamota, groselha preta e maçã. "
    "Coração: bétula, jasmim e rosa. Fundo: almíscar, âmbar cinzento, patchouli e baunilha.", True),
"his-confession-original": D("His Confession", "Lattafa", "100 ml", "masculino", "Perfume", 309.99,
    "Oriental amadeirado masculino. Topo: canela, lavanda e mandarina. Coração: íris, benjoim, cipreste e mahonial. "
    "Fundo: baunilha, fava tonka, âmbar, incenso, cedro e patchouli."),
"badee-al-oud-glory-black-original": D("Bade'e Al Oud Honor & Glory", "Lattafa", "100 ml", "unissex", "Perfume", 199.99,
    "Oriental amadeirada, intensa e sofisticada. Topo: abacaxi e crème brûlée. "
    "Coração: canela, cúrcuma, pimenta preta e benjoim. Fundo: baunilha, sândalo, cashmeran e musgo."),
"yara-moi-original": D("Yara Moi", "Lattafa", "100 ml", "feminino", "Perfume", 199.99,
    "Feminino oriental âmbar floral. Topo: jasmim e pêssego. Coração: caramelo e âmbar. "
    "Fundo: patchouli e sândalo."),
"yara-rose-original": D("Yara Rose", "Lattafa", "100 ml", "feminino", "Perfume", 250.00,
    "Oriental baunilha feminino. Topo: orquídea, heliotrópio e tangerina. "
    "Coração: acorde gourmand e frutas tropicais. Fundo: baunilha, almíscar e sândalo.", True),
"yara-candy": D("Yara Candy", "Lattafa", "100 ml", "feminino", "Perfume", 260.00,
    "Floral frutado gourmand feminino. Topo: groselha preta e tangerina verde. "
    "Coração: bala de morango efervescente e gardênia. Fundo: baunilha, almíscar, âmbar e sândalo."),
"sabah-valentine-original": D("Sabah Al Ward Valentine", "Al Wataniah", "100 ml", "feminino", "Perfume", 259.99,
    "Oriental baunilha feminino. Topo: cereja, notas doces, baunilha e creme. "
    "Coração: café, cítricos, flor de laranjeira e flores brancas. Fundo: almíscar, patchouli e âmbar."),
"her-confession-original": D("Her Confession", "Lattafa", "100 ml", "feminino", "Perfume", 299.99,
    "Feminino floral, quente e envolvente. Topo: canela e mystikal. Coração: tuberosa, jasmim, incenso e mahonial. "
    "Fundo: baunilha, almíscar e fava tonka."),
"sabah-sugar-original": D("Sabah Al Ward Sugar", "Al Wataniah", "100 ml", "feminino", "Perfume", 195.00,
    "Oriental floral feminino. Topo: morango, framboesa, groselha preta, mirtilo e cereja. "
    "Coração: violeta e jasmim. Fundo: baunilha, âmbar, almíscar, pétalas de rosa, musgo de carvalho, "
    "cashmeran e patchouli."),
"noble-blush-original": D("Noble Blush", "Lattafa", "100 ml", "feminino", "Perfume", 199.99,
    "Floral frutado gourmand feminino. Topo: leite de rosas. Coração: merengue e amêndoa. "
    "Fundo: baunilha, almíscar e sândalo."),
"fakhar-rose-original": D("Fakhar Rose", "Lattafa", "100 ml", "feminino", "Perfume", 268.00,
    "Floral feminino. Topo: frutas, lírio, romã e aldeídos. Coração: tuberosa, jasmim, gardênia, ylang ylang, "
    "madressilva, rosa e peônia. Fundo: baunilha, almíscar branco, sândalo e ambroxan."),
"durrat-original": D("Durrat Al Aroos", "Al Wataniah", "100 ml", "feminino", "Perfume", 210.00,
    "Oriental feminino cremoso, quente e levemente adocicado, com fundo amadeirado envolvente. "
    "Topo: almíscar branco e nagarmota. Coração: baunilha, cardamomo e açafrão. Fundo: madeira guaiac e cumarina."),
"veneno-bianco-original": D("Veneno Bianco", "French Avenue", "100 ml", "unissex", "Perfume", 540.00,
    "Floral compartilhável, cremoso e sofisticado. Topo: néroli, leite e bergamota. "
    "Coração: flores brancas, tiaré e ylang ylang. Fundo: coco, baunilha, ládano e madeira guaiac."),
"kit-asad-25-mil": D("Kit Asad Collection 25 ml", "Lattafa", "4 x 25 ml", "masculino", "Kit", 349.99,
    "Conjunto com 4 fragrâncias masculinas de 25 ml: Asad, Asad Elixir, Asad Zanzibar e Asad Bourbon. "
    "Coleção oriental que vai do especiado e amadeirado ao fresco e adocicado."),
"kit-asad-completo": D("Kit Asad Completo", "Lattafa", "3 peças", "masculino", "Kit", 310.00,
    "Kit de 3 peças da linha Asad: perfume 100 ml, desodorante perfumado em spray 200 ml e home spray 50 ml."),
"kit-yara-5-ml": D("Kit Yara 5 ml", "Lattafa", "4 x 5 ml", "feminino", "Kit", 129.99,
    "Coleção com 4 miniaturas de 5 ml: Yara, Yara Moi, Yara Tous e Yara Candy. Fragrâncias doces, florais, "
    "frutadas e gourmand — perfeitas para experimentar, levar na bolsa ou viajar.", True),
"kit-yara-25-mil": D("Kit Yara 25 ml", "Lattafa", "4 x 25 ml", "feminino", "Kit", 299.99,
    "Coleção com 4 perfumes de 25 ml: Yara, Yara Moi, Yara Tous e Yara Candy. Feminina, doce, cremosa, floral "
    "e frutada, do gourmand delicado ao tropical marcante."),
"kit-masa-3-itens": D("Kit Masa 3 Itens", "Lattafa", "3 peças", "unissex", "Kit", 365.00,
    "Kit compartilhável com perfume Masa 100 ml, body spray 200 ml e mini perfume 20 ml."),
"kit-bade-25ml": D("Kit Bade'e Al Oud 25 ml", "Lattafa", "4 x 25 ml", "unissex", "Kit", 209.99,
    "Coleção com 4 mini perfumes de 25 ml: Oud for Glory, Honor & Glory, Sublime e Noble Blush. "
    "Orientais intensos e sofisticados, entre oud, amadeirado, especiado, frutado e adocicado."),
})

# --------------------------- MINIATURAS ARABES (25 ml) ---------------------
DADOS.update({
"fakhar-rose-25-ml": D("Fakhar Rose 25 ml", "Lattafa", "25 ml", "feminino", "Miniatura", 60.00,
    "Floral feminino. Topo: frutas, lírio, romã e aldeídos. Coração: tuberosa, jasmim, gardênia, ylang ylang, "
    "madressilva, rosa e peônia. Fundo: baunilha, almíscar branco, sândalo e ambroxan."),
"yara-tous-25-ml": D("Yara Tous 25 ml", "Lattafa", "25 ml", "feminino", "Miniatura", 62.00,
    "Feminino tropical e cremoso. Topo: manga, coco e maracujá. Coração: jasmim, flor de laranjeira e heliotrópio. "
    "Fundo: baunilha, almíscar e cashmeran."),
"yara-25-ml": D("Yara 25 ml", "Lattafa", "25 ml", "feminino", "Miniatura", 60.00,
    "Oriental baunilha feminino. Topo: orquídea, heliotrópio e tangerina. "
    "Coração: acorde gourmand e frutas tropicais. Fundo: baunilha, almíscar e sândalo.", True),
"yara-moi-25-ml": D("Yara Moi 25 ml", "Lattafa", "25 ml", "feminino", "Miniatura", 60.00,
    "Feminino oriental âmbar floral. Topo: jasmim e pêssego. Coração: caramelo e âmbar. "
    "Fundo: patchouli e sândalo."),
"amber-rouge-25-ml": D("Amber Rouge 25 ml", "Orientica Premium", "25 ml", "unissex", "Miniatura", 75.00,
    "Amadeirado especiado compartilhável. Topo: açafrão e jasmim. Coração: madeira de âmbar e âmbar cinzento. "
    "Fundo: cedro e resina de abeto."),
"royal-amber-25-ml": D("Royal Amber 25 ml", "Orientica Premium", "25 ml", "unissex", "Miniatura", 77.00,
    "Oriental baunilha compartilhável. Topo: bergamota e notas verdes. Coração: notas doces, melão, abacaxi e âmbar. "
    "Fundo: almíscar, notas amadeiradas e baunilha."),
"al-noble-wazeer-25-ml": D("Al Noble Wazeer 25 ml", "Lattafa", "25 ml", "unissex", "Miniatura", 69.99,
    "Compartilhável. Topo: conhaque, açafrão, noz-moscada e maçã. Coração: cedro, sândalo, whiskey e carvalho. "
    "Fundo: mirra, ambroxan, baunilha e almíscar."),
"fakhar-black-25-ml": D("Fakhar Black 25 ml", "Lattafa", "25 ml", "masculino", "Miniatura", 60.00,
    "Oriental masculino. Topo: maçã, bergamota e gengibre. Coração: lavanda, sálvia, bagas de zimbro e gerânio. "
    "Fundo: fava tonka, cedro, madeira de âmbar e vetiver."),
"asad-25-ml": D("Asad 25 ml", "Lattafa", "25 ml", "masculino", "Miniatura", 69.99,
    "Oriental masculino intenso, quente, especiado e marcante. Topo: pimenta preta, tabaco e abacaxi. "
    "Coração: patchouli, café e íris. Fundo: baunilha, âmbar, madeira seca, benjoim e ládano.", True),
"asad-bourbon-25-ml": D("Asad Bourbon 25 ml", "Lattafa", "25 ml", "masculino", "Miniatura", 69.99,
    "Oriental especiado com apelo adocicado e gourmand. Topo: lavanda, ameixa mirabelle e pimenta rosa. "
    "Coração: cacau, noz-moscada e davana. Fundo: baunilha bourbon, âmbar e vetiver."),
})

# --------------------------- BRAND COLLECTION ------------------------------
# Miniaturas femininas 25 ml
DADOS.update({
"009-212-vip-branco-25-ml": D("212 VIP Branco 25 ml", "Brand Collection nº 009", "25 ml", "feminino", "Miniatura", 60.00,
    "Inspirado em 212 VIP de Carolina Herrera — oriental baunilha feminino. Topo: rum e maracujá. "
    "Coração: gardênia e almíscar. Fundo: baunilha e fava tonka."),
"246-burberry-for-her-25-ml": D("Burberry Her 25 ml", "Brand Collection nº 246", "25 ml", "feminino", "Miniatura", 60.00,
    "Inspirado em Burberry Her — floral frutado gourmand. Topo: morango, framboesa, amora, cereja amarga, "
    "groselha preta, mandarina e limão. Coração: violeta e jasmim. Fundo: almíscar, baunilha, cashmeran, "
    "notas amadeiradas, âmbar, musgo de carvalho e patchouli."),
"060-narciso-rodriguez-25-ml": D("Narciso Rodriguez For Her 25 ml", "Brand Collection nº 060", "25 ml", "feminino", "Miniatura", 60.00,
    "Inspirado em Narciso Rodriguez For Her EDP — floral amadeirado almiscarado. Topo: rosa e pêssego. "
    "Coração: almíscar e âmbar. Fundo: patchouli e sândalo."),
"034-212-vip-rose-25-ml": D("212 VIP Rosé 25 ml", "Brand Collection nº 034", "25 ml", "feminino", "Miniatura", 60.00,
    "Inspirado em 212 VIP Rosé de Carolina Herrera — floral frutado feminino. Topo: champanhe rosé e pimenta rosa. "
    "Coração: flor de pêssego e rosa. Fundo: almíscar branco e notas amadeiradas."),
"012-la-vie-25-ml": D("La Vie Est Belle 25 ml", "Brand Collection nº 012", "25 ml", "feminino", "Miniatura", 60.00,
    "Inspirado em La Vie Est Belle de Lancôme — floral frutado gourmet. Topo: groselha preta e pêra. "
    "Coração: íris, jasmim e flor de laranjeira. Fundo: pralinê, baunilha, patchouli e fava tonka.", True),
"235-bvlgari-rose-25-ml": D("Bvlgari Rose Goldea 25 ml", "Brand Collection nº 235", "25 ml", "feminino", "Miniatura", 60.00,
    "Inspirado em Rose Goldea de Bvlgari — floral amadeirado almiscarado. Topo: rosa, almíscar, romã e bergamota. "
    "Coração: rosa damascena, peônia, jasmim e pêssego. Fundo: almíscar, sândalo, olíbano e baunilha."),
"015-miss-dior-25-mil": D("Miss Dior 25 ml", "Brand Collection nº 015", "25 ml", "feminino", "Miniatura", 60.00,
    "Inspirado em Miss Dior EDP — oriental floral feminino. Topo: íris, peônia e lírio-do-vale. "
    "Coração: rosa, damasco e pêssego. Fundo: baunilha, almíscar, fava tonka, sândalo e benjoim."),
"435-burberry-goodness-25-ml": D("Burberry Goddess 25 ml", "Brand Collection nº 435", "25 ml", "feminino", "Miniatura", 60.00,
    "Inspirado em Goddess de Burberry — aromático feminino. Topo: baunilha, lavanda, cacau e gengibre. "
    "Coração: caviar de baunilha. Fundo: absoluto de baunilha."),
"341-nomade-chloe-25-ml": D("Nomade Chloé 25 ml", "Brand Collection nº 341", "25 ml", "feminino", "Miniatura", 60.00,
    "Inspirado em Nomade de Chloé — chipre floral feminino. Topo: ameixa mirabelle, bergamota, limão e laranja. "
    "Coração: frésia, pêssego, jasmim e rosa. Fundo: musgo de carvalho, patchouli, madeira de âmbar, "
    "almíscar branco e sândalo."),
"087-olympia-25-ml": D("Olympéa 25 ml", "Brand Collection nº 087", "25 ml", "feminino", "Miniatura", 60.00,
    "Inspirado em Olympéa de Rabanne — oriental floral feminino. Topo: jasmim aquático, mandarina verde e "
    "flor de gengibre. Coração: baunilha e sal. Fundo: madeira de cashmere, âmbar cinzento e sândalo."),
"159-libre-25-ml": D("Libre 25 ml", "Brand Collection nº 159", "25 ml", "feminino", "Miniatura", 60.00,
    "Inspirado em Libre de Yves Saint Laurent — oriental fougère feminino. Topo: lavanda, mandarina, "
    "groselha preta e petitgrain. Coração: lavanda, flor de laranjeira e jasmim. "
    "Fundo: baunilha de madagascar, almíscar, cedro e âmbar cinzento."),
"238-idole-25-ml": D("Idôle 25 ml", "Brand Collection nº 238", "25 ml", "feminino", "Miniatura", 60.00,
    "Inspirado em Idôle de Lancôme — chipre floral feminino. Topo: pêra, bergamota e pimenta rosa. "
    "Coração: rosa e jasmim. Fundo: almíscar branco, baunilha, patchouli e cedro."),
"391-valentino-born-in-roma": D("Valentino Born In Roma 25 ml", "Brand Collection nº 391", "25 ml", "feminino", "Miniatura", 60.00,
    "Inspirado em Valentino Donna Born In Roma — oriental floral feminino. "
    "Coração: jasmim, jasmim sambac e chá de jasmim. Fundo: baunilha bourbon, cashmeran e madeira guaiac."),
"378-fame-feminino-blooming-pink": D("Fame Blooming Pink 25 ml", "Brand Collection nº 378", "25 ml", "feminino", "Miniatura", 60.00,
    "Fragrância floral feminina da linha Brand Collection, leve e marcante para o dia a dia."),
"136-scandal-25-ml": D("Scandal 25 ml", "Brand Collection nº 136", "25 ml", "feminino", "Miniatura", 60.00,
    "Inspirado em Scandal de Jean Paul Gaultier — chipre floral feminino. Topo: laranja sanguínea e mandarina. "
    "Coração: mel, gardênia, flor de laranjeira, jasmim e pêssego. "
    "Fundo: cera de abelha, caramelo, patchouli e alcaçuz."),
"332-good-girl-glam-25-ml": D("Very Good Girl Glam 25 ml", "Brand Collection nº 332", "25 ml", "feminino", "Miniatura", 60.00,
    "Inspirado em Very Good Girl Glam de Carolina Herrera — floral amadeirado. "
    "Topo: cereja amarga e amêndoa amarga. Coração: rosa e lírio. Fundo: baunilha bourbon e vetiver."),
"297-good-girl-very-25-ml": D("Very Good Girl 25 ml", "Brand Collection nº 297", "25 ml", "feminino", "Miniatura", 60.00,
    "Inspirado em Very Good Girl de Carolina Herrera — floral frutado feminino. "
    "Topo: lichia e groselha vermelha. Coração: rosa. Fundo: baunilha e vetiver."),
"063-si-25-ml": D("Sí 25 ml", "Brand Collection nº 063", "25 ml", "feminino", "Miniatura", None,
    "Inspirado em Sí de Giorgio Armani — chipre frutado feminino, elegante e envolvente."),
"021-coco-chanel-25-ml": D("Coco Chanel 25 ml", "Brand Collection nº 021", "25 ml", "feminino", "Miniatura", None,
    "Inspirado em Chanel Nº 5 — floral aldeídico feminino. Topo: aldeídos, ylang ylang, néroli, bergamota e "
    "pêssego. Coração: íris, jasmim, rosa e lírio-do-vale. "
    "Fundo: sândalo, musgo de carvalho, baunilha, patchouli e vetiver."),
"382-linterdit-25-ml": D("L'Interdit 25 ml", "Brand Collection nº 382", "25 ml", "feminino", "Miniatura", None,
    "Inspirado em L'Interdit de Givenchy — floral branco feminino, sofisticado e envolvente."),
})

# Femininas grandes 80/100 ml
DADOS.update({
"034-212-vip-rose-80ml": D("212 VIP Rosé 80 ml", "Brand Collection nº 034", "80 ml", "feminino", "Perfume", 199.99,
    "Inspirado em 212 VIP Rosé de Carolina Herrera — floral frutado feminino. Topo: champanhe rosé e pimenta rosa. "
    "Coração: flor de pêssego e rosa. Fundo: almíscar branco e notas amadeiradas."),
"12-la-vie-est-belle-80-ml": D("La Vie Est Belle 80 ml", "Brand Collection nº 012", "80 ml", "feminino", "Perfume", 199.99,
    "Inspirado em La Vie Est Belle de Lancôme — floral frutado gourmet. Topo: groselha preta e pêra. "
    "Coração: íris, jasmim e flor de laranjeira. Fundo: pralinê, baunilha, patchouli e fava tonka."),
"021-coco-chanel-80-ml": D("Coco Chanel 80 ml", "Brand Collection nº 021", "80 ml", "feminino", "Perfume", 199.99,
    "Inspirado em Chanel Nº 5 EDP — floral aldeídico feminino. Topo: aldeídos, ylang ylang, néroli, bergamota "
    "e pêssego. Coração: íris, jasmim, rosa e lírio-do-vale. "
    "Fundo: sândalo, musgo de carvalho, baunilha, patchouli e vetiver."),
"380-baccarat-rouge-extrait-100ml": D("Baccarat Rouge 540 Extrait 100 ml", "Brand Collection nº 380", "100 ml", "unissex", "Perfume", 210.00,
    "Inspirado em Baccarat Rouge 540 Extrait de Maison Francis Kurkdjian — oriental floral compartilhável. "
    "Topo: amêndoa amarga e açafrão. Coração: jasmim egípcio e cedro da virgínia. "
    "Fundo: âmbar cinzento, notas amadeiradas, almíscar, ambroxan e cashmeran.", True),
"087-olympia-80-ml": D("Olympéa 80 ml", "Brand Collection nº 087", "80 ml", "feminino", "Perfume", 199.99,
    "Inspirado em Olympéa de Rabanne — oriental floral feminino. Topo: jasmim aquático, mandarina verde e "
    "flor de gengibre. Coração: baunilha e sal. Fundo: madeira de cashmere, âmbar cinzento e sândalo."),
"126-good-girl-80-ml": D("Good Girl 80 ml", "Brand Collection nº 126", "80 ml", "feminino", "Perfume", 199.99,
    "Inspirado em Good Girl de Carolina Herrera — oriental floral feminino. Topo: amêndoa, café, bergamota e limão. "
    "Coração: tuberosa, jasmim sambac, flor de laranjeira, rosa búlgara e raiz de orris. "
    "Fundo: fava tonka, cacau, baunilha, pralinê, sândalo, almíscar, âmbar, madeira de cashmere, patchouli, "
    "canela e cedro.", True),
})

# Miniaturas masculinas 25 ml
DADOS.update({
"008-vip-men-25-ml": D("212 VIP Men 25 ml", "Brand Collection nº 008", "25 ml", "masculino", "Miniatura", 60.00,
    "Inspirado em 212 VIP Men de Carolina Herrera — oriental amadeirado masculino. "
    "Topo: maracujá, lima, pimenta, gengibre e limão caviar. Coração: vodka, gin, hortelã e especiarias. "
    "Fundo: âmbar, couro e notas amadeiradas."),
"250-azzaro-wanted-25-ml": D("Azzaro Wanted 25 ml", "Brand Collection nº 250", "25 ml", "masculino", "Miniatura", 60.00,
    "Inspirado em Wanted de Azzaro — amadeirado especiado masculino. Topo: limão, gengibre, lavanda e hortelã. "
    "Coração: maçã, cardamomo da guatemala, zimbro e gerânio. "
    "Fundo: fava tonka, madeira de âmbar e vetiver do haiti."),
"116-invictus-25-ml": D("Invictus 25 ml", "Brand Collection nº 116", "25 ml", "masculino", "Miniatura", 60.00,
    "Inspirado em Invictus de Rabanne — amadeirado aquático masculino. "
    "Topo: notas oceânicas, toranja e mandarina. Coração: folha de louro e jasmim. "
    "Fundo: âmbar cinzento, madeira guaiac, musgo de carvalho e patchouli."),
"028-hugo-boss-man25-ml": D("Hugo Boss Man 25 ml", "Brand Collection nº 028", "25 ml", "masculino", "Miniatura", 60.00,
    "Inspirado em Hugo Man de Hugo Boss — amadeirado aromático masculino. Topo: maçã verde. Coração: lavanda. "
    "Fundo: pinheiro, notas amadeiradas e bálsamo de abeto."),
"323-le-male-elixir-25-ml": D("Le Male Elixir 25 ml", "Brand Collection nº 323", "25 ml", "masculino", "Miniatura", 60.00,
    "Inspirado em Le Male Elixir de Jean Paul Gaultier — oriental fougère masculino. Topo: lavanda e hortelã. "
    "Coração: baunilha e benjoim. Fundo: mel, fava tonka e tabaco.", True),
"005-one-million-25ml": D("One Million 25 ml", "Brand Collection nº 005", "25 ml", "masculino", "Miniatura", 60.00,
    "Inspirado em 1 Million de Rabanne — amadeirado especiado masculino. "
    "Topo: mandarina sanguínea, toranja e hortelã. Coração: canela, notas especiadas e rosa. "
    "Fundo: âmbar, couro, notas amadeiradas e patchouli indiano."),
"084-mont-blanc-legend-25-ml": D("Mont Blanc Legend 25 ml", "Brand Collection nº 084", "25 ml", "masculino", "Miniatura", 60.00,
    "Inspirado em Legend de Montblanc — aromático fougère masculino. "
    "Topo: lavanda, abacaxi, bergamota e lúcia-lima. Coração: maçã vermelha, frutas secas, musgo de carvalho, "
    "gerânio, cumarina e rosa. Fundo: fava tonka e sândalo."),
"155-acqua-di-gio-25-ml": D("Acqua di Giò 25 ml", "Brand Collection nº 155", "25 ml", "masculino", "Miniatura", 60.00,
    "Inspirado em Acqua di Giò de Giorgio Armani — aromático aquático masculino. "
    "Topo: lima, limão, bergamota, jasmim, laranja, mandarina e néroli. "
    "Coração: notas oceânicas, jasmim, calone, alecrim, pêssego, frésia, jacinto e violeta. "
    "Fundo: almíscar branco, cedro, musgo de carvalho, patchouli e âmbar."),
"433-myself-25-ml": D("MYSLF 25 ml", "Brand Collection nº 433", "25 ml", "masculino", "Miniatura", 60.00,
    "Inspirado em MYSLF de Yves Saint Laurent — aromático masculino. "
    "Topo: bergamota da calábria e bergamota. Coração: flor de laranjeira tunisiana. Fundo: ambrofix e patchouli."),
"181-bad-boy-25-ml": D("Bad Boy 25 ml", "Brand Collection nº 181", "25 ml", "masculino", "Miniatura", 69.99,
    "Inspirado em Bad Boy de Carolina Herrera — oriental especiado masculino. "
    "Topo: pimenta branca, bergamota e pimenta rosa. Coração: cedro e sálvia esclareia. "
    "Fundo: fava tonka e cacau."),
"443-bad-boy-elixir-25-ml": D("Bad Boy Elixir 25 ml", "Brand Collection nº 443", "25 ml", "masculino", "Miniatura", 69.99,
    "Inspirado em Bad Boy Elixir de Carolina Herrera — oriental amadeirado masculino. Topo: sálvia e lavanda. "
    "Coração: couro e íris. Fundo: cedro e olíbano."),
})

# Masculinas grandes 100 ml
DADOS.update({
"001-allure-100-ml": D("Allure Homme Sport 100 ml", "Brand Collection nº 001", "100 ml", "masculino", "Perfume", 199.99,
    "Inspirado em Allure Homme Sport de Chanel — amadeirado especiado masculino. "
    "Topo: laranja, notas oceânicas, aldeídos e mandarina sanguínea. Coração: pimenta, néroli e cedro. "
    "Fundo: baunilha, fava tonka, almíscar branco, âmbar, vetiver e resina de elemi."),
"154-212-vip-black-100ml": D("212 VIP Black 100 ml", "Brand Collection nº 154", "100 ml", "masculino", "Perfume", 199.99,
    "Inspirado em 212 VIP Black de Carolina Herrera — aromático fougère masculino. "
    "Topo: absinto, anis e erva-doce. Coração: lavanda. Fundo: casca de baunilha negra e almíscar."),
"070-bleu-de-chanel-100-ml": D("Bleu de Chanel 100 ml", "Brand Collection nº 070", "100 ml", "masculino", "Perfume", 199.99,
    "Inspirado em Bleu de Chanel EDP — amadeirado aromático masculino. "
    "Topo: toranja, limão, hortelã, bergamota, pimenta rosa, aldeídos e coentro. "
    "Coração: gengibre, jasmim, noz-moscada e melão. "
    "Fundo: incenso, âmbar, cedro, sândalo, madeira de âmbar, patchouli e ládano.", True),
})

# Hidratantes Brand Collection
DADOS.update({
"136-scandal-hidratantes-brand-collection": D("Hidratante Scandal", "Brand Collection nº 136", "200 g", "feminino", "Hidratante", 49.99,
    "Hidratante perfumado com a inspiração olfativa de Scandal — chipre floral feminino. "
    "Topo: laranja sanguínea e mandarina. Coração: mel, gardênia, flor de laranjeira, jasmim e pêssego. "
    "Fundo: cera de abelha, caramelo, patchouli e alcaçuz."),
"015-miss-dior-hidratantes-brand-collection": D("Hidratante Miss Dior", "Brand Collection nº 015", "200 g", "feminino", "Hidratante", 49.99,
    "Hidratante perfumado com a inspiração olfativa de Miss Dior — oriental floral feminino. "
    "Topo: íris, peônia e lírio-do-vale. Coração: rosa, damasco e pêssego. "
    "Fundo: baunilha, almíscar, fava tonka, sândalo e benjoim."),
"159-libre-hidratantes-brand-collection": D("Hidratante Libre", "Brand Collection nº 159", "200 g", "feminino", "Hidratante", 49.99,
    "Hidratante perfumado com a inspiração olfativa de Libre — oriental fougère feminino. "
    "Topo: lavanda, mandarina, groselha preta e petitgrain. Coração: lavanda, flor de laranjeira e jasmim. "
    "Fundo: baunilha de madagascar, almíscar, cedro e âmbar cinzento."),
"126-good-girl-hidratantes-brand-collection": D("Hidratante Good Girl", "Brand Collection nº 126", "200 g", "feminino", "Hidratante", 49.99,
    "Hidratante perfumado com a inspiração olfativa de Good Girl — oriental floral feminino. "
    "Topo: amêndoa, café, bergamota e limão. Coração: tuberosa, jasmim sambac, flor de laranjeira e rosa búlgara. "
    "Fundo: fava tonka, cacau, baunilha, pralinê, sândalo, almíscar e âmbar."),
"034-vip-rose-hidratantes-brand-collection": D("Hidratante VIP Rosé", "Brand Collection nº 034", "200 g", "feminino", "Hidratante", 49.99,
    "Hidratante perfumado com a inspiração olfativa de 212 VIP Rosé — floral frutado feminino. "
    "Topo: champanhe rosé e pimenta rosa. Coração: flor de pêssego e rosa. "
    "Fundo: almíscar branco e notas amadeiradas."),
"012-la-vie-est-belle-hidratantes-brand-collection": D("Hidratante La Vie Est Belle", "Brand Collection nº 012", "200 g", "feminino", "Hidratante", 49.99,
    "Hidratante perfumado com a inspiração olfativa de La Vie Est Belle — floral frutado gourmet. "
    "Topo: groselha preta e pêra. Coração: íris, jasmim e flor de laranjeira. "
    "Fundo: pralinê, baunilha, patchouli e fava tonka."),
"005-one-million-hidratantes-brand-collection": D("Hidratante One Million", "Brand Collection nº 005", "200 g", "masculino", "Hidratante", 49.99,
    "Hidratante perfumado com a inspiração olfativa de 1 Million — amadeirado especiado masculino. "
    "Topo: mandarina sanguínea, toranja e hortelã. Coração: canela, notas especiadas e rosa. "
    "Fundo: âmbar, couro, notas amadeiradas e patchouli indiano."),
"116-invictus-hidratantes-brand-collection": D("Hidratante Invictus", "Brand Collection nº 116", "200 g", "masculino", "Hidratante", 49.99,
    "Hidratante perfumado com a inspiração olfativa de Invictus — amadeirado aquático masculino. "
    "Topo: notas oceânicas, toranja e mandarina. Coração: folha de louro e jasmim. "
    "Fundo: âmbar cinzento, madeira guaiac, musgo de carvalho e patchouli."),
"164-armani-code-hidratantes-brand-collection": D("Hidratante Armani Code", "Brand Collection nº 164", "200 g", "masculino", "Hidratante", 49.99,
    "Hidratante perfumado com a inspiração olfativa de Armani Code — oriental amadeirado masculino, "
    "com notas de limão, flor de laranjeira, gergelim, fava tonka e couro."),
"174-polo-blue-hidratantes-brand-collection": D("Hidratante Polo Blue", "Brand Collection nº 174", "200 g", "masculino", "Hidratante", 49.99,
    "Hidratante perfumado com a inspiração olfativa de Polo Blue — aromático aquático masculino, "
    "com notas de melão, manjericão, sálvia, musgo de carvalho e almíscar."),
})

# --------------------------- IMPORTADOS ORIGINAIS --------------------------
DADOS.update({
"one-million-parfum-200ml": D("1 Million Parfum 200 ml", "Rabanne", "200 ml", "masculino", "Importado", 699.90,
    "Perfume couro masculino. Contém tuberosa, notas solares, sal, óleo de monoi, âmbar cinzento, couro, "
    "cashmeran, ládano e pinheiro.", True),
"silver-scent": D("Silver Scent", "Jacques Bogart", "100 ml", "masculino", "Importado", 199.00,
    "Oriental amadeirado masculino. Topo: flor de laranjeira e limão. "
    "Coração: lavanda, cardamomo, noz-moscada, alecrim, coentro e gerânio. "
    "Fundo: lichia, fava tonka, madeira de teca e vetiver."),
"bleu-de-chanel-150ml": D("Bleu de Chanel 150 ml", "Chanel", "150 ml", "masculino", "Importado", 1789.99,
    "Eau de Parfum amadeirado aromático masculino. "
    "Topo: toranja, limão, hortelã, bergamota, pimenta rosa, aldeídos e coentro. "
    "Coração: gengibre, jasmim, noz-moscada e melão. "
    "Fundo: incenso, âmbar, cedro, sândalo, madeira de âmbar, patchouli e ládano.", True),
"invictus-200ml": D("Invictus 200 ml", "Rabanne", "200 ml", "masculino", "Importado", 699.90,
    "Amadeirado aquático masculino. Topo: notas oceânicas, toranja e mandarina. "
    "Coração: folha de louro e jasmim. "
    "Fundo: âmbar cinzento, madeira guaiac, musgo de carvalho e patchouli."),
"nvictus-victory-200ml": D("Invictus Victory 200 ml", "Rabanne", "200 ml", "masculino", "Importado", 740.00,
    "Oriental âmbar masculino, intenso e sofisticado. Topo: pimenta rosa e limão. "
    "Coração: olíbano e lavanda. Fundo: baunilha, fava tonka e âmbar."),
"ch-men-200ml": D("CH Men 200 ml", "Carolina Herrera", "200 ml", "masculino", "Importado", 750.00,
    "Oriental especiado masculino. Topo: grama, bergamota e toranja. "
    "Coração: notas amadeiradas, noz-moscada, violeta, açafrão e jasmim. "
    "Fundo: açúcar, couro, baunilha, camurça, âmbar, madeira de cashmir, sândalo, musgo de carvalho e vetiver."),
"212-vip-black-200ml": D("212 VIP Black 200 ml", "Carolina Herrera", "200 ml", "masculino", "Importado", 759.99,
    "Aromático fougère masculino. Topo: absinto, anis e erva-doce. Coração: lavanda. "
    "Fundo: casca de baunilha negra e almíscar."),
"212-vip-men-200ml": D("212 VIP Men 200 ml", "Carolina Herrera", "200 ml", "masculino", "Importado", 610.00,
    "Oriental amadeirado masculino. Topo: maracujá, lima, pimenta, gengibre e limão caviar. "
    "Coração: vodka, gin, hortelã e especiarias. Fundo: âmbar, couro e notas amadeiradas."),
"jadore-100ml": D("J'adore 100 ml", "Dior", "100 ml", "feminino", "Importado", 859.99,
    "Floral frutado feminino. Topo: pêra, melão, magnólia, pêssego, mandarina e bergamota. "
    "Coração: jasmim, lírio-do-vale, tuberosa, frésia, rosa, orquídea, violeta e ameixa. "
    "Fundo: almíscar, baunilha, cedro e amora.", True),
"la-vie-est-belle-100ml": D("La Vie Est Belle 100 ml", "Lancôme", "100 ml", "feminino", "Importado", 650.00,
    "Floral frutado gourmand feminino. Topo: groselha preta e pêra. "
    "Coração: íris, jasmim e flor de laranjeira. Fundo: pralinê, baunilha, patchouli e fava tonka.", True),
"fantasy-britney-spears": D("Candied Fantasy", "Britney Spears", "100 ml", "feminino", "Importado", 260.00,
    "Floral frutado gourmand feminino. Topo: chiclete, morango e laranja. "
    "Coração: hibisco, jasmim sambac e lírio-do-vale. Fundo: cupcake, almíscar e sândalo."),
})

# --------------------------- ISABELLE LA BELLE ----------------------------
DADOS.update({
"yara-body-splash-hidratante": D("Yara — Body Splash + Hidratante", "Isabelle La Belle", "300 ml + 200 g", "feminino", "Kit", 250.00,
    "Body splash Yara 300 ml: fragrância feminina, doce e delicada, com toque floral, frutado e cremoso. "
    "Hidratante Yara 200 g: textura agradável que deixa a pele macia, hidratada e perfumada, "
    "complementando o body splash.", True),
"fakhar-rose-body-splash-hidratante": D("Fakhar Rose — Body Splash + Hidratante", "Isabelle La Belle", "300 ml + 200 g", "feminino", "Kit", 265.00,
    "Body splash Fakhar Rose 300 ml: fragrância feminina delicada e sofisticada, com aroma floral levemente "
    "adocicado e envolvente. Hidratante Fakhar Rose 200 g: hidratação e maciez com perfume floral suave."),
"sabah-al-ward-body-splash-hidratante": D("Sabah Al Ward — Body Splash + Hidratante", "Isabelle La Belle", "300 ml + 200 g", "feminino", "Kit", 215.00,
    "Body splash Sabah Al Ward 300 ml: notas de pimenta rosa, mandarina, flor de laranjeira, jasmim, baunilha, "
    "fava tonka e patchouli. Hidratante 200 g: flores brancas, baunilha, fava tonka e patchouli, "
    "deixando a pele hidratada, macia e perfumada."),
"fakhar-black-body-splash-hidratante": D("Fakhar Black — Body Splash + Hidratante", "Isabelle La Belle", "300 ml + 200 g", "masculino", "Kit", 250.00,
    "Body splash Fakhar Black 300 ml: maçã, bergamota e gengibre no topo; lavanda, gerânio e sálvia no coração; "
    "cedro, patchouli e almíscar no fundo. Hidratante 200 g: mesma inspiração olfativa, com toque fresco, "
    "amadeirado e envolvente."),
"asad-bourbon-body-hidrantante": D("Asad Bourbon — Body Splash + Hidratante", "Isabelle La Belle", "300 ml + 200 g", "masculino", "Kit", 279.99,
    "Body splash Asad Bourbon 300 ml: lavanda, ameixa mirabelle e pimenta rosa; cacau, noz-moscada e davana no "
    "coração; baunilha bourbon, âmbar e vetiver no fundo. Hidratante 200 g: baunilha, cacau, âmbar e especiarias.", True),
})

# --------------------------- ACESSORIOS (sem foto propria) -----------------
ACESSORIOS = [
    {
        "id": "decante-5ml",
        "nome": "Decante 5 ml",
        "marca": "Acessórios",
        "volume": "5 ml",
        "genero": "unissex",
        "tipo": "Decante",
        "preco": 25.00,
        "descricao": "Decante de 5 ml da fragrância da sua escolha. Ideal para experimentar um perfume antes de "
                     "levar o frasco cheio ou para carregar na bolsa.",
        "imagem": "assets/marca/32.jpg",
        "destaque": True,
    },
    {
        "id": "frasco-atomizador-5ml",
        "nome": "Frasco atomizador recarregável 5 ml",
        "marca": "Acessórios",
        "volume": "5 ml",
        "genero": "unissex",
        "tipo": "Frasco",
        "preco": 15.00,
        "descricao": "Frasco porta-perfume atomizador recarregável em spray, de 5 ml. Prático para transportar sua "
                     "fragrância no dia a dia e em viagens.",
        "imagem": "assets/marca/34.jpg",
        "destaque": False,
    },
    {
        "id": "frasco-vidro-8ml",
        "nome": "Frasco de vidro para perfume 8 ml",
        "marca": "Acessórios",
        "volume": "8 ml",
        "genero": "unissex",
        "tipo": "Frasco",
        "preco": 9.00,
        "descricao": "Frasco de vidro de 8 ml para armazenar e transportar perfume.",
        "imagem": "assets/marca/31.jpg",
        "destaque": False,
    },
]


def main():
    with open(os.path.join(RAIZ, "manifesto-imagens.json"), encoding="utf-8") as f:
        manifesto = json.load(f)

    produtos = []
    faltando = []

    for categoria in CATEGORIAS:
        slug_cat = categoria["slug"]
        if slug_cat == "acessorios":
            for item in ACESSORIOS:
                p = dict(item)
                p["categoria"] = slug_cat
                produtos.append(p)
            continue

        for item in manifesto["produtos"].get(slug_cat, []):
            id_produto = os.path.splitext(os.path.basename(item["imagem"]))[0]
            dado = DADOS.get(id_produto)
            if dado is None:
                faltando.append("%s/%s" % (slug_cat, id_produto))
                continue
            p = dict(dado)
            p["id"] = id_produto
            p["categoria"] = slug_cat
            p["imagem"] = item["imagem"]
            p["arquivoOriginal"] = item["arquivo"]
            produtos.append(p)

    # contagem por categoria
    for categoria in CATEGORIAS:
        categoria["total"] = sum(1 for p in produtos if p["categoria"] == categoria["slug"])

    saida = {"loja": LOJA, "categorias": CATEGORIAS, "produtos": produtos}

    destino = os.path.join(RAIZ, "data", "catalogo.js")
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    with open(destino, "w", encoding="utf-8") as f:
        f.write("/* Gerado por gerar-catalogo.py - nao edite a mao.\n")
        f.write("   Edite gerar-catalogo.py e rode: python gerar-catalogo.py */\n")
        f.write("window.CATALOGO = ")
        json.dump(saida, f, ensure_ascii=False, indent=2)
        f.write(";\n")

    print("%d produtos em %d categorias -> data/catalogo.js" % (len(produtos), len(CATEGORIAS)))
    for categoria in CATEGORIAS:
        print("   %-20s %3d" % (categoria["slug"], categoria["total"]))
    sem_preco = [p["nome"] for p in produtos if p.get("preco") is None]
    if sem_preco:
        print("\nSem preco no catalogo PDF (aparecem como 'Sob consulta'):")
        for nome in sem_preco:
            print("   - %s" % nome)
    if faltando:
        print("\nFotos sem dados em DADOS (ficaram de fora do site):")
        for nome in faltando:
            print("   - %s" % nome)


if __name__ == "__main__":
    main()
