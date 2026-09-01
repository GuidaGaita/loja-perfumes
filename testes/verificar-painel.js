/* Teste de ponta a ponta do painel, dirigindo o Chrome de verdade com a API do
   GitHub simulada em memória: primeiro acesso, edição, foto, publicação,
   conflito e relogin. Nada sai da máquina e nenhum commit real é feito.

   Como rodar (veja testes/README.md):
     python -m http.server 8765 --bind 127.0.0.1
     npm i puppeteer-core   (numa pasta qualquer fora do repositório)
     node testes/verificar-painel.js
*/
const puppeteer = require("puppeteer-core");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://127.0.0.1:8765";

let falhas = 0;
const ok = (d, c, extra) => {
  console.log((c ? "  ok   " : "  FALHA") + "  " + d);
  if (!c) {
    falhas++;
    if (extra) console.log("         " + extra);
  }
};

/* Simulação da API do GitHub instalada dentro da página, antes de tudo rodar. */
function instalarApiFalsa(catalogoInicial) {
  /* o estado do repo vive no sessionStorage para sobreviver a um reload */
  const guardado = sessionStorage.getItem("__repo");
  const repo = guardado
    ? JSON.parse(guardado)
    : {
        arquivos: { "data/catalogo.js": catalogoInicial },
        sha: "sha-inicial-0000000000000000000000000",
        commits: [],
        blobs: {},
        arvores: {},
      };
  const gravarRepo = () => sessionStorage.setItem("__repo", JSON.stringify(repo));
  gravarRepo();
  window.__gravarRepo = gravarRepo;
  window.__repo = repo;
  window.__chamadas = [];

  const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
  const resposta = (corpo, status = 200, cabecalhos = {}) =>
    Promise.resolve(
      new Response(JSON.stringify(corpo), {
        status,
        headers: Object.assign({ "Content-Type": "application/json" }, cabecalhos),
      })
    );

  window.fetch = function (url, opcoes = {}) {
    url = String(url);
    const metodo = opcoes.method || "GET";
    const corpo = opcoes.body ? JSON.parse(opcoes.body) : null;
    window.__chamadas.push(metodo + " " + url.replace("https://api.github.com/repos/GuidaGaita/loja-perfumes", ""));

    const auth = (opcoes.headers || {}).Authorization || "";
    if (!auth.includes("token-valido")) {
      return resposta({ message: "Bad credentials" }, 401);
    }
    const cabecalhoValidade = { "github-authentication-token-expiration": "2099-01-01 00:00:00 UTC" };

    /* repositório */
    if (/\/repos\/GuidaGaita\/loja-perfumes$/.test(url)) {
      return resposta(
        { full_name: "GuidaGaita/loja-perfumes", private: false, default_branch: "main", permissions: { push: true } },
        200,
        cabecalhoValidade
      );
    }
    /* leitura de arquivo / pasta */
    const conteudo = url.match(/\/contents\/([^?]+)/);
    if (conteudo) {
      const caminho = decodeURIComponent(conteudo[1]);
      if (caminho === "assets/marca") {
        return resposta(
          ["11.jpg", "22.jpg", "28.jpg", "23.jpg"].map((n) => ({
            type: "file", name: n, path: "assets/marca/" + n, size: 1000,
          }))
        );
      }
      if (repo.arquivos[caminho] === undefined) return resposta({ message: "Not Found" }, 404);
      return resposta({ content: b64(repo.arquivos[caminho]), sha: "sha-de-" + caminho }, 200, cabecalhoValidade);
    }
    /* git data api */
    if (/\/git\/ref\/heads\/main$/.test(url)) return resposta({ object: { sha: repo.sha } });
    if (/\/git\/commits\/sha-/.test(url)) return resposta({ tree: { sha: "arvore-" + repo.sha } });
    if (/\/git\/blobs$/.test(url) && metodo === "POST") {
      const sha = "blob-" + Object.keys(repo.blobs).length;
      repo.blobs[sha] = corpo.content;
      return resposta({ sha });
    }
    if (/\/git\/trees$/.test(url) && metodo === "POST") {
      const sha = "arvore-nova-" + repo.commits.length;
      repo.arvores[sha] = corpo.tree;
      return resposta({ sha });
    }
    if (/\/git\/commits$/.test(url) && metodo === "POST") {
      const sha = "sha-commit-" + (repo.commits.length + 1);
      repo.commits.push({ sha, mensagem: corpo.message, pai: corpo.parents[0], arvore: corpo.tree });
      repo.pendente = { sha, arvore: corpo.tree };
      return resposta({ sha, html_url: "https://github.com/x/y/commit/" + sha });
    }
    if (/\/git\/refs\/heads\/main$/.test(url) && metodo === "PATCH") {
      /* aplica a árvore no "repositório" */
      for (const entrada of repo.arvores[repo.pendente.arvore] || []) {
        if (entrada.sha === null) delete repo.arquivos[entrada.path];
        else {
          const bruto = atob(repo.blobs[entrada.sha]);
          const bytes = Uint8Array.from(bruto, (ch) => ch.charCodeAt(0));
          repo.arquivos[entrada.path] = new TextDecoder().decode(bytes);
        }
      }
      repo.sha = corpo.sha;
      gravarRepo();
      return resposta({ object: { sha: corpo.sha } });
    }
    return resposta({ message: "rota nao simulada: " + url }, 500);
  };
}

const esperar = (pagina, seletor, tempo = 8000) =>
  pagina.waitForSelector(seletor, { visible: true, timeout: tempo });

/* Clica no botão cujo texto contém o trecho dado. */
async function clicarTexto(pagina, seletor, trecho) {
  const alvo = await pagina.evaluateHandle(
    (s, t) => [...document.querySelectorAll(s)].find((e) => e.textContent.trim().includes(t) && e.offsetParent !== null),
    seletor,
    trecho
  );
  const elemento = alvo.asElement();
  if (!elemento) throw new Error('não achei "' + trecho + '" em ' + seletor);
  await elemento.click();
}

(async () => {
  const navegador = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const catalogoInicial = await (await fetch(BASE + "/data/catalogo.js")).text();
  const erros = [];

  try {
    /* =========================================== 1. loja: nada quebrou */
    console.log("\nloja (index.html)");
    let pagina = await navegador.newPage();
    pagina.on("pageerror", (e) => erros.push("index: " + e.message));
    pagina.on("console", (m) => m.type() === "error" && erros.push("index console: " + m.text()));
    await pagina.goto(BASE + "/index.html", { waitUntil: "networkidle2" });
    await esperar(pagina, "header");

    const loja = await pagina.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      return {
        produtos: raiz.dados.produtos.length,
        categorias: raiz.dados.categorias.length,
        nome: raiz.dados.loja.nome,
        previa: raiz.previa,
        banner: [...document.querySelectorAll("section img[alt]")]
          .map((i) => i.getAttribute("src"))
          .filter((s) => s && s.includes("assets/marca")),
      };
    });
    ok("carrega 111 produtos e 6 categorias", loja.produtos === 111 && loja.categorias === 6);
    ok("carrossel monta a partir de home.banner", loja.banner.length >= 3, JSON.stringify(loja.banner));
    ok("não está em modo pré-visualização", loja.previa === false);

    await pagina.goto(BASE + "/index.html#/produto/asad-bourbon-original", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 500));
    const rota = await pagina.evaluate(() =>
      JSON.parse(JSON.stringify(document.querySelector("[x-data]")._x_dataStack[0].rota))
    );
    const secaoProduto = await pagina.evaluate(() =>
      !![...document.querySelectorAll("section")].find(
        (s) => s.getAttribute("x-show") === "rota.view === 'produto'" && s.offsetParent
      )
    );
    ok(
      "link direto de produto antigo continua abrindo",
      rota.view === "produto" && rota.id === "asad-bourbon-original" && secaoProduto,
      JSON.stringify(rota)
    );
    await pagina.close();

    /* ================================ 2. painel: token errado é recusado */
    console.log("\npainel: primeiro acesso");
    pagina = await navegador.newPage();
    pagina.on("pageerror", (e) => erros.push("admin: " + e.message));
    pagina.on("console", (m) => m.type() === "error" && erros.push("admin console: " + m.text()));
    await pagina.evaluateOnNewDocument(instalarApiFalsa, catalogoInicial);
    await pagina.goto(BASE + "/admin.html", { waitUntil: "networkidle2" });

    await esperar(pagina, "#token");
    ok("abre na tela de primeiro acesso", true);

    await pagina.type("#token", "token-invalido");
    await pagina.type("#senha", "senha123");
    await pagina.type("#senha2", "senha123");
    await clicarTexto(pagina, "button", "Salvar e entrar");
    await new Promise((r) => setTimeout(r, 600));
    let aviso = await pagina.evaluate(() => {
      const e = [...document.querySelectorAll("div")].find((d) => d.className.includes("fixed inset-x-0 top-4"));
      return e ? e.textContent.trim() : "";
    });
    ok("token inválido é recusado com mensagem clara", /inválido|expirado/i.test(aviso), aviso);
    ok("token inválido NÃO é guardado", await pagina.evaluate(() => localStorage.getItem("crparfum:admin:cofre") === null));

    /* ------------------------------------------- token válido entra */
    await pagina.evaluate(() => {
      document.querySelector("#token").value = "";
      document.querySelector("#token").dispatchEvent(new Event("input"));
    });
    await pagina.type("#token", "token-valido-123");
    await clicarTexto(pagina, "button", "Salvar e entrar");
    await esperar(pagina, "main");
    ok("token válido entra no painel", true);
    ok("token fica guardado cifrado", await pagina.evaluate(() => {
      const c = localStorage.getItem("crparfum:admin:cofre");
      return !!c && !c.includes("token-valido-123");
    }));

    const listagem = await pagina.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      return { produtos: raiz.dados.produtos.length, linhas: document.querySelectorAll("main section img").length };
    });
    ok("painel lista os 111 produtos", listagem.produtos === 111);
    ok("as linhas da lista renderizam", listagem.linhas > 50, "linhas: " + listagem.linhas);

    /* ================================================ 3. editar e publicar */
    console.log("\npainel: editar e publicar");

    await pagina.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      raiz.editarProduto(raiz.dados.produtos.find((p) => p.id === "asad-bourbon-original"));
    });
    await esperar(pagina, 'input[x-model="editando.precoTexto"]');
    ok("formulário de edição abre com os dados do produto", await pagina.evaluate(
      () => document.querySelector('input[x-model="editando.precoTexto"]').value === "310"
    ));

    await pagina.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      raiz.editando.precoTexto = "289,90";
      raiz.editando.descricao = "Novo texto. Topo: bergamota. Coração: jasmim. Fundo: âmbar.";
      raiz.salvarProduto();
    });
    await new Promise((r) => setTimeout(r, 300));

    const depoisDeSalvar = await pagina.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      const p = raiz.dados.produtos.find((x) => x.id === "asad-bourbon-original");
      return JSON.parse(
        JSON.stringify({
          preco: p.preco, notas: p.notas, resumo: p.resumo,
          mudancas: raiz.mudancas, tem: raiz.temAlteracoes,
        })
      );
    });
    ok("preço com vírgula vira número", depoisDeSalvar.preco === 289.9, String(depoisDeSalvar.preco));
    ok("notas são separadas ao salvar", depoisDeSalvar.notas && depoisDeSalvar.notas.topo === "bergamota");
    ok("resumo separado do restante", depoisDeSalvar.resumo === "Novo texto.");
    ok("aparece 1 alteração pendente", depoisDeSalvar.mudancas.length === 1 && depoisDeSalvar.tem === true);
    ok("rascunho é salvo no navegador", await pagina.evaluate(() => !!localStorage.getItem("crparfum:admin:rascunho")));

    /* pré-visualização */
    await pagina.evaluate(() => document.querySelector("[x-data]")._x_dataStack[0].previsualizar());
    await new Promise((r) => setTimeout(r, 900));
    const abas = await navegador.pages();
    const previa = abas[abas.length - 1];
    await previa.waitForSelector("header", { timeout: 8000 });
    const dadosPrevia = await previa.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      return { previa: raiz.previa, preco: raiz.dados.produtos.find((p) => p.id === "asad-bourbon-original").preco };
    });
    ok("pré-visualização abre a loja com o rascunho", dadosPrevia.previa === true && dadosPrevia.preco === 289.9);
    ok("tarja de pré-visualização aparece", await previa.evaluate(
      () => !![...document.querySelectorAll("div")].find((d) => d.textContent.includes("ainda não estão no ar") && d.offsetParent)
    ));
    await previa.close();

    /* publicar */
    await pagina.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      raiz.prepararPublicacao();
    });
    await new Promise((r) => setTimeout(r, 300));
    const mensagem = await pagina.evaluate(() => document.querySelector("[x-data]")._x_dataStack[0].mensagemCommit);
    ok("mensagem de commit é sugerida sozinha", /Asad Bourbon/.test(mensagem), mensagem);

    await pagina.evaluate(() => document.querySelector("[x-data]")._x_dataStack[0].publicar());
    await new Promise((r) => setTimeout(r, 1200));

    const repoDepois = await pagina.evaluate(() => ({
      commits: window.__repo.commits.length,
      mensagem: window.__repo.commits[0] && window.__repo.commits[0].mensagem,
      catalogo: window.__repo.arquivos["data/catalogo.js"],
      chamadas: window.__chamadas,
      tem: document.querySelector("[x-data]")._x_dataStack[0].temAlteracoes,
      rascunho: localStorage.getItem("crparfum:admin:rascunho"),
    }));

    ok("publicou em UM commit só", repoDepois.commits === 1, "commits: " + repoDepois.commits);
    ok("o commit usou a mensagem sugerida", repoDepois.mensagem === mensagem);
    ok("o catálogo gravado tem o preço novo", repoDepois.catalogo.includes('"preco": 289.9'));
    ok("o catálogo gravado continua com 111 produtos",
      (repoDepois.catalogo.match(/"categoria":/g) || []).length === 111);
    ok("o catálogo gravado carrega como JS válido", await pagina.evaluate(() => {
      try { new Function(window.__repo.arquivos["data/catalogo.js"])(); return true; } catch (e) { return false; }
    }));
    ok("não há mais alterações pendentes", repoDepois.tem === false);
    ok("o rascunho é limpo depois de publicar", repoDepois.rascunho === null);
    ok("usou a Git Data API (blob, tree, commit, ref)",
      ["POST /git/blobs", "POST /git/trees", "POST /git/commits", "PATCH /git/refs/heads/main"]
        .every((c) => repoDepois.chamadas.includes(c)),
      repoDepois.chamadas.join(" | "));

    /* ============================== 4. conflito com alteração externa */
    console.log("\npainel: proteções");

    await pagina.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      raiz.dados.loja.pagamento = "Só Pix";
      window.__repo.sha = "sha-de-outra-pessoa"; /* alguém commitou por fora */
      window.__gravarRepo();
      raiz.prepararPublicacao();
      raiz.publicar();
    });
    await new Promise((r) => setTimeout(r, 800));
    aviso = await pagina.evaluate(() => {
      const e = [...document.querySelectorAll("div")].find((d) => d.className.includes("fixed inset-x-0 top-4"));
      return e ? e.textContent.trim() : "";
    });
    ok("recusa publicar sobre alteração feita por fora", /alterado por fora/i.test(aviso), aviso);
    ok("nenhum commit extra foi criado",
      await pagina.evaluate(() => window.__repo.commits.length === 1));

    /* ============================================ 5. sair e voltar com senha */
    console.log("\npainel: bloqueio e relogin");
    await pagina.evaluate(() => {
      window.__repo.sha = "sha-commit-1"; /* desfaz o conflito simulado */
      window.__gravarRepo();
    });
    await pagina.reload({ waitUntil: "networkidle2" });
    await esperar(pagina, "#senhaLogin");
    ok("depois de recarregar, pede só a senha", true);

    await pagina.type("#senhaLogin", "senha-errada");
    await clicarTexto(pagina, "button", "Entrar");
    await new Promise((r) => setTimeout(r, 700));
    aviso = await pagina.evaluate(() => {
      const e = [...document.querySelectorAll("div")].find((d) => d.className.includes("fixed inset-x-0 top-4"));
      return e ? e.textContent.trim() : "";
    });
    ok("senha errada é recusada", /Senha incorreta/i.test(aviso), aviso);
    ok("continua na tela de login", await pagina.evaluate(
      () => document.querySelector("[x-data]")._x_dataStack[0].tela === "login"
    ));

    await pagina.evaluate(() => {
      const c = document.querySelector("#senhaLogin");
      c.value = ""; c.dispatchEvent(new Event("input"));
    });
    await pagina.type("#senhaLogin", "senha123");
    await clicarTexto(pagina, "button", "Entrar");
    await esperar(pagina, "main");
    ok("senha certa entra e recarrega o catálogo publicado", await pagina.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      return raiz.dados.produtos.find((p) => p.id === "asad-bourbon-original").preco === 289.9;
    }));

    /* ======================================= 6. abas renderizam sem erro */
    console.log("\npainel: demais abas");
    for (const [aba, marca] of [
      ["categorias", "Nova categoria"],
      ["home", "Carrossel"],
      ["loja", "Dados da loja"],
      ["publicar", "Publicar no site"],
    ]) {
      await pagina.evaluate((a) => (document.querySelector("[x-data]")._x_dataStack[0].aba = a), aba);
      await new Promise((r) => setTimeout(r, 350));
      const visivel = await pagina.evaluate(
        (t) => !![...document.querySelectorAll("main *")].find((e) => e.textContent.includes(t) && e.offsetParent),
        marca
      );
      ok('aba "' + aba + '" renderiza', visivel);
    }

    const capas = await pagina.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      raiz.aba = "categorias";
      raiz.editarCategoria(raiz.dados.categorias[0]);
      return { capa: raiz.editandoCat.capa, zoom: raiz.editandoCat.capaZoom };
    });
    ok("editor de categoria carrega capa e zoom", capas.capa === "assets/marca/23.jpg" && capas.zoom === 1.4,
      JSON.stringify(capas));

    /* ======= 7. catálogo sem a chave home não pode acusar alteração fantasma.
       O x-for da aba Home roda mesmo com a aba escondida; se o getter criar
       home ali, o painel abre já dizendo que há rascunho pendente. */
    console.log("\npainel: abre limpo (regressão)");
    const semHome = catalogoInicial.replace(/\n  "home": \{[\s\S]*?\n  \},/, "");
    ok("o catálogo de teste realmente ficou sem a chave home", !semHome.includes('"home"'));

    const limpa = await navegador.newPage();
    const errosLimpa = [];
    limpa.on("pageerror", (e) => errosLimpa.push(e.message));
    await limpa.evaluateOnNewDocument(instalarApiFalsa, semHome);
    await limpa.goto(BASE + "/admin.html", { waitUntil: "networkidle2" });
    /* o cofre do cenário anterior vive no mesmo localStorage: começa do zero */
    await limpa.evaluate(() => localStorage.clear());
    await limpa.reload({ waitUntil: "networkidle2" });
    await esperar(limpa, "#token");
    await limpa.type("#token", "token-valido-123");
    await limpa.type("#senha", "senha123");
    await limpa.type("#senha2", "senha123");
    await clicarTexto(limpa, "button", "Salvar e entrar");
    await esperar(limpa, "main");
    await new Promise((r) => setTimeout(r, 600));

    const recemAberto = await limpa.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      return JSON.parse(
        JSON.stringify({
          tem: raiz.temAlteracoes,
          mudancas: raiz.mudancas,
          home: raiz.dados.home || null,
          selo: !![...document.querySelectorAll("span")].find(
            (e) => e.textContent.includes("rascunho não publicado") && e.offsetParent
          ),
        })
      );
    });
    ok("abre sem alteração pendente", recemAberto.tem === false, JSON.stringify(recemAberto.mudancas));
    ok('não mostra o selo "rascunho não publicado"', recemAberto.selo === false);

    /* a aba Home traz o carrossel que a loja está mostrando, pronto para editar */
    ok(
      "a aba Home abre com o carrossel de fábrica, não vazia",
      recemAberto.home && recemAberto.home.banner.length === 3,
      JSON.stringify(recemAberto.home)
    );
    ok(
      "as fotos mostradas são as mesmas do index.html",
      recemAberto.home.banner.map((f) => f.src).join(",") ===
        "assets/marca/11.jpg,assets/marca/22.jpg,assets/marca/28.jpg",
      JSON.stringify(recemAberto.home.banner.map((f) => f.src))
    );

    await limpa.evaluate(() => (document.querySelector("[x-data]")._x_dataStack[0].aba = "home"));
    await new Promise((r) => setTimeout(r, 400));
    const telaHome = await limpa.evaluate(() => {
      const secao = [...document.querySelectorAll("main section")].find(
        (s) => s.getAttribute("x-show") === "aba === 'home'"
      );
      return {
        previa: secao.querySelectorAll(".absolute.inset-0.h-full").length,
        campos: secao.querySelectorAll('input[x-model="foto.pos"]').length,
        /* o aviso existe no DOM sempre; o que importa é estar visível */
        vazio: !![...secao.querySelectorAll("p")].find(
          (e) => e.textContent.includes("Sem fotos no carrossel") && e.offsetParent
        ),
      };
    });
    ok("a prévia do carrossel renderiza as 3 fotos", telaHome.previa === 3, JSON.stringify(telaHome));
    ok("cada foto tem seu campo de enquadramento para editar", telaHome.campos === 3);
    ok('não mostra o aviso de carrossel vazio', telaHome.vazio === false);

    /* editar o enquadramento é o caminho normal, e vira alteração pendente */
    await limpa.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      raiz.dados.home.banner[0].pos = "center 10%";
      raiz.salvarRascunho();
    });
    await new Promise((r) => setTimeout(r, 300));
    const depoisDeEditar = await limpa.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      return JSON.parse(JSON.stringify({ mudancas: raiz.mudancas, tem: raiz.temAlteracoes }));
    });
    ok(
      "editar o enquadramento marca o carrossel como alterado",
      depoisDeEditar.tem === true &&
        depoisDeEditar.mudancas.length === 1 &&
        depoisDeEditar.mudancas[0].tipo === "home",
      JSON.stringify(depoisDeEditar.mudancas)
    );

    await limpa.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      raiz.adicionarAoBanner("assets/marca/23.jpg");
    });
    await new Promise((r) => setTimeout(r, 300));
    ok(
      "dá para acrescentar uma quarta foto",
      await limpa.evaluate(() => document.querySelector("[x-data]")._x_dataStack[0].banner.length === 4)
    );
    errosLimpa.forEach((e) => erros.push("admin limpo: " + e));
    await limpa.close();
    /* ======= 8. marca e tipo: escolher da lista é o padrão, criar é consciente */
    console.log("\npainel: marca e tipo");

    const form = await navegador.newPage();
    const errosForm = [];
    form.on("pageerror", (e) => errosForm.push(e.message));
    await form.evaluateOnNewDocument(instalarApiFalsa, catalogoInicial);
    await form.goto(BASE + "/admin.html", { waitUntil: "networkidle2" });
    await form.evaluate(() => localStorage.clear());
    await form.reload({ waitUntil: "networkidle2" });
    await esperar(form, "#token");
    await form.type("#token", "token-valido-123");
    await form.type("#senha", "senha123");
    await form.type("#senha2", "senha123");
    await clicarTexto(form, "button", "Salvar e entrar");
    await esperar(form, "main");

    await form.evaluate(() => document.querySelector("[x-data]")._x_dataStack[0].novoProduto());
    await new Promise((r) => setTimeout(r, 400));

    const selects = await form.evaluate(() => {
      const rotulo = (t) =>
        [...document.querySelectorAll("label")].find((l) => l.textContent.trim() === t)
          .parentElement.querySelector("select");
      const opcoes = (s) => [...s.options].map((o) => o.value);
      return {
        marca: opcoes(rotulo("Marca")),
        tipo: opcoes(rotulo("Tipo")),
      };
    });
    ok(
      "Marca virou lista com as marcas existentes",
      selects.marca.includes("Lattafa") && selects.marca.length > 5,
      selects.marca.slice(0, 4).join(", ")
    );
    ok('a lista de Marca termina com "+ nova marca"', selects.marca[selects.marca.length - 1] === "__nova__");
    ok("Tipo virou lista com os tipos existentes", selects.tipo.includes("Perfume"));
    ok('a lista de Tipo termina com "+ novo tipo"', selects.tipo[selects.tipo.length - 1] === "__novo__");
    ok("nenhuma das duas começa preenchida", selects.marca[0] === "" && selects.tipo[0] === "");

    /* escolher da lista */
    await form.evaluate(() => document.querySelector("[x-data]")._x_dataStack[0].escolherMarca("Lattafa"));
    await new Promise((r) => setTimeout(r, 250));
    const escolhido = await form.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      return JSON.parse(JSON.stringify({ marca: raiz.editando.marca, modo: raiz.modoMarca }));
    });
    ok("escolher da lista preenche a marca", escolhido.marca === "Lattafa" && escolhido.modo === "lista");
    ok(
      "o campo de texto fica escondido no modo lista",
      await form.evaluate(
        () =>
          !document.querySelector('input[placeholder="Nome da marca nova"]') ||
          !document.querySelector('input[placeholder="Nome da marca nova"]').offsetParent
      )
    );

    /* criar uma marca nova */
    await form.evaluate(() => document.querySelector("[x-data]")._x_dataStack[0].escolherMarca("__nova__"));
    await new Promise((r) => setTimeout(r, 300));
    ok(
      "escolher \"+ nova marca\" abre o campo de texto e limpa o valor",
      await form.evaluate(() => {
        const raiz = document.querySelector("[x-data]")._x_dataStack[0];
        const campo = document.querySelector('input[placeholder="Nome da marca nova"]');
        return raiz.modoMarca === "nova" && raiz.editando.marca === "" && !!campo && !!campo.offsetParent;
      })
    );

    /* digitar algo que já existe com outra caixa */
    await form.evaluate(() => (document.querySelector("[x-data]")._x_dataStack[0].editando.marca = "lattafa"));
    await new Promise((r) => setTimeout(r, 300));
    const parecida = await form.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      return {
        sugestao: raiz.marcaParecida,
        avisoVisivel: !![...document.querySelectorAll("p")].find(
          (e) => e.textContent.includes("Já existe") && e.offsetParent
        ),
      };
    });
    ok('digitar "lattafa" avisa que já existe "Lattafa"', parecida.sugestao === "Lattafa", JSON.stringify(parecida));
    ok("o aviso de duplicata aparece na tela", parecida.avisoVisivel === true);

    await form.evaluate(() =>
      document.querySelector("[x-data]")._x_dataStack[0].usarExistente("marca", "Lattafa")
    );
    await new Promise((r) => setTimeout(r, 250));
    ok(
      '"usar essa" volta para a lista com o valor certo',
      await form.evaluate(() => {
        const raiz = document.querySelector("[x-data]")._x_dataStack[0];
        return raiz.editando.marca === "Lattafa" && raiz.modoMarca === "lista";
      })
    );

    /* uma marca genuinamente nova entra sem reclamação e passa a existir na lista */
    await form.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      raiz.escolherMarca("__nova__");
      raiz.editando.marca = "Rasasi";
      raiz.escolherTipo("__novo__");
      raiz.editando.tipo = "Óleo perfumado";
      raiz.editando.nome = "Teste de marca nova";
      raiz.aoDigitarNome();
      raiz.editando.imagem = "assets/marca/11.jpg";
      raiz.editando.precoTexto = "120";
      raiz.salvarProduto();
    });
    await new Promise((r) => setTimeout(r, 400));
    const criado = await form.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      return JSON.parse(
        JSON.stringify({
          erros: raiz.erros,
          marcas: raiz.marcasConhecidas,
          tipos: raiz.tiposConhecidos,
          produto: raiz.dados.produtos.find((p) => p.nome === "Teste de marca nova") || null,
        })
      );
    });
    ok("produto com marca e tipo novos salva sem erro", criado.erros.length === 0, criado.erros.join(" | "));
    ok("a marca nova passa a aparecer na lista", criado.marcas.includes("Rasasi"));
    ok("o tipo novo passa a aparecer na lista", criado.tipos.includes("Óleo perfumado"));
    ok(
      "o produto guardou marca e tipo digitados",
      criado.produto && criado.produto.marca === "Rasasi" && criado.produto.tipo === "Óleo perfumado"
    );

    /* editar um produto existente abre no modo lista, com o valor selecionado */
    await form.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      raiz.editarProduto(raiz.dados.produtos.find((p) => p.id === "asad-bourbon-original"));
    });
    await new Promise((r) => setTimeout(r, 400));
    const aoEditar = await form.evaluate(() => {
      const raiz = document.querySelector("[x-data]")._x_dataStack[0];
      const rotulo = (t) =>
        [...document.querySelectorAll("label")].find((l) => l.textContent.trim() === t)
          .parentElement.querySelector("select");
      return JSON.parse(
        JSON.stringify({
          modoMarca: raiz.modoMarca,
          modoTipo: raiz.modoTipo,
          marcaSelecionada: rotulo("Marca").value,
          tipoSelecionado: rotulo("Tipo").value,
        })
      );
    });
    ok(
      "editar produto existente abre no modo lista",
      aoEditar.modoMarca === "lista" && aoEditar.modoTipo === "lista"
    );
    ok(
      "e com a marca e o tipo atuais já selecionados",
      aoEditar.marcaSelecionada === "Lattafa" && aoEditar.tipoSelecionado === "Perfume",
      JSON.stringify(aoEditar)
    );

    errosForm.forEach((e) => erros.push("admin form: " + e));
    await form.close();
    ok("nenhum erro de JavaScript em nenhuma tela", erros.length === 0, erros.slice(0, 5).join("\n         "));
  } catch (e) {
    falhas++;
    console.log("\n  ERRO NO TESTE: " + e.message + "\n" + (e.stack || ""));
  } finally {
    if (erros.length) console.log("\n  erros capturados:\n   - " + erros.slice(0, 8).join("\n   - "));
    await navegador.close();
  }

  console.log(falhas === 0 ? "\nTudo certo.\n" : "\n" + falhas + " falha(s).\n");
  process.exit(falhas === 0 ? 0 : 1);
})();
