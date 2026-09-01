/* Confere que o serializador do painel reproduz o catálogo atual sem perder
   nem inventar dado nenhum. Rode com: node testes/verificar-catalogo.js */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const contexto = { window: {}, console };
contexto.window.window = contexto.window;
vm.createContext(contexto);

function carregar(arquivo) {
  vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), "utf8"), contexto, {
    filename: arquivo,
  });
}

carregar("data/catalogo.js");
carregar("admin/catalogo.js");

const { window } = contexto;
const original = window.CATALOGO;
const Catalogo = window.Catalogo;

let falhas = 0;
function checar(descricao, condicao, extra) {
  console.log((condicao ? "  ok   " : "  FALHA") + "  " + descricao);
  if (!condicao) {
    falhas++;
    if (extra) console.log("         " + extra);
  }
}

/* ---------------------------------------------- 1. nada se perde no caminho */
const normalizado = Catalogo.normalizar(original);

checar(
  "mesma quantidade de produtos (" + original.produtos.length + ")",
  normalizado.produtos.length === original.produtos.length
);
checar(
  "mesma quantidade de categorias (" + original.categorias.length + ")",
  normalizado.categorias.length === original.categorias.length
);
checar(
  "ordem e ids dos produtos preservados",
  normalizado.produtos.map((p) => p.id).join("|") ===
    original.produtos.map((p) => p.id).join("|")
);

const difs = [];
original.produtos.forEach((antes, i) => {
  const depois = normalizado.produtos[i];
  const chaves = new Set([...Object.keys(antes), ...Object.keys(depois)]);
  for (const chave of chaves) {
    if (JSON.stringify(antes[chave]) !== JSON.stringify(depois[chave])) {
      difs.push(
        antes.id + "." + chave + ": " +
        JSON.stringify(antes[chave]) + " -> " + JSON.stringify(depois[chave])
      );
    }
  }
});
checar("nenhum campo de produto muda de valor", difs.length === 0, difs.slice(0, 8).join("\n         "));

const difsCat = [];
original.categorias.forEach((antes, i) => {
  const depois = normalizado.categorias[i];
  const chaves = new Set([...Object.keys(antes), ...Object.keys(depois)]);
  for (const chave of chaves) {
    if (JSON.stringify(antes[chave]) !== JSON.stringify(depois[chave])) {
      difsCat.push(antes.slug + "." + chave + ": " + JSON.stringify(antes[chave]) + " -> " + JSON.stringify(depois[chave]));
    }
  }
});
checar("nenhum campo de categoria muda de valor", difsCat.length === 0, difsCat.join("\n         "));
checar("dados da loja intactos", JSON.stringify(original.loja) === JSON.stringify(normalizado.loja));

/* ------------------------------------- 2. ida e volta pelo arquivo publicado */
const texto = Catalogo.serializar(original);
const ctx2 = { window: {} };
vm.createContext(ctx2);
vm.runInContext(texto, ctx2, { filename: "catalogo-gerado.js" });
checar(
  "arquivo gerado carrega e é igual ao normalizado",
  JSON.stringify(ctx2.window.CATALOGO) === JSON.stringify(normalizado)
);
checar("arquivo gerado começa com o aviso de não editar à mão", texto.startsWith("/*"));
checar("arquivo gerado define window.CATALOGO", texto.includes("window.CATALOGO = "));

/* ---------------------------------- 3. separação das notas bate com o Python */
const comNotas = original.produtos.filter((p) => p.notas).length;
const geradasComNotas = normalizado.produtos.filter((p) => p.notas).length;
checar(
  "mesma quantidade de produtos com pirâmide olfativa (" + comNotas + ")",
  comNotas === geradasComNotas
);

/* ---------------------------------------------------- 4. slug igual ao Python */
const casos = [
  ["ASAD BOURBON ORIGINAL", "asad-bourbon-original"],
  ["Yara Tous — 100 ml", "yara-tous-100-ml"],
  ["J'adore L'Or", "j-adore-l-or"],
  ["Ãrabe   Especial!!", "arabe-especial"],
];
casos.forEach(([entrada, esperado]) => {
  const obtido = Catalogo.slugify(entrada);
  checar('slugify("' + entrada + '") = "' + esperado + '"', obtido === esperado, "obtido: " + obtido);
});

/* ------------------------------------------------------------ 5. tamanho */
const atual = fs.readFileSync(path.join(RAIZ, "data/catalogo.js"), "utf8");
console.log(
  "\n  arquivo atual: " + atual.length.toLocaleString("pt-BR") + " bytes" +
  "  |  gerado: " + texto.length.toLocaleString("pt-BR") + " bytes"
);

console.log(falhas === 0 ? "\nTudo certo.\n" : "\n" + falhas + " falha(s).\n");
process.exit(falhas === 0 ? 0 : 1);
