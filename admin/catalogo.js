/* Regras do catálogo — funções puras, sem DOM e sem rede.
 *
 * Este arquivo é a tradução para JS do que gerar-catalogo.py fazia: derivar
 * resumo/notas a partir da descrição, contar produtos por categoria e gravar
 * data/catalogo.js sempre com a mesma forma. Manter isso separado do app deixa
 * a parte delicada (a que decide o conteúdo publicado) fácil de conferir.
 */
window.Catalogo = (function () {
  const CABECALHO =
    "/* Gerado pelo painel de administração (admin.html) - nao edite a mao.\n" +
    "   Abra admin.html, altere por lá e publique. */\n";

  /* Ordem fixa das chaves, para o arquivo publicado não embaralhar o diff a
     cada edição. Chaves opcionais só entram quando têm valor. */
  const ORDEM_LOJA = ["nome", "assinatura", "whatsapp", "instagram", "entrega", "pagamento"];
  const ORDEM_CATEGORIA = [
    "slug", "nome", "chamada", "descricao",
    "capa", "capaPos", "capaCardPos", "capaZoom", "capaOrigem", "total",
  ];
  const ORDEM_PRODUTO = [
    "nome", "marca", "volume", "genero", "tipo", "preco", "descricao", "destaque",
    "id", "categoria", "imagem", "arquivoOriginal", "resumo", "notas",
  ];
  const OPCIONAIS = new Set([
    "capaCardPos", "capaZoom", "capaOrigem", "arquivoOriginal", "notas",
  ]);

  const GENEROS = ["feminino", "masculino", "unissex"];

  /* Carrossel de fábrica da home. Precisa ser igual à lista de reserva no
     index.html: é o que a loja mostra enquanto o catálogo não tem a chave
     "home", e é o que o painel abre para editar nesse caso — assim a
     administradora ajusta o carrossel que está no ar, em vez de montar um
     novo do zero. */
  const BANNER_PADRAO = [
    { src: "assets/marca/11.jpg", pos: "center 33%", alt: "Kit de miniaturas Lattafa Yara Collection nas mãos" },
    { src: "assets/marca/22.jpg", pos: "center 20%", alt: "Frasco de perfume em formato de salto apresentado na palma da mão" },
    { src: "assets/marca/28.jpg", pos: "left center", alt: "Perfumes, body splash e caixas espalhados lado a lado" },
  ];

  /* Rótulos que separam a pirâmide olfativa dentro da descrição. */
  const ROTULOS_NOTAS = [
    ["topo", "Topo:"],
    ["coracao", "Coração:"],
    ["fundo", "Fundo:"],
  ];

  /* ------------------------------------------------------------ utilitários */

  /* Mesmo slug do antigo otimizar-imagens.py: sem acento, minúsculo, hifenizado. */
  function slugify(texto) {
    return (texto || "")
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .replace(/-{2,}/g, "-");
  }

  /* Divide "resumo. Topo: ... Coração: ... Fundo: ..." em resumo + notas.
     A descrição é escrita em linha única e a separação é automática; produtos
     sem os rótulos (kits, acessórios) ficam só com o resumo. */
  function separarNotas(descricao) {
    const texto = descricao || "";
    const marcas = [];
    for (const [chave, rotulo] of ROTULOS_NOTAS) {
      const i = texto.indexOf(rotulo);
      if (i !== -1) marcas.push({ i, chave, tam: rotulo.length });
    }
    if (!marcas.length) return { resumo: texto.trim(), notas: null };

    marcas.sort((a, b) => a.i - b.i);
    const resumo = texto.slice(0, marcas[0].i).trim();
    const notas = {};
    marcas.forEach((m, n) => {
      const fim = n + 1 < marcas.length ? marcas[n + 1].i : texto.length;
      notas[m.chave] = texto
        .slice(m.i + m.tam, fim)
        .trim()
        .replace(/\.+$/, "")
        .trim();
    });
    return { resumo, notas };
  }

  function ordenar(objeto, ordem) {
    const saida = {};
    for (const chave of ordem) {
      const valor = objeto[chave];
      if (valor === undefined) continue;
      if (OPCIONAIS.has(chave) && (valor === null || valor === "")) continue;
      saida[chave] = valor;
    }
    /* qualquer chave nova que apareça no futuro não se perde */
    for (const chave of Object.keys(objeto)) {
      if (!(chave in saida) && !ordem.includes(chave)) saida[chave] = objeto[chave];
    }
    return saida;
  }

  function clonar(valor) {
    return JSON.parse(JSON.stringify(valor));
  }

  /* --------------------------------------------------------- normalização */

  /* Recalcula tudo que é derivado e devolve o catálogo pronto para publicar. */
  function normalizar(catalogo) {
    const dados = clonar(catalogo);

    dados.produtos = (dados.produtos || []).map((bruto) => {
      const produto = Object.assign({}, bruto);
      const { resumo, notas } = separarNotas(produto.descricao);
      produto.resumo = resumo;
      if (notas) produto.notas = notas;
      else delete produto.notas;
      if (produto.preco === "" || produto.preco === undefined) produto.preco = null;
      if (produto.preco !== null) produto.preco = Number(produto.preco);
      produto.destaque = !!produto.destaque;
      return ordenar(produto, ORDEM_PRODUTO);
    });

    dados.categorias = (dados.categorias || []).map((bruta) => {
      const categoria = Object.assign({}, bruta);
      categoria.total = dados.produtos.filter((p) => p.categoria === categoria.slug).length;
      if (categoria.capaZoom) categoria.capaZoom = Number(categoria.capaZoom);
      return ordenar(categoria, ORDEM_CATEGORIA);
    });

    dados.loja = ordenar(Object.assign({}, dados.loja), ORDEM_LOJA);

    const saida = { loja: dados.loja };
    if (dados.home) saida.home = dados.home;
    saida.categorias = dados.categorias;
    saida.produtos = dados.produtos;
    return saida;
  }

  /* Texto final de data/catalogo.js. */
  function serializar(catalogo) {
    return CABECALHO + "window.CATALOGO = " + JSON.stringify(normalizar(catalogo), null, 2) + ";\n";
  }

  /* ------------------------------------------------------------- validação */

  function validarProduto(produto, catalogo, idOriginal) {
    const erros = [];
    if (!produto.nome || !produto.nome.trim()) erros.push("O nome é obrigatório.");
    if (!produto.id || !produto.id.trim()) erros.push("O identificador é obrigatório.");
    else if (produto.id !== slugify(produto.id)) {
      erros.push("O identificador só aceita letras sem acento, números e hífen.");
    }
    if (!produto.categoria) erros.push("Escolha uma categoria.");
    else if (!(catalogo.categorias || []).some((c) => c.slug === produto.categoria)) {
      erros.push("A categoria escolhida não existe.");
    }
    if (!GENEROS.includes(produto.genero)) erros.push("Escolha o gênero.");
    if (!produto.tipo || !produto.tipo.trim()) erros.push("O tipo é obrigatório.");
    if (produto.preco !== null && produto.preco !== "" && produto.preco !== undefined) {
      const valor = Number(produto.preco);
      if (!isFinite(valor) || valor < 0) erros.push("O preço precisa ser um número, ou ficar em branco para 'sob consulta'.");
    }
    if (!produto.imagem) erros.push("Escolha ou envie uma foto.");

    const repetido = (catalogo.produtos || []).some(
      (p) => p.id === produto.id && p.id !== idOriginal
    );
    if (repetido) erros.push("Já existe outro produto com este identificador.");

    return erros;
  }

  function validarCategoria(categoria, catalogo, slugOriginal) {
    const erros = [];
    if (!categoria.nome || !categoria.nome.trim()) erros.push("O nome é obrigatório.");
    if (!categoria.slug || !categoria.slug.trim()) erros.push("O identificador é obrigatório.");
    else if (categoria.slug !== slugify(categoria.slug)) {
      erros.push("O identificador só aceita letras sem acento, números e hífen.");
    }
    if (!categoria.capa) erros.push("Escolha uma foto de capa.");
    const repetido = (catalogo.categorias || []).some(
      (c) => c.slug === categoria.slug && c.slug !== slugOriginal
    );
    if (repetido) erros.push("Já existe outra categoria com este identificador.");
    return erros;
  }

  /* Procura na lista um valor que só difira por acento, caixa ou espaço.
     Serve para barrar "lattafa" virando uma marca separada de "Lattafa" e
     "Perfumes" virando um filtro extra ao lado de "Perfume" na loja. */
  function semelhante(valor, lista) {
    const achatar = (t) =>
      (t || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
    const alvo = achatar(valor);
    if (!alvo) return null;
    return (lista || []).find((item) => achatar(item) === alvo && item !== valor) || null;
  }

  /* Mesma regra de whatsappConfigurado() em index.html. */
  function whatsappValido(numero) {
    const n = (numero || "").replace(/\D/g, "");
    return n.length >= 12 && !/^5500000/.test(n);
  }

  /* ------------------------------------------------------------------ diff */

  /* Resumo do que mudou entre o catálogo publicado e o rascunho atual. */
  function diferencas(original, atual) {
    const mudancas = [];
    const porId = (lista) => new Map((lista || []).map((i) => [i.id, i]));
    const porSlug = (lista) => new Map((lista || []).map((i) => [i.slug, i]));
    const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

    const antes = porId(original.produtos);
    const depois = porId(atual.produtos);
    for (const [id, produto] of depois) {
      if (!antes.has(id)) mudancas.push({ tipo: "produto", acao: "novo", rotulo: produto.nome });
      else if (!igual(antes.get(id), produto)) {
        mudancas.push({ tipo: "produto", acao: "alterado", rotulo: produto.nome });
      }
    }
    for (const [id, produto] of antes) {
      if (!depois.has(id)) mudancas.push({ tipo: "produto", acao: "removido", rotulo: produto.nome });
    }

    const catAntes = porSlug(original.categorias);
    const catDepois = porSlug(atual.categorias);
    for (const [slug, categoria] of catDepois) {
      if (!catAntes.has(slug)) mudancas.push({ tipo: "categoria", acao: "nova", rotulo: categoria.nome });
      else if (!igual(catAntes.get(slug), categoria)) {
        mudancas.push({ tipo: "categoria", acao: "alterada", rotulo: categoria.nome });
      }
    }
    for (const [slug, categoria] of catAntes) {
      if (!catDepois.has(slug)) mudancas.push({ tipo: "categoria", acao: "removida", rotulo: categoria.nome });
    }

    if (!igual(original.loja, atual.loja)) {
      mudancas.push({ tipo: "loja", acao: "alterada", rotulo: "Dados da loja" });
    }
    if (!igual(original.home || null, atual.home || null)) {
      mudancas.push({ tipo: "home", acao: "alterada", rotulo: "Carrossel da home" });
    }

    /* a ordem dos produtos importa: é a ordem exibida no site */
    const ordemAntes = (original.produtos || []).map((p) => p.id).join("|");
    const ordemDepois = (atual.produtos || []).map((p) => p.id).join("|");
    if (ordemAntes !== ordemDepois && antes.size === depois.size) {
      const soOrdem = [...depois.keys()].every((id) => antes.has(id));
      if (soOrdem && !mudancas.some((m) => m.tipo === "produto")) {
        mudancas.push({ tipo: "produto", acao: "reordenado", rotulo: "Ordem dos produtos" });
      }
    }

    return mudancas;
  }

  /* Mensagem de commit sugerida a partir do diff. */
  function mensagemSugerida(mudancas, fotos) {
    if (!mudancas.length && !fotos) return "Atualiza o catálogo";

    const contar = (tipo) => mudancas.filter((m) => m.tipo === tipo).length;
    const pedacos = [];
    const plural = (n, um, muitos) => n + " " + (n === 1 ? um : muitos);

    if (mudancas.length === 1 && !fotos) {
      const m = mudancas[0];
      if (m.tipo === "produto") return "Produto " + m.rotulo + ": " + m.acao;
      if (m.tipo === "categoria") return "Categoria " + m.rotulo + ": " + m.acao;
      if (m.tipo === "loja") return "Atualiza os dados da loja";
      if (m.tipo === "home") return "Atualiza o carrossel da home";
    }

    if (contar("produto")) pedacos.push(plural(contar("produto"), "produto", "produtos"));
    if (contar("categoria")) pedacos.push(plural(contar("categoria"), "categoria", "categorias"));
    if (contar("loja")) pedacos.push("dados da loja");
    if (contar("home")) pedacos.push("carrossel da home");
    if (fotos) pedacos.push(plural(fotos, "foto", "fotos"));

    return "Atualiza " + pedacos.join(", ");
  }

  return {
    CABECALHO,
    GENEROS,
    BANNER_PADRAO,
    slugify,
    separarNotas,
    normalizar,
    serializar,
    validarProduto,
    validarCategoria,
    whatsappValido,
    semelhante,
    diferencas,
    mensagemSugerida,
    clonar,
  };
})();
