/* Cofre local do token do GitHub.
 *
 * O token nunca é gravado em claro. Ele é cifrado com AES-GCM usando uma chave
 * derivada da senha da administradora (PBKDF2), e só o pacote cifrado fica no
 * localStorage deste navegador.
 *
 * Consequências disso, que valem ter em mente:
 *   - senha errada faz a verificação de integridade do AES-GCM falhar, então não
 *     existe "hash da senha" guardado em lugar nenhum para alguém atacar;
 *   - o cofre é por dispositivo: em outro celular/computador é preciso colar o
 *     token de novo;
 *   - quem não tem o token não escreve nada no repositório, mesmo lendo todo
 *     este arquivo. A senha protege o dispositivo, o GitHub protege o site.
 */
window.Cofre = (function () {
  const CHAVE = "crparfum:admin:cofre";
  const ITERACOES = 310000;

  /* ------------------------------------------------------------ utilitários */
  function paraBase64(bytes) {
    let binario = "";
    for (const b of new Uint8Array(bytes)) binario += String.fromCharCode(b);
    return btoa(binario);
  }

  function deBase64(texto) {
    const binario = atob(texto);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes;
  }

  async function derivarChave(senha, salt) {
    const base = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(senha),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: ITERACOES, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  /* ------------------------------------------------------------------ API */
  return {
    /* Já existe token guardado neste navegador? */
    existe() {
      try {
        const bruto = localStorage.getItem(CHAVE);
        if (!bruto) return false;
        const pacote = JSON.parse(bruto);
        return !!(pacote.salt && pacote.iv && pacote.cifra);
      } catch (e) {
        return false;
      }
    },

    /* Guarda o token cifrado com a senha escolhida. */
    async criar(token, senha) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const chave = await derivarChave(senha, salt);
      const cifra = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        chave,
        new TextEncoder().encode(token)
      );
      localStorage.setItem(
        CHAVE,
        JSON.stringify({
          v: 1,
          salt: paraBase64(salt),
          iv: paraBase64(iv),
          cifra: paraBase64(cifra),
          criadoEm: new Date().toISOString(),
        })
      );
    },

    /* Devolve o token em claro. Lança "SENHA_INCORRETA" se a senha não bater. */
    async abrir(senha) {
      const pacote = JSON.parse(localStorage.getItem(CHAVE) || "null");
      if (!pacote) throw new Error("SEM_COFRE");

      const chave = await derivarChave(senha, deBase64(pacote.salt));
      let claro;
      try {
        claro = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: deBase64(pacote.iv) },
          chave,
          deBase64(pacote.cifra)
        );
      } catch (e) {
        /* AES-GCM autentica o conteúdo: falhou aqui, a senha está errada. */
        throw new Error("SENHA_INCORRETA");
      }
      return new TextDecoder().decode(claro);
    },

    /* Esquece este dispositivo. */
    apagar() {
      localStorage.removeItem(CHAVE);
    },

    /* Troca a senha mantendo o mesmo token. */
    async trocarSenha(senhaAtual, senhaNova) {
      const token = await this.abrir(senhaAtual);
      await this.criar(token, senhaNova);
    },

    paraBase64,
    deBase64,
  };
})();
