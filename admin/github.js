/* Cliente da API do GitHub — é o "backend" do painel.
 *
 * Lê o catálogo direto do repositório (sempre a versão mais fresca, junto com o
 * sha necessário para escrever depois) e publica todas as alterações em UM
 * único commit usando a Git Data API. Um commit só evita builds intermediários
 * do Pages e estados quebrados no ar (ex.: catálogo apontando para uma foto que
 * ainda não subiu).
 */
window.GitHub = (function () {
  const BASE = "https://api.github.com";

  /* Texto UTF-8 -> base64, que é o formato que a API aceita para blobs. */
  function textoParaBase64(texto) {
    const bytes = new TextEncoder().encode(texto);
    let binario = "";
    const PEDACO = 0x8000; // evita estourar a pilha de argumentos em arquivos grandes
    for (let i = 0; i < bytes.length; i += PEDACO) {
      binario += String.fromCharCode.apply(null, bytes.subarray(i, i + PEDACO));
    }
    return btoa(binario);
  }

  function base64ParaTexto(b64) {
    const binario = atob(String(b64).replace(/\s/g, ""));
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /* ---------------------------------------------------------------- erros */
  class ErroGitHub extends Error {
    constructor(status, detalhe, url) {
      super(ErroGitHub.mensagem(status, detalhe));
      this.status = status;
      this.detalhe = detalhe;
      this.url = url;
    }
    static mensagem(status, detalhe) {
      if (status === 401) return "Token inválido ou expirado. Cadastre um token novo.";
      if (status === 403) return "Sem permissão para esta operação. Confira as permissões do token.";
      if (status === 404) return "Repositório ou arquivo não encontrado. Confira o repositório liberado no token.";
      if (status === 409 || status === 422) {
        return "Conflito ao gravar: " + (detalhe || "o repositório mudou.");
      }
      if (status >= 500) return "O GitHub está fora do ar no momento. Tente de novo em instantes.";
      return "Erro " + status + (detalhe ? ": " + detalhe : "");
    }
  }

  class ErroDesatualizado extends Error {
    constructor(esperado, atual) {
      super(
        "O repositório foi alterado por fora desde que você abriu o painel. " +
          "Recarregue o painel para não perder o que foi commitado lá."
      );
      this.esperado = esperado;
      this.atual = atual;
    }
  }

  /* -------------------------------------------------------------- cliente */
  class Cliente {
    constructor(token, { dono, repo, branch = "main" }) {
      this.token = token;
      this.dono = dono;
      this.repo = repo;
      this.branch = branch;
      this.expiraEm = null; // vem do header da primeira resposta autenticada
    }

    get raiz() {
      return BASE + "/repos/" + this.dono + "/" + this.repo;
    }

    async req(caminho, opcoes = {}) {
      const url = caminho.startsWith("http") ? caminho : this.raiz + caminho;
      const cabecalhos = {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + this.token,
        "X-GitHub-Api-Version": "2022-11-28",
      };
      if (opcoes.body) cabecalhos["Content-Type"] = "application/json";

      const resposta = await fetch(url, {
        method: opcoes.method || "GET",
        body: opcoes.body,
        cache: "no-store",
        headers: Object.assign(cabecalhos, opcoes.headers || {}),
      });

      const validade = resposta.headers.get("github-authentication-token-expiration");
      if (validade) this.expiraEm = validade;

      if (resposta.status === 404 && opcoes.aceitar404) return null;

      if (!resposta.ok) {
        let detalhe = "";
        try {
          detalhe = (await resposta.json()).message || "";
        } catch (e) {
          /* resposta sem corpo JSON */
        }
        throw new ErroGitHub(resposta.status, detalhe, url);
      }
      return resposta.status === 204 ? null : resposta.json();
    }

    /* ----------------------------------------------------------- leitura */

    /* Confere se o token é válido e tem escrita neste repositório. */
    async verificar() {
      const info = await this.req("");
      if (!info.permissions || !info.permissions.push) {
        throw new Error(
          "O token não tem permissão de escrita neste repositório. " +
            "Confira se marcou Contents: Read and write ao criar o token."
        );
      }
      return {
        repo: info.full_name,
        privado: info.private,
        branchPadrao: info.default_branch,
        expiraEm: this.expiraEm,
      };
    }

    /* Dias restantes do token, ou null se ele não expira / ainda não se sabe. */
    diasParaExpirar() {
      if (!this.expiraEm) return null;
      const alvo = new Date(this.expiraEm);
      if (isNaN(alvo.getTime())) return null;
      return Math.ceil((alvo.getTime() - Date.now()) / 86400000);
    }

    /* Conteúdo de um arquivo de texto do repositório. */
    async lerArquivo(caminho) {
      const dado = await this.req(
        "/contents/" + encodeURI(caminho) + "?ref=" + this.branch,
        { aceitar404: true }
      );
      if (!dado || !dado.content) return null;
      return { texto: base64ParaTexto(dado.content), sha: dado.sha };
    }

    /* Arquivos de uma pasta — usado para escolher fotos que já estão no repo. */
    async listarPasta(caminho) {
      const dado = await this.req(
        "/contents/" + encodeURI(caminho) + "?ref=" + this.branch,
        { aceitar404: true }
      );
      if (!Array.isArray(dado)) return [];
      return dado
        .filter((i) => i.type === "file")
        .map((i) => ({ nome: i.name, caminho: i.path, tamanho: i.size }));
    }

    /* Sha do commit no topo da branch — a base de qualquer publicação. */
    async shaDaBranch() {
      const ref = await this.req("/git/ref/heads/" + this.branch);
      return ref.object.sha;
    }

    /* --------------------------------------------------------- publicação */

    /* Publica vários arquivos em um commit só.
     *
     *   arquivos: [{ caminho, texto }]          -> arquivo de texto
     *             [{ caminho, base64 }]         -> binário já em base64 (fotos)
     *             [{ caminho, remover: true }]  -> apaga do repositório
     *
     * baseSha é o sha que o painel tinha ao carregar: se a branch andou desde
     * então, aborta em vez de sobrescrever o que foi commitado por fora.
     */
    async publicar({ arquivos, mensagem, baseSha, aoProgredir }) {
      const avisar = aoProgredir || function () {};

      avisar("Conferindo o repositório...");
      const shaAtual = await this.shaDaBranch();
      if (baseSha && baseSha !== shaAtual) throw new ErroDesatualizado(baseSha, shaAtual);

      const commitBase = await this.req("/git/commits/" + shaAtual);

      /* 1. um blob por arquivo novo ou alterado */
      const entradas = [];
      let n = 0;
      for (const arquivo of arquivos) {
        n++;
        if (arquivo.remover) {
          entradas.push({ path: arquivo.caminho, mode: "100644", type: "blob", sha: null });
          continue;
        }
        avisar("Enviando " + n + " de " + arquivos.length + ": " + arquivo.caminho);
        const conteudo = arquivo.base64 || textoParaBase64(arquivo.texto);
        const blob = await this.req("/git/blobs", {
          method: "POST",
          body: JSON.stringify({ content: conteudo, encoding: "base64" }),
        });
        entradas.push({ path: arquivo.caminho, mode: "100644", type: "blob", sha: blob.sha });
      }

      /* 2. árvore a partir da atual */
      avisar("Montando o commit...");
      const arvore = await this.req("/git/trees", {
        method: "POST",
        body: JSON.stringify({ base_tree: commitBase.tree.sha, tree: entradas }),
      });

      /* 3. commit */
      const commit = await this.req("/git/commits", {
        method: "POST",
        body: JSON.stringify({ message: mensagem, tree: arvore.sha, parents: [shaAtual] }),
      });

      /* 4. move a branch */
      avisar("Publicando...");
      await this.req("/git/refs/heads/" + this.branch, {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha, force: false }),
      });

      return { sha: commit.sha, url: commit.html_url || "" };
    }
  }

  return { Cliente, ErroGitHub, ErroDesatualizado, textoParaBase64, base64ParaTexto };
})();
