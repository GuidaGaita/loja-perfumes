/* Testa o cofre (WebCrypto), a codificação usada nos commits e as regras de
   validação do catálogo. Rode com: node testes/verificar-modulos.js */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const RAIZ = path.join(__dirname, "..");

/* localStorage de mentira, só para o cofre ter onde gravar */
const memoria = new Map();
const localStorage = {
  getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => memoria.set(k, String(v)),
  removeItem: (k) => memoria.delete(k),
};

const contexto = {
  window: {},
  console,
  localStorage,
  crypto: globalThis.crypto,
  TextEncoder,
  TextDecoder,
  btoa: (s) => Buffer.from(s, "binary").toString("base64"),
  atob: (s) => Buffer.from(s, "base64").toString("binary"),
  fetch: () => {
    throw new Error("sem rede nos testes");
  },
};
vm.createContext(contexto);

for (const arquivo of ["data/catalogo.js", "admin/cofre.js", "admin/github.js", "admin/catalogo.js"]) {
  vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), "utf8"), contexto, { filename: arquivo });
}

const { Cofre, GitHub, Catalogo } = contexto.window;
const CATALOGO = contexto.window.CATALOGO;

let falhas = 0;
function checar(descricao, condicao, extra) {
  console.log((condicao ? "  ok   " : "  FALHA") + "  " + descricao);
  if (!condicao) {
    falhas++;
    if (extra) console.log("         " + extra);
  }
}

(async function () {
  /* ------------------------------------------------------------- cofre */
  console.log("\ncofre (token cifrado no navegador)");

  checar("começa vazio", Cofre.existe() === false);

  const TOKEN = "github_pat_11ABCDEF_exemploDeTokenComAcentuação_çãé";
  await Cofre.criar(TOKEN, "senha-boa-123");
  checar("depois de criar, o cofre existe", Cofre.existe() === true);

  const guardado = memoria.get("crparfum:admin:cofre");
  checar("o token NÃO aparece em claro no armazenamento", !guardado.includes("github_pat_11ABCDEF"));

  checar("abre com a senha certa e devolve o token igual", (await Cofre.abrir("senha-boa-123")) === TOKEN);

  let recusou = false;
  try {
    await Cofre.abrir("senha-errada");
  } catch (e) {
    recusou = e.message === "SENHA_INCORRETA";
  }
  checar("recusa a senha errada", recusou);

  await Cofre.trocarSenha("senha-boa-123", "outra-senha-456");
  checar("depois de trocar a senha, a nova abre", (await Cofre.abrir("outra-senha-456")) === TOKEN);
  let velhaFalhou = false;
  try {
    await Cofre.abrir("senha-boa-123");
  } catch (e) {
    velhaFalhou = true;
  }
  checar("a senha antiga deixa de funcionar", velhaFalhou);

  /* dois cofres com a mesma senha usam salt/iv diferentes */
  const primeiro = memoria.get("crparfum:admin:cofre");
  await Cofre.criar(TOKEN, "outra-senha-456");
  checar("cifra diferente a cada gravação (salt e iv aleatórios)", primeiro !== memoria.get("crparfum:admin:cofre"));

  Cofre.apagar();
  checar("apagar limpa o cofre", Cofre.existe() === false);

  /* ------------------------------------------------- codificação do commit */
  console.log("\ncodificação enviada ao GitHub");

  const textos = [
    "acentuação, ç, ã, é, ü",
    "aspas \"duplas\" e 'simples'",
    "travessão — e reticências…",
    "emoji 🤍 e quebra\nde linha",
    Catalogo.serializar(CATALOGO), // o arquivo inteiro, 100 KB
  ];
  textos.forEach((texto, i) => {
    const volta = GitHub.base64ParaTexto(GitHub.textoParaBase64(texto));
    checar(
      "texto " + (i + 1) + " sobrevive à ida e volta em base64" + (i === 4 ? " (catálogo inteiro)" : ""),
      volta === texto
    );
  });

  const b64 = GitHub.textoParaBase64("ação");
  checar("base64 bate com o do Node", b64 === Buffer.from("ação", "utf8").toString("base64"), "obtido: " + b64);

  /* ----------------------------------------------------------- validação */
  console.log("\nvalidação do catálogo");

  const base = Catalogo.normalizar(CATALOGO);
  const modelo = () => ({
    nome: "Teste",
    marca: "Marca",
    volume: "100 ml",
    genero: "feminino",
    tipo: "Perfume",
    preco: 199.9,
    descricao: "Um cheirinho.",
    destaque: false,
    id: "produto-de-teste",
    categoria: base.categorias[0].slug,
    imagem: "assets/produtos/x/y.jpg",
  });

  checar("produto completo passa", Catalogo.validarProduto(modelo(), base, null).length === 0);

  const semNome = Object.assign(modelo(), { nome: "" });
  checar("recusa produto sem nome", Catalogo.validarProduto(semNome, base, null).length === 1);

  const idRepetido = Object.assign(modelo(), { id: base.produtos[0].id });
  checar("recusa id repetido", Catalogo.validarProduto(idRepetido, base, null).some((e) => e.includes("identificador")));

  checar(
    "aceita o mesmo id quando é o próprio produto sendo editado",
    Catalogo.validarProduto(
      Object.assign(modelo(), { id: base.produtos[0].id }),
      base,
      base.produtos[0].id
    ).length === 0
  );

  const idFeio = Object.assign(modelo(), { id: "Perfume Árabe!" });
  checar("recusa id com acento e espaço", Catalogo.validarProduto(idFeio, base, null).length > 0);

  const semPreco = Object.assign(modelo(), { preco: null });
  checar("aceita preço vazio (sob consulta)", Catalogo.validarProduto(semPreco, base, null).length === 0);

  const precoTexto = Object.assign(modelo(), { preco: "abc" });
  checar("recusa preço que não é número", Catalogo.validarProduto(precoTexto, base, null).some((e) => e.includes("preço")));

  const catInexistente = Object.assign(modelo(), { categoria: "nao-existe" });
  checar("recusa categoria inexistente", Catalogo.validarProduto(catInexistente, base, null).some((e) => e.includes("categoria")));

  checar("whatsapp atual é válido", Catalogo.whatsappValido(base.loja.whatsapp));
  checar("recusa o placeholder 5500000000000", !Catalogo.whatsappValido("5500000000000"));
  checar("recusa número curto", !Catalogo.whatsappValido("5561"));

  /* ------------------------------------------------- marca e tipo parecidos */
  console.log("\nvalores parecidos (marca e tipo)");

  const marcas = ["Lattafa", "Maison Alhambra", "Brand Collection"];
  checar('"lattafa" é reconhecido como "Lattafa"', Catalogo.semelhante("lattafa", marcas) === "Lattafa");
  checar('"LATTAFA " também', Catalogo.semelhante("LATTAFA ", marcas) === "Lattafa");
  checar("acento não separa", Catalogo.semelhante("Maison Alhâmbra", marcas) === "Maison Alhambra");
  checar("espaço a mais não separa", Catalogo.semelhante("Brand  Collection", marcas) === "Brand Collection");
  checar("marca realmente nova passa", Catalogo.semelhante("Armaf", marcas) === null);
  checar("valor idêntico não é sugerido como parecido", Catalogo.semelhante("Lattafa", marcas) === null);
  checar("vazio não sugere nada", Catalogo.semelhante("", marcas) === null);

  const tipos = [...new Set(CATALOGO.produtos.map((p) => p.tipo))];
  checar('"perfumes" NÃO colide com "Perfume" (plural é outro tipo mesmo)',
    Catalogo.semelhante("perfumes", tipos) === null);
  checar('"perfume" colide com "Perfume"', Catalogo.semelhante("perfume", tipos) === "Perfume");

  /* -------------------------------------------------------------- notas */
  console.log("\nseparação da pirâmide olfativa");

  const comNotas = Catalogo.separarNotas(
    "Oriental especiado. Topo: lavanda e pimenta rosa. Coração: cacau e davana. Fundo: baunilha e âmbar."
  );
  checar("resumo separado", comNotas.resumo === "Oriental especiado.");
  checar("topo separado", comNotas.notas.topo === "lavanda e pimenta rosa");
  checar("coração separado", comNotas.notas.coracao === "cacau e davana");
  checar("fundo separado", comNotas.notas.fundo === "baunilha e âmbar");

  const semRotulos = Catalogo.separarNotas("Kit com body splash e hidratante.");
  checar("descrição sem rótulos vira só resumo", semRotulos.notas === null);
  checar("resumo intacto quando não há rótulos", semRotulos.resumo === "Kit com body splash e hidratante.");

  const soFundo = Catalogo.separarNotas("Amadeirado. Fundo: sândalo.");
  checar("aceita só um dos rótulos", soFundo.notas.fundo === "sândalo" && !soFundo.notas.topo);

  /* --------------------------------------------------------------- diff */
  console.log("\nresumo de alterações");

  checar("catálogo igual a ele mesmo não tem alterações", Catalogo.diferencas(base, base).length === 0);

  const mexido = Catalogo.clonar(base);
  mexido.produtos[0].preco = 999;
  const d1 = Catalogo.diferencas(base, mexido);
  checar("detecta preço alterado", d1.length === 1 && d1[0].acao === "alterado");

  const removido = Catalogo.clonar(base);
  const sumiu = removido.produtos.pop();
  const d2 = Catalogo.diferencas(base, Catalogo.normalizar(removido));
  checar(
    "detecta produto removido e a categoria dele mudando de total",
    d2.some((m) => m.acao === "removido" && m.rotulo === sumiu.nome)
  );

  const reordenado = Catalogo.clonar(base);
  [reordenado.produtos[0], reordenado.produtos[1]] = [reordenado.produtos[1], reordenado.produtos[0]];
  const d3 = Catalogo.diferencas(base, reordenado);
  checar("detecta só a reordenação", d3.length === 1 && d3[0].acao === "reordenado");

  const lojaMexida = Catalogo.clonar(base);
  lojaMexida.loja.whatsapp = "5561999999999";
  checar("detecta mudança nos dados da loja", Catalogo.diferencas(base, lojaMexida).some((m) => m.tipo === "loja"));

  checar(
    "mensagem de commit sugerida faz sentido",
    Catalogo.mensagemSugerida(d1, 0) === "Produto " + mexido.produtos[0].nome + ": alterado",
    Catalogo.mensagemSugerida(d1, 0)
  );
  checar(
    "mensagem agrega quando há várias mudanças",
    Catalogo.mensagemSugerida(d1.concat(d1), 2).includes("foto"),
    Catalogo.mensagemSugerida(d1.concat(d1), 2)
  );

  /* -------------------------------------------- leitura do arquivo publicado */
  console.log("\nleitura do catalogo.js publicado");

  const texto = Catalogo.serializar(CATALOGO);
  const inicio = texto.indexOf("{", texto.indexOf("window.CATALOGO"));
  const fim = texto.lastIndexOf("}");
  const relido = JSON.parse(texto.slice(inicio, fim + 1));
  checar(
    "extrair o JSON sem executar o arquivo funciona",
    JSON.stringify(relido) === JSON.stringify(Catalogo.normalizar(CATALOGO))
  );

  console.log(falhas === 0 ? "\nTudo certo.\n" : "\n" + falhas + " falha(s).\n");
  process.exit(falhas === 0 ? 0 : 1);
})();
