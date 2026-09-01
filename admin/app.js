/* Componente Alpine do painel de administração.
 *
 * Amarra as quatro peças: Cofre (token cifrado), GitHub (leitura e commit),
 * Catalogo (regras e serialização) e Imagem (fotos otimizadas no navegador).
 *
 * O fluxo é sempre o mesmo: carrega o catálogo publicado do repositório, mexe
 * numa cópia de trabalho em memória (com rascunho salvo no navegador), e ao
 * publicar manda catálogo + fotos novas em um commit só.
 */
function admin() {
  return {
    /* --------------------------------------------------------- configuração */
    repo: { dono: "GuidaGaita", repo: "loja-perfumes", branch: "main" },
    CHAVE_RASCUNHO: "crparfum:admin:rascunho",
    MINUTOS_ATE_BLOQUEAR: 30,

    /* ---------------------------------------------------------------- estado */
    tela: "carregando", // carregando | primeiroAcesso | login | painel
    aba: "produtos", // produtos | categorias | home | loja | publicar

    gh: null,
    publicado: null, // catálogo como está no ar (base do diff)
    baseSha: null, // sha do commit que serviu de base
    dados: null, // cópia de trabalho

    fotosNovas: {}, // caminho -> { base64, peso, previa }
    fotosRemover: [], // caminhos a apagar no próximo commit
    fotosMarca: [], // fotos já existentes em assets/marca

    formulario: { token: "", senha: "", senha2: "" },
    formSenha: { senhaAtual: "", senhaNova: "", senhaNova2: "" },
    formToken: { tokenNovo: "", senhaAtual: "" },
    senha: "",

    /* produtos */
    busca: "",
    filtroCategoria: "todas",
    editando: null,
    editandoId: null,
    erros: [],
    /* "lista" = escolhendo entre as que já existem, "nova" = digitando uma. */
    modoMarca: "lista",
    modoTipo: "lista",

    /* categorias */
    editandoCat: null,
    editandoCatSlug: null,
    errosCat: [],

    /* publicação */
    mensagemCommit: "",
    progresso: "",
    ultimoCommit: null,

    /* interface */
    ocupado: false,
    aviso: "",
    avisoTipo: "ok",
    avisoTimer: null,
    rascunhoGrande: false,
    escuro: false,
    relogioInatividade: null,

    /* ------------------------------------------------------------------ init */
    async init() {
      this.escuro = localStorage.getItem("crparfum:escuro") === "true";
      this.aplicarTema();
      this.tela = Cofre.existe() ? "login" : "primeiroAcesso";
      this.vigiarInatividade();
    },

    aplicarTema() {
      document.documentElement.classList.toggle("dark", this.escuro);
    },
    alternarTema() {
      this.escuro = !this.escuro;
      localStorage.setItem("crparfum:escuro", String(this.escuro));
      this.aplicarTema();
    },

    notificar(texto, tipo = "ok") {
      this.aviso = texto;
      this.avisoTipo = tipo;
      clearTimeout(this.avisoTimer);
      this.avisoTimer = setTimeout(() => (this.aviso = ""), tipo === "erro" ? 8000 : 3500);
    },

    /* ------------------------------------------------------------ segurança */

    /* Bloqueia sozinho depois de um tempo parado, para o token não ficar
       destrancado num celular esquecido em cima do balcão. */
    vigiarInatividade() {
      const reiniciar = () => {
        clearTimeout(this.relogioInatividade);
        if (this.tela !== "painel") return;
        this.relogioInatividade = setTimeout(() => {
          this.bloquear();
          this.notificar("Painel bloqueado por inatividade.", "aviso");
        }, this.MINUTOS_ATE_BLOQUEAR * 60000);
      };
      ["click", "keydown", "touchstart"].forEach((evento) =>
        window.addEventListener(evento, reiniciar, { passive: true })
      );
      this.$watch("tela", reiniciar);
    },

    async primeiroAcesso() {
      const { token, senha, senha2 } = this.formulario;
      if (!token.trim()) return this.notificar("Cole o token do GitHub.", "erro");
      if (senha.length < 6) return this.notificar("A senha precisa ter ao menos 6 caracteres.", "erro");
      if (senha !== senha2) return this.notificar("As duas senhas não são iguais.", "erro");

      this.ocupado = true;
      try {
        const cliente = new GitHub.Cliente(token.trim(), this.repo);
        await cliente.verificar(); // só guarda o token se ele realmente funciona
        await Cofre.criar(token.trim(), senha);
        this.gh = cliente;
        this.formulario = { token: "", senha: "", senha2: "" };
        await this.abrirPainel();
      } catch (e) {
        this.notificar(e.message, "erro");
      } finally {
        this.ocupado = false;
      }
    },

    async entrar() {
      if (!this.senha) return;
      this.ocupado = true;
      try {
        const token = await Cofre.abrir(this.senha);
        this.gh = new GitHub.Cliente(token, this.repo);
        this.senha = "";
        await this.abrirPainel();
      } catch (e) {
        this.notificar(
          e.message === "SENHA_INCORRETA" ? "Senha incorreta." : e.message,
          "erro"
        );
      } finally {
        this.ocupado = false;
      }
    },

    bloquear() {
      this.salvarRascunho();
      this.gh = null;
      this.senha = "";
      this.tela = "login";
    },

    esquecerDispositivo() {
      if (!confirm("Apagar o token guardado neste navegador? Você precisará colá-lo de novo.")) return;
      Cofre.apagar();
      localStorage.removeItem(this.CHAVE_RASCUNHO);
      this.gh = null;
      this.dados = null;
      this.tela = "primeiroAcesso";
    },

    /* Troca a senha mantendo o mesmo token guardado. */
    async trocarSenha() {
      const { senhaAtual, senhaNova, senhaNova2 } = this.formSenha;
      if (senhaNova.length < 6) return this.notificar("A senha nova precisa ter ao menos 6 caracteres.", "erro");
      if (senhaNova !== senhaNova2) return this.notificar("As duas senhas novas não são iguais.", "erro");

      this.ocupado = true;
      try {
        await Cofre.trocarSenha(senhaAtual, senhaNova);
        this.formSenha = { senhaAtual: "", senhaNova: "", senhaNova2: "" };
        this.notificar("Senha alterada.");
      } catch (e) {
        this.notificar(e.message === "SENHA_INCORRETA" ? "A senha atual está errada." : e.message, "erro");
      } finally {
        this.ocupado = false;
      }
    },

    /* Substitui o token guardado (usar quando o antigo expirar). */
    async trocarToken() {
      const { tokenNovo, senhaAtual } = this.formToken;
      if (!tokenNovo.trim()) return this.notificar("Cole o token novo.", "erro");

      this.ocupado = true;
      try {
        await Cofre.abrir(senhaAtual); // confere a senha antes de sobrescrever
        const cliente = new GitHub.Cliente(tokenNovo.trim(), this.repo);
        await cliente.verificar();
        await Cofre.criar(tokenNovo.trim(), senhaAtual);
        this.gh = cliente;
        this.formToken = { tokenNovo: "", senhaAtual: "" };
        this.notificar("Token atualizado.");
      } catch (e) {
        this.notificar(e.message === "SENHA_INCORRETA" ? "A senha está errada." : e.message, "erro");
      } finally {
        this.ocupado = false;
      }
    },

    get diasParaExpirar() {
      return this.gh ? this.gh.diasParaExpirar() : null;
    },
    get tokenPertoDeExpirar() {
      const dias = this.diasParaExpirar;
      return dias !== null && dias <= 14;
    },

    /* ------------------------------------------------------------- catálogo */

    async abrirPainel() {
      this.ocupado = true;
      this.progresso = "Carregando o catálogo...";
      try {
        const arquivo = await this.gh.lerArquivo("data/catalogo.js");
        if (!arquivo) throw new Error("Não encontrei data/catalogo.js no repositório.");

        this.publicado = this.extrairCatalogo(arquivo.texto);

        /* Catálogo antigo, sem a chave "home": a loja está mostrando o
           carrossel de fábrica. Trazemos ele para o painel como se já
           estivesse publicado — assim a aba Home abre com as fotos que estão
           no ar, prontas para editar, e não em branco pedindo para montar um
           carrossel novo. Entra nos dois lados (publicado e rascunho) de
           propósito: é o estado atual do site, não uma alteração pendente. */
        if (!this.publicado.home || !(this.publicado.home.banner || []).length) {
          this.publicado.home = { banner: Catalogo.clonar(Catalogo.BANNER_PADRAO) };
        }

        this.baseSha = await this.gh.shaDaBranch();
        this.dados = Catalogo.clonar(this.publicado);

        this.recuperarRascunho();
        this.carregarFotosMarca();

        this.tela = "painel";
        this.aba = "produtos";
      } catch (e) {
        this.notificar(e.message, "erro");
        this.tela = Cofre.existe() ? "login" : "primeiroAcesso";
      } finally {
        this.ocupado = false;
        this.progresso = "";
      }
    },

    /* Lê o objeto de dentro de "window.CATALOGO = {...};" sem executar o
       arquivo — o conteúdo vem da rede e não deve virar código. */
    extrairCatalogo(texto) {
      const inicio = texto.indexOf("{", texto.indexOf("window.CATALOGO"));
      const fim = texto.lastIndexOf("}");
      if (inicio === -1 || fim === -1) throw new Error("data/catalogo.js está em um formato inesperado.");
      return JSON.parse(texto.slice(inicio, fim + 1));
    },

    async carregarFotosMarca() {
      try {
        const itens = await this.gh.listarPasta("assets/marca");
        this.fotosMarca = itens
          .filter((i) => /\.(jpe?g|png|webp)$/i.test(i.nome))
          .sort((a, b) => {
            const na = parseInt(a.nome, 10);
            const nb = parseInt(b.nome, 10);
            if (!isNaN(na) && !isNaN(nb)) return na - nb;
            return a.nome.localeCompare(b.nome, "pt-BR");
          });
      } catch (e) {
        this.fotosMarca = [];
      }
    },

    /* --------------------------------------------------------- rascunho */

    salvarRascunho() {
      if (!this.dados) return;
      try {
        localStorage.setItem(
          this.CHAVE_RASCUNHO,
          JSON.stringify({
            baseSha: this.baseSha,
            dados: this.dados,
            fotosNovas: this.fotosNovas,
            fotosRemover: this.fotosRemover,
            em: new Date().toISOString(),
          })
        );
        this.rascunhoGrande = false;
      } catch (e) {
        /* fotos grandes estouram a cota; o texto ainda cabe sozinho */
        try {
          localStorage.setItem(
            this.CHAVE_RASCUNHO,
            JSON.stringify({ baseSha: this.baseSha, dados: this.dados, em: new Date().toISOString() })
          );
        } catch (e2) {}
        this.rascunhoGrande = true;
      }
    },

    recuperarRascunho() {
      let rascunho;
      try {
        rascunho = JSON.parse(localStorage.getItem(this.CHAVE_RASCUNHO) || "null");
      } catch (e) {
        return;
      }
      if (!rascunho || !rascunho.dados) return;

      if (rascunho.baseSha !== this.baseSha) {
        localStorage.removeItem(this.CHAVE_RASCUNHO);
        this.notificar("O site foi atualizado por fora; o rascunho antigo foi descartado.", "aviso");
        return;
      }
      if (JSON.stringify(rascunho.dados) === JSON.stringify(this.publicado)) return;

      const quando = new Date(rascunho.em).toLocaleString("pt-BR");
      if (!confirm("Você tem alterações não publicadas de " + quando + ". Quer continuar de onde parou?")) {
        localStorage.removeItem(this.CHAVE_RASCUNHO);
        return;
      }
      this.dados = rascunho.dados;
      this.fotosNovas = rascunho.fotosNovas || {};
      this.fotosRemover = rascunho.fotosRemover || [];
      if (!rascunho.fotosNovas) {
        this.notificar("As fotos do rascunho não couberam no navegador; reenvie as que faltarem.", "aviso");
      }
    },

    descartarAlteracoes() {
      if (!confirm("Descartar todas as alterações que ainda não foram publicadas?")) return;
      this.dados = Catalogo.clonar(this.publicado);
      this.fotosNovas = {};
      this.fotosRemover = [];
      this.editando = null;
      this.editandoCat = null;
      localStorage.removeItem(this.CHAVE_RASCUNHO);
      this.notificar("Alterações descartadas.");
    },

    /* ----------------------------------------------------------- produtos */

    get categorias() {
      return this.dados ? this.dados.categorias : [];
    },

    get marcasConhecidas() {
      return [...new Set(this.dados.produtos.map((p) => p.marca).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      );
    },
    get tiposConhecidos() {
      return [...new Set(this.dados.produtos.map((p) => p.tipo).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      );
    },

    normalizarTexto(texto) {
      return (texto || "")
        .toString()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase();
    },

    get produtosFiltrados() {
      if (!this.dados) return [];
      let itens = this.dados.produtos;
      if (this.filtroCategoria !== "todas") {
        itens = itens.filter((p) => p.categoria === this.filtroCategoria);
      }
      const termo = this.normalizarTexto(this.busca).trim();
      if (termo) {
        itens = itens.filter((p) =>
          this.normalizarTexto([p.nome, p.marca, p.tipo, p.volume].join(" ")).includes(termo)
        );
      }
      return itens;
    },

    nomeCategoria(slug) {
      const c = this.categorias.find((c) => c.slug === slug);
      return c ? c.nome : slug;
    },

    /* Caminho da foto no repositório, ou a prévia local se ainda não subiu. */
    urlFoto(caminho) {
      if (!caminho) return "";
      const nova = this.fotosNovas[caminho];
      if (nova) return nova.previa;
      return caminho;
    },

    moeda(valor) {
      if (valor === null || valor === undefined || valor === "") return "Sob consulta";
      return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    },

    novoProduto() {
      const categoria =
        this.filtroCategoria !== "todas" ? this.filtroCategoria : this.categorias[0].slug;
      this.editandoId = null;
      this.erros = [];
      this.modoMarca = "lista";
      this.modoTipo = "lista";
      this.editando = {
        nome: "",
        marca: "",
        volume: "",
        genero: "feminino",
        tipo: "",
        precoTexto: "",
        descricao: "",
        destaque: false,
        id: "",
        categoria,
        imagem: "",
      };
    },

    editarProduto(produto) {
      this.editandoId = produto.id;
      this.erros = [];
      /* a lista sai dos próprios produtos, então o valor atual sempre está lá */
      this.modoMarca = "lista";
      this.modoTipo = "lista";
      this.editando = Object.assign({}, Catalogo.clonar(produto), {
        precoTexto: produto.preco === null || produto.preco === undefined ? "" : String(produto.preco),
      });
      delete this.editando.preco;
      delete this.editando.resumo;
      delete this.editando.notas;
    },

    duplicarProduto(produto) {
      this.editarProduto(produto);
      this.editandoId = null;
      this.editando.nome = produto.nome + " (cópia)";
      this.editando.id = this.idDisponivel(Catalogo.slugify(this.editando.nome));
      this.notificar("Ajuste os dados e salve para criar o produto novo.");
    },

    idDisponivel(base) {
      let id = base || "produto";
      let n = 2;
      while (this.dados.produtos.some((p) => p.id === id)) id = base + "-" + n++;
      return id;
    },

    /* Sugere o identificador enquanto se digita o nome, só em produto novo. */
    aoDigitarNome() {
      if (this.editandoId) return; // nunca mexe no id de produto já publicado
      this.editando.id = this.idDisponivel(Catalogo.slugify(this.editando.nome));
    },

    /* ------------------------------------------------- marca e tipo
       Escolher da lista é o caminho normal; criar é uma ação consciente.
       Sem isso, um "Perfumes" digitado no lugar de "Perfume" vira uma opção
       a mais no filtro que o cliente vê na loja (index.html, tiposDisponiveis)
       e divide os produtos entre as duas — erro silencioso e chato de achar. */
    escolherMarca(valor) {
      if (valor === "__nova__") {
        this.modoMarca = "nova";
        this.editando.marca = "";
      } else {
        this.modoMarca = "lista";
        this.editando.marca = valor;
      }
    },
    escolherTipo(valor) {
      if (valor === "__novo__") {
        this.modoTipo = "nova";
        this.editando.tipo = "";
      } else {
        this.modoTipo = "lista";
        this.editando.tipo = valor;
      }
    },
    voltarParaLista(campo) {
      if (campo === "marca") {
        this.modoMarca = "lista";
        this.editando.marca = "";
      } else {
        this.modoTipo = "lista";
        this.editando.tipo = "";
      }
    },

    /* Avisa quando o valor digitado só difere por acento ou caixa de um que
       já existe — "lattafa" ao lado de "Lattafa" não ajuda ninguém. */
    get marcaParecida() {
      if (this.modoMarca !== "nova" || !this.editando) return null;
      return Catalogo.semelhante(this.editando.marca, this.marcasConhecidas);
    },
    get tipoParecido() {
      if (this.modoTipo !== "nova" || !this.editando) return null;
      return Catalogo.semelhante(this.editando.tipo, this.tiposConhecidos);
    },
    usarExistente(campo, valor) {
      if (campo === "marca") this.escolherMarca(valor);
      else this.escolherTipo(valor);
    },

    get previaNotas() {
      if (!this.editando) return null;
      return Catalogo.separarNotas(this.editando.descricao);
    },

    get idMudou() {
      return !!this.editandoId && this.editando && this.editando.id !== this.editandoId;
    },

    salvarProduto() {
      const bruto = this.editando;
      const texto = String(bruto.precoTexto || "").replace(/\s/g, "").replace(",", ".");
      const produto = Object.assign({}, bruto, { preco: texto === "" ? null : Number(texto) });
      delete produto.precoTexto;

      this.erros = Catalogo.validarProduto(produto, this.dados, this.editandoId);
      if (this.erros.length) return;

      if (this.idMudou) {
        const aviso =
          "Mudar o identificador de \"" + this.editandoId + "\" para \"" + produto.id + "\" " +
          "quebra os links já compartilhados deste produto e some com ele dos carrinhos " +
          "de quem já tinha adicionado.\n\nTem certeza?";
        if (!confirm(aviso)) return;
      }

      const { resumo, notas } = Catalogo.separarNotas(produto.descricao);
      produto.resumo = resumo;
      if (notas) produto.notas = notas;

      if (this.editandoId) {
        const i = this.dados.produtos.findIndex((p) => p.id === this.editandoId);
        this.dados.produtos.splice(i, 1, produto);
      } else {
        this.dados.produtos.push(produto);
      }

      this.editando = null;
      this.editandoId = null;
      this.salvarRascunho();
      this.notificar("Produto salvo no rascunho. Publique para colocar no ar.");
    },

    cancelarEdicao() {
      this.editando = null;
      this.editandoId = null;
      this.erros = [];
    },

    excluirProduto(produto) {
      if (!confirm('Excluir "' + produto.nome + '" do catálogo?')) return;

      this.dados.produtos = this.dados.produtos.filter((p) => p.id !== produto.id);

      /* apaga a foto junto, se ela for exclusiva deste produto */
      const foto = produto.imagem || "";
      const usadaPorOutro = this.dados.produtos.some((p) => p.imagem === foto);
      const usadaComoCapa = this.dados.categorias.some((c) => c.capa === foto);
      if (foto.startsWith("assets/produtos/") && !usadaPorOutro && !usadaComoCapa) {
        if (this.fotosNovas[foto]) delete this.fotosNovas[foto];
        else if (!this.fotosRemover.includes(foto)) this.fotosRemover.push(foto);
      }

      this.salvarRascunho();
      this.notificar("Produto removido do rascunho.");
    },

    /* Troca de posição com o vizinho da lista que está sendo exibida. */
    moverProduto(produto, direcao) {
      const visiveis = this.produtosFiltrados;
      const posicao = visiveis.findIndex((p) => p.id === produto.id);
      const vizinho = visiveis[posicao + direcao];
      if (!vizinho) return;

      const lista = this.dados.produtos;
      const a = lista.findIndex((p) => p.id === produto.id);
      const b = lista.findIndex((p) => p.id === vizinho.id);
      [lista[a], lista[b]] = [lista[b], lista[a]];
      this.dados.produtos = [...lista];
      this.salvarRascunho();
    },

    /* -------------------------------------------------------------- fotos */

    async enviarFotoProduto(evento) {
      const arquivo = evento.target.files[0];
      if (!arquivo) return;
      evento.target.value = "";

      if (!this.editando.id) {
        return this.notificar("Preencha o nome do produto antes de enviar a foto.", "erro");
      }

      this.ocupado = true;
      this.progresso = "Otimizando a foto...";
      try {
        const foto = await Imagem.otimizar(arquivo, { maximo: Imagem.LARGURA_PRODUTO });
        const caminho =
          "assets/produtos/" + this.editando.categoria + "/" + this.editando.id + ".jpg";

        this.fotosNovas[caminho] = {
          base64: foto.base64,
          previa: foto.previa,
          peso: foto.peso,
        };
        this.fotosRemover = this.fotosRemover.filter((c) => c !== caminho);
        this.editando.imagem = caminho;

        this.notificar(
          "Foto pronta: " + foto.largura + "×" + foto.altura + ", " +
            foto.pesoOriginalLegivel + " → " + foto.pesoLegivel
        );
      } catch (e) {
        this.notificar(e.message, "erro");
      } finally {
        this.ocupado = false;
        this.progresso = "";
      }
    },

    async enviarFotoMarca(evento, aoConcluir) {
      const arquivo = evento.target.files[0];
      if (!arquivo) return;
      evento.target.value = "";

      this.ocupado = true;
      this.progresso = "Otimizando a foto...";
      try {
        const foto = await Imagem.otimizar(arquivo, { maximo: Imagem.LARGURA_MARCA });
        const base = Catalogo.slugify(arquivo.name.replace(/\.[^.]+$/, "")) || "foto";
        let caminho = "assets/marca/" + base + ".jpg";
        let n = 2;
        while (
          this.fotosMarca.some((f) => f.caminho === caminho) ||
          this.fotosNovas[caminho]
        ) {
          caminho = "assets/marca/" + base + "-" + n++ + ".jpg";
        }

        this.fotosNovas[caminho] = { base64: foto.base64, previa: foto.previa, peso: foto.peso };
        this.fotosMarca.push({ nome: caminho.split("/").pop(), caminho, tamanho: foto.peso });
        if (aoConcluir) aoConcluir(caminho);

        this.notificar("Foto pronta: " + foto.pesoOriginalLegivel + " → " + foto.pesoLegivel);
      } catch (e) {
        this.notificar(e.message, "erro");
      } finally {
        this.ocupado = false;
        this.progresso = "";
      }
    },

    get pesoDasFotos() {
      const total = Object.values(this.fotosNovas).reduce((soma, f) => soma + f.peso, 0);
      return Imagem.formatarPeso(total);
    },

    /* --------------------------------------------------------- categorias */

    novaCategoria() {
      this.editandoCatSlug = null;
      this.errosCat = [];
      this.editandoCat = {
        slug: "",
        nome: "",
        chamada: "",
        descricao: "",
        capa: "",
        capaPos: "center",
        capaCardPos: "center",
        capaZoom: 1,
        capaOrigem: "50% 50%",
      };
    },

    editarCategoria(categoria) {
      this.editandoCatSlug = categoria.slug;
      this.errosCat = [];
      this.editandoCat = Object.assign(
        { capaPos: "center", capaCardPos: "center", capaZoom: 1, capaOrigem: "50% 50%" },
        Catalogo.clonar(categoria)
      );
      delete this.editandoCat.total;
    },

    aoDigitarNomeCategoria() {
      if (this.editandoCatSlug) return;
      this.editandoCat.slug = Catalogo.slugify(this.editandoCat.nome);
    },

    salvarCategoria() {
      const categoria = Catalogo.clonar(this.editandoCat);
      categoria.capaZoom = Number(categoria.capaZoom) || 1;

      this.errosCat = Catalogo.validarCategoria(categoria, this.dados, this.editandoCatSlug);
      if (this.errosCat.length) return;

      /* zoom 1 é o padrão: não precisa ir para o arquivo publicado */
      if (categoria.capaZoom === 1) {
        delete categoria.capaZoom;
        delete categoria.capaOrigem;
      }

      if (this.editandoCatSlug) {
        if (categoria.slug !== this.editandoCatSlug) {
          const aviso =
            "Mudar o identificador da categoria quebra os links já compartilhados dela.\n\n" +
            "Os produtos serão movidos junto. Tem certeza?";
          if (!confirm(aviso)) return;
          this.dados.produtos.forEach((p) => {
            if (p.categoria === this.editandoCatSlug) p.categoria = categoria.slug;
          });
        }
        const i = this.dados.categorias.findIndex((c) => c.slug === this.editandoCatSlug);
        this.dados.categorias.splice(i, 1, categoria);
      } else {
        this.dados.categorias.push(categoria);
      }

      this.editandoCat = null;
      this.editandoCatSlug = null;
      this.salvarRascunho();
      this.notificar("Categoria salva no rascunho.");
    },

    totalDaCategoria(slug) {
      return this.dados.produtos.filter((p) => p.categoria === slug).length;
    },

    excluirCategoria(categoria) {
      const total = this.totalDaCategoria(categoria.slug);
      if (total) {
        return this.notificar(
          "Esta categoria tem " + total + " produto(s). Mova ou exclua eles antes.",
          "erro"
        );
      }
      if (this.dados.categorias.length === 1) {
        return this.notificar("Precisa existir ao menos uma categoria.", "erro");
      }
      if (!confirm('Excluir a categoria "' + categoria.nome + '"?')) return;
      this.dados.categorias = this.dados.categorias.filter((c) => c.slug !== categoria.slug);
      this.salvarRascunho();
    },

    moverCategoria(categoria, direcao) {
      const lista = this.dados.categorias;
      const i = lista.findIndex((c) => c.slug === categoria.slug);
      const j = i + direcao;
      if (j < 0 || j >= lista.length) return;
      [lista[i], lista[j]] = [lista[j], lista[i]];
      this.dados.categorias = [...lista];
      this.salvarRascunho();
    },

    /* --------------------------------------------------------------- home */

    /* Puro de propósito: o x-for da aba Home roda mesmo com a aba escondida
       (x-show só esconde), então criar home aqui marcaria o rascunho como
       alterado assim que o painel abre, sem ninguém ter mexido em nada. */
    get banner() {
      return (this.dados.home && this.dados.home.banner) || [];
    },

    adicionarAoBanner(caminho) {
      if (this.banner.some((f) => f.src === caminho)) {
        return this.notificar("Esta foto já está no carrossel.", "aviso");
      }
      if (!this.dados.home) this.dados.home = { banner: [] };
      this.dados.home.banner.push({ src: caminho, pos: "center", alt: "" });
      this.salvarRascunho();
    },

    removerDoBanner(indice) {
      if (this.banner.length === 1) {
        return this.notificar("O carrossel precisa de ao menos uma foto.", "erro");
      }
      this.dados.home.banner.splice(indice, 1);
      this.salvarRascunho();
    },

    moverNoBanner(indice, direcao) {
      const lista = this.dados.home.banner;
      const j = indice + direcao;
      if (j < 0 || j >= lista.length) return;
      [lista[indice], lista[j]] = [lista[j], lista[indice]];
      this.dados.home.banner = [...lista];
      this.salvarRascunho();
    },

    /* --------------------------------------------------------------- loja */

    get whatsappOk() {
      return Catalogo.whatsappValido(this.dados.loja.whatsapp);
    },

    /* ---------------------------------------------------------- publicação */

    get mudancas() {
      if (!this.dados || !this.publicado) return [];
      return Catalogo.diferencas(
        Catalogo.normalizar(this.publicado),
        Catalogo.normalizar(this.dados)
      );
    },

    get temAlteracoes() {
      return this.mudancas.length > 0 || Object.keys(this.fotosNovas).length > 0 ||
        this.fotosRemover.length > 0;
    },

    get quantidadeFotos() {
      return Object.keys(this.fotosNovas).length;
    },

    prepararPublicacao() {
      this.aba = "publicar";
      this.mensagemCommit = Catalogo.mensagemSugerida(this.mudancas, this.quantidadeFotos);
    },

    /* Abre a loja com o rascunho aplicado, sem publicar nada. */
    previsualizar() {
      const previa = Catalogo.normalizar(this.dados);
      /* fotos que ainda não subiram não existem no servidor: usa a prévia local */
      previa.produtos.forEach((p) => {
        const nova = this.fotosNovas[p.imagem];
        if (nova) p.imagem = nova.previa;
      });
      previa.categorias.forEach((c) => {
        const nova = this.fotosNovas[c.capa];
        if (nova) c.capa = nova.previa;
      });
      if (previa.home) {
        previa.home.banner.forEach((f) => {
          const nova = this.fotosNovas[f.src];
          if (nova) f.src = nova.previa;
        });
      }

      try {
        sessionStorage.setItem("crparfum:preview", JSON.stringify(previa));
      } catch (e) {
        /* as prévias em base64 não couberam: mostra sem as fotos novas */
        sessionStorage.setItem("crparfum:preview", JSON.stringify(Catalogo.normalizar(this.dados)));
        this.notificar("A prévia abriu sem as fotos novas (ficaram grandes demais).", "aviso");
      }
      window.open("index.html", "_blank");
    },

    async publicar() {
      if (!this.temAlteracoes) return this.notificar("Não há nada para publicar.", "aviso");
      if (!this.mensagemCommit.trim()) return this.notificar("Escreva uma mensagem para o commit.", "erro");

      const arquivos = [
        { caminho: "data/catalogo.js", texto: Catalogo.serializar(this.dados) },
      ];
      for (const [caminho, foto] of Object.entries(this.fotosNovas)) {
        arquivos.push({ caminho, base64: foto.base64 });
      }
      for (const caminho of this.fotosRemover) {
        arquivos.push({ caminho, remover: true });
      }

      this.ocupado = true;
      this.ultimoCommit = null;
      try {
        const commit = await this.gh.publicar({
          arquivos,
          mensagem: this.mensagemCommit.trim(),
          baseSha: this.baseSha,
          aoProgredir: (texto) => (this.progresso = texto),
        });

        /* a partir daqui o rascunho virou o publicado */
        this.publicado = Catalogo.normalizar(this.dados);
        this.dados = Catalogo.clonar(this.publicado);
        this.baseSha = commit.sha;
        this.fotosNovas = {};
        this.fotosRemover = [];
        this.rascunhoGrande = false;
        localStorage.removeItem(this.CHAVE_RASCUNHO);

        this.ultimoCommit = commit;
        this.notificar("Publicado. O site atualiza em cerca de 1 minuto.");
      } catch (e) {
        this.notificar(e.message, "erro");
      } finally {
        this.ocupado = false;
        this.progresso = "";
      }
    },
  };
}
