/* Otimização de fotos no navegador.
 *
 * Faz o mesmo que otimizar-imagens.py fazia com Pillow: corrige a orientação
 * do EXIF (foto de celular deitada), achata transparência sobre branco,
 * reduz o maior lado e salva em JPEG. Assim a administradora escolhe a foto
 * direto do celular e o repositório continua recebendo arquivos leves.
 */
window.Imagem = (function () {
  const LARGURA_PRODUTO = 900;
  const LARGURA_MARCA = 1500;
  const QUALIDADE = 0.82;

  const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
  const TAMANHO_MAXIMO = 25 * 1024 * 1024; // limite de entrada, antes de comprimir

  function formatarPeso(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  async function paraBitmap(arquivo) {
    /* imageOrientation lê o EXIF; equivale ao ImageOps.exif_transpose do Pillow. */
    try {
      return await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    } catch (e) {
      /* alguns navegadores não aceitam a opção; cai para o caminho do <img> */
      return await new Promise((resolve, reject) => {
        const url = URL.createObjectURL(arquivo);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Não consegui abrir esta imagem. Tente exportar como JPEG."));
        };
        img.src = url;
      });
    }
  }

  function blobParaBase64(blob) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result).split(",")[1]);
      leitor.onerror = () => reject(new Error("Falha ao ler a imagem processada."));
      leitor.readAsDataURL(blob);
    });
  }

  /* Reduz em etapas de no máximo 50% por vez. O canvas faz uma redução
     bilinear simples; encolher de uma vez uma foto de 4000 px deixa a imagem
     serrilhada, e ir pela metade a cada passo se aproxima do LANCZOS. */
  function redesenhar(origem, largura, altura) {
    let canvas = document.createElement("canvas");
    let larguraAtual = origem.width;
    let alturaAtual = origem.height;
    canvas.width = larguraAtual;
    canvas.height = alturaAtual;

    let ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // achata transparência de PNG sobre branco
    ctx.fillRect(0, 0, larguraAtual, alturaAtual);
    ctx.drawImage(origem, 0, 0);

    while (larguraAtual > largura * 2) {
      const proximaL = Math.max(largura, Math.round(larguraAtual / 2));
      const proximaA = Math.max(altura, Math.round(alturaAtual / 2));
      const passo = document.createElement("canvas");
      passo.width = proximaL;
      passo.height = proximaA;
      const ctxPasso = passo.getContext("2d");
      ctxPasso.imageSmoothingEnabled = true;
      ctxPasso.imageSmoothingQuality = "high";
      ctxPasso.drawImage(canvas, 0, 0, proximaL, proximaA);
      canvas = passo;
      larguraAtual = proximaL;
      alturaAtual = proximaA;
    }

    if (larguraAtual === largura && alturaAtual === altura) return canvas;

    const final = document.createElement("canvas");
    final.width = largura;
    final.height = altura;
    const ctxFinal = final.getContext("2d");
    ctxFinal.imageSmoothingEnabled = true;
    ctxFinal.imageSmoothingQuality = "high";
    ctxFinal.fillStyle = "#ffffff";
    ctxFinal.fillRect(0, 0, largura, altura);
    ctxFinal.drawImage(canvas, 0, 0, largura, altura);
    return final;
  }

  /* Processa um File e devolve o que o painel precisa para publicar. */
  async function otimizar(arquivo, opcoes = {}) {
    const maximo = opcoes.maximo || LARGURA_PRODUTO;
    const qualidade = opcoes.qualidade || QUALIDADE;

    if (arquivo.size > TAMANHO_MAXIMO) {
      throw new Error(
        "Esta foto tem " + formatarPeso(arquivo.size) + ". O limite é " + formatarPeso(TAMANHO_MAXIMO) + "."
      );
    }
    if (arquivo.type && !TIPOS_ACEITOS.includes(arquivo.type)) {
      throw new Error("Formato não aceito (" + arquivo.type + "). Use JPEG, PNG ou WEBP.");
    }

    const bitmap = await paraBitmap(arquivo);
    const larguraOriginal = bitmap.width;
    const alturaOriginal = bitmap.height;
    if (!larguraOriginal || !alturaOriginal) throw new Error("Imagem vazia ou corrompida.");

    /* mesma regra do thumbnail(): só reduz, nunca amplia */
    const escala = Math.min(1, maximo / Math.max(larguraOriginal, alturaOriginal));
    const largura = Math.max(1, Math.round(larguraOriginal * escala));
    const altura = Math.max(1, Math.round(alturaOriginal * escala));

    const canvas = redesenhar(bitmap, largura, altura);
    if (bitmap.close) bitmap.close();

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Não consegui gerar o JPEG."))),
        "image/jpeg",
        qualidade
      );
    });

    return {
      base64: await blobParaBase64(blob),
      previa: canvas.toDataURL("image/jpeg", 0.7),
      largura,
      altura,
      peso: blob.size,
      pesoOriginal: arquivo.size,
      pesoLegivel: formatarPeso(blob.size),
      pesoOriginalLegivel: formatarPeso(arquivo.size),
    };
  }

  return {
    otimizar,
    formatarPeso,
    LARGURA_PRODUTO,
    LARGURA_MARCA,
    QUALIDADE,
    TIPOS_ACEITOS,
  };
})();
