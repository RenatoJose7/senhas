"use strict";
// Every word is sampled independently with Web Crypto; never Math.random.
const palavras = `abacate abelha abrigo aceno acervo adubo afeto agulha alface alga algodao alimento almofada aluno ameixa amigo ancora anel anil antena apito arco areia aroma arvore asa atalho ave avelã azulejo bacia balao bambu banana barco barro batata bau beco beleza berco bico bilhete biscoito bola bolha bolso boneco bosque brasa brisa broto bule cabana cabelo cacto caderno cafe caixa caju caminho campo caneca canela canto capa caracol caramelo carta casa casaco castanha castelo cavalo cebola cedro cesta ceu chale chaleira chave chuva cidade cinema cipreste circo clara clima coco coelho colina cometa concha conto copo coral corda coruja costa cravo cristal cubo dado danca dedal desenho dia disco doce dourado dragao duna eco elefante enfeite escada escola escudo esfera espelho espuma estrela estrada farol favo feijao feira feriado ferro festa fita flor floco floresta folha fonte forno forte foto frase fruta fubá fumaca furacao gaiola galho galo gaveta gelo gema girassol globo goiaba gota grao grilo gruta guarda guitarra horta ilha imã inverno ipê janela jardim jarra jaspe jato joaninha jogo jornal junho lago lagosta laranja largo lata lebre leme lenha lente leque letra livro lobo lona lua luva luz macaco madeira mala manga mapa mar margarida martelo massa mata mel melancia mesa milho mola monte morango mosaico muro musgo nadador navio neblina neve ninho noite noz nucleo nuvem oceano oleo oliva onda onca orvalho osso ostra outono ovo padre palha palma panela pano papel parque passo pato pedra peixe pena pera perola petala piano pico pilha pinha pipa piso planeta planta pluma poema polo pomar ponte ponto porta pote praia prato prego prisma prosa quadro queijo quintal ramo raposa rede regador remo renda riacho rio riso roda rolo rosa rosto rota rubi rua sabao saco saia sala salada salto semente serra sino sobra sol sombra sonho sopa sopro sorte suco tambor tampa tapete tarde tatu tecla tela telha tempo tenda terra tesoura tigela tigre tinta tomate torre trevo trigo trilha tronco tulipa tunel uva vale vapor vaso vela vento verde vidro vila viola visita voo vulcao xale xicara zebra zinco`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/);
const dicionario = [...new Set(palavras)];
function sortear(limite) {
    const valor = new Uint32Array(1);
    const teto = Math.floor(2 ** 32 / limite) * limite;
    do { crypto.getRandomValues(valor); } while (valor[0] >= teto);
    return valor[0] % limite;
}
const frase = document.getElementById("frase-resultado");
const quantidade = document.getElementById("palavras");
const fraseFeedback = document.getElementById("frase-feedback");
const copiarFrase = document.getElementById("copiar-frase");
function gerarFrase() {
    try {
        const total = Math.min(14, Math.max(10, Number(quantidade.value) || 12));
        frase.textContent = Array.from({ length: total }, () => dicionario[sortear(dicionario.length)]).join("-");
        fraseFeedback.textContent = "";
        copiarFrase.disabled = false;
        const bits = Math.floor(total * Math.log2(dicionario.length));
        document.getElementById("phrase-entropy").textContent = `${total} palavras · ${frase.textContent.length} caracteres · cerca de ${bits} bits de entropia com sorteio uniforme em uma lista de ${dicionario.length} palavras. Comprimento não é o mesmo que imprevisibilidade.`;
    } catch {
        frase.textContent = "";
        copiarFrase.disabled = true;
        fraseFeedback.textContent = "Não foi possível gerar com segurança. Use um navegador atualizado.";
    }
}
document.getElementById("gerar-frase").addEventListener("click", gerarFrase);
quantidade.addEventListener("change", gerarFrase);
copiarFrase.addEventListener("click", async () => {
    if (!frase.textContent) return;
    try {
        await navigator.clipboard.writeText(frase.textContent);
        fraseFeedback.textContent = "Frase-senha copiada para a área de transferência.";
    } catch {
        fraseFeedback.textContent = "Não foi possível copiar automaticamente. Selecione a frase e copie manualmente.";
        const range = document.createRange();
        range.selectNodeContents(frase);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
});
const senhaInput = document.getElementById("senha-analise");
const tituloAnalise = document.getElementById("analise-titulo");
const dicasAnalise = document.getElementById("analise-dicas");
const mostrarSenha = document.getElementById("mostrar-senha");
const tempoEstimado = document.getElementById("tempo-estimado");
const tempoContexto = document.getElementById("tempo-contexto");
const cenarioAtaque = document.getElementById("cenario-ataque");
const verificarVazamento = document.getElementById("verificar-vazamento");
const vazamentoResultado = document.getElementById("vazamento-resultado");
const vazamentoTitulo = document.getElementById("vazamento-titulo");
const vazamentoDetalhe = document.getElementById("vazamento-detalhe");
const analysisActions = document.getElementById("analysis-actions");
const breachChecklist = document.getElementById("breach-checklist");
const recoverySteps = document.querySelectorAll("[data-recovery-step]");
function atualizarChecklist() {
    const feitas = Array.from(recoverySteps).filter(item => item.checked).length;
    document.getElementById("checklist-progress").textContent = `${feitas} de ${recoverySteps.length} etapas marcadas.`;
}
function reiniciarChecklist() {
    breachChecklist.hidden = true;
    recoverySteps.forEach(item => { item.checked = false; });
    atualizarChecklist();
}
recoverySteps.forEach(item => item.addEventListener("change", atualizarChecklist));
let analiseTimer;
let consultaVersao = 0;
let consultaController;
let ocorrenciasVazamento = null;
const cenarios = {
    offline_fast_hashing_1e10_per_second: "Ataque offline hipotético: 10 bilhões de tentativas por segundo, com hashes rápidos.",
    offline_slow_hashing_1e4_per_second: "Ataque offline hipotético: 10 mil tentativas por segundo, com hashes mais lentos.",
    online_throttling_100_per_hour: "Ataque online hipotético: serviço que permite 100 tentativas por hora.",
};
function formatarTempo(segundos) {
    if (!Number.isFinite(segundos) || segundos < 0) return "Indisponível";
    if (segundos < 1) return "Menos de 1 segundo";
    const ano = 365.25 * 86400;
    if (segundos >= 1000 * ano) return "Mais de mil anos";
    const unidades = [[ano, "ano", "anos"], [86400, "dia", "dias"], [3600, "hora", "horas"], [60, "minuto", "minutos"], [1, "segundo", "segundos"]];
    const [escala, singular, plural] = unidades.find(([escala]) => segundos >= escala);
    const quantidade = Math.floor(segundos / escala);
    return `Cerca de ${quantidade} ${quantidade === 1 ? singular : plural}`;
}
function atualizarTempo() {
    if (!senhaInput.value) {
        tempoEstimado.textContent = "—";
        tempoContexto.textContent = "Digite uma senha para ver a estimativa.";
        return;
    }
    if (ocorrenciasVazamento > 0) {
        tempoEstimado.textContent = "Já exposta";
        tempoContexto.textContent = "Uma senha já conhecida pode ser testada diretamente. Não conte com o tempo estimado: substitua esta combinação onde a utiliza.";
        return;
    }
    try {
        if (typeof zxcvbn !== "function") throw new Error("Estimator unavailable");
        // Extra Portuguese terms complement the bundled dictionaries. Never cache the result,
        // which contains the entered password. Do not infer guesses from length alone.
        const estimativa = zxcvbn(senhaInput.value, ["senha", "segredo", "bemvindo", "chave", "brasil", "futebol", "amor", "deus", "familia"]);
        const cenario = Object.hasOwn(cenarios, cenarioAtaque.value) ? cenarioAtaque.value : "offline_fast_hashing_1e10_per_second";
        tempoEstimado.textContent = formatarTempo(estimativa.crack_times_seconds[cenario]);
        tempoContexto.textContent = cenarios[cenario];
    } catch {
        tempoEstimado.textContent = "Indisponível";
        tempoContexto.textContent = "Não foi possível calcular. Recarregue a página para tentar novamente.";
    }
}
function definirVazamento(estado, titulo, detalhe) {
    vazamentoResultado.setAttribute("data-state", estado);
    vazamentoResultado.setAttribute("aria-busy", String(estado === "loading"));
    vazamentoTitulo.textContent = titulo;
    vazamentoDetalhe.textContent = detalhe;
}
function invalidarConsulta() {
    reiniciarChecklist();
    consultaVersao++;
    if (consultaController) consultaController.abort();
    consultaController = undefined;
    ocorrenciasVazamento = null;
    verificarVazamento.disabled = !senhaInput.value;
    definirVazamento("idle", "Não consultada", "Verifique se a combinação aparece na base Pwned Passwords.");
}
function contarOcorrencias(resposta, sufixo) {
    const linhas = resposta.trim().split(/\r?\n/);
    let ocorrencias = 0;
    for (const linha of linhas) {
        const match = /^([A-F0-9]{35}):(\d+)$/i.exec(linha.trim());
        if (!match) throw new Error("Invalid range response");
        const count = Number(match[2]);
        if (!Number.isSafeInteger(count)) throw new Error("Invalid count");
        if (match[1].toUpperCase() === sufixo) ocorrencias = Math.max(ocorrencias, count);
    }
    // Padding records with count zero never constitute a breach match.
    return ocorrencias;
}
async function consultarVazamentos() {
    if (!senhaInput.value || verificarVazamento.disabled) return;
    invalidarConsulta();
    const versao = consultaVersao;
    const controller = new AbortController();
    consultaController = controller;
    verificarVazamento.disabled = true;
    definirVazamento("loading", "Consultando…", "Comparando com a base de vazamentos conhecidos.");
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
        // Read the value once, hash its exact UTF-8 representation (no trimming or normalization).
        const bytes = new TextEncoder().encode(senhaInput.value);
        let digest;
        try { digest = await crypto.subtle.digest("SHA-1", bytes); }
        finally { bytes.fill(0); }
        if (versao !== consultaVersao) return;
        if (controller.signal.aborted) throw new Error("Request timed out");
        const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
        const response = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
            method: "GET", headers: { "Add-Padding": "true" }, credentials: "omit",
            referrerPolicy: "no-referrer", cache: "no-store", mode: "cors", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Range request failed");
        const body = await response.text();
        if (versao !== consultaVersao) return;
        if (controller.signal.aborted) throw new Error("Request timed out");
        ocorrenciasVazamento = contarOcorrencias(body, hash.slice(5));
        if (ocorrenciasVazamento > 0) {
            breachChecklist.hidden = false;
            definirVazamento("found", "Senha encontrada", `Esta combinação aparece ${ocorrenciasVazamento.toLocaleString("pt-BR")} vez(es) na base. Troque-a em todas as contas onde a utiliza. Isso não identifica qual conta foi afetada.`);
        } else {
            definirVazamento("not-found", "Não encontrada", "Esta combinação não foi encontrada na base consultada. Isso não garante que seja segura ou que nunca tenha vazado.");
        }
        atualizarTempo();
    } catch {
        if (versao !== consultaVersao) return;
        definirVazamento("error", "Consulta indisponível", "Não foi possível concluir a consulta. Verifique sua conexão e tente novamente. Nenhuma conclusão sobre vazamentos foi obtida.");
    } finally {
        clearTimeout(timeout);
        if (versao === consultaVersao) {
            consultaController = undefined;
            verificarVazamento.disabled = !senhaInput.value;
            vazamentoResultado.setAttribute("aria-busy", "false");
        }
    }
}
cenarioAtaque.addEventListener("change", atualizarTempo);
verificarVazamento.addEventListener("click", consultarVazamentos);
function analisar(senha) {
    const tamanho = Array.from(senha).length;
    const normalizada = senha.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const simplificada = normalizada.replace(/[@4]/g, "a").replace(/[03]/g, c => c === "0" ? "o" : "e").replace(/[1!]/g, "i").replace(/[$5]/g, "s").replace(/7/g, "t");
    const comum = /senha|password|qwerty|admin|letmein|iloveyou|bemvindo|chocolate|segredo/.test(simplificada);
    const repeticao = /(.{1,4})\1{2,}/u.test(normalizada);
    const sequencia = /0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|abcd|bcde|cdef|qwer|asdf|zxcv/.test(normalizada);
    let padroes = [];
    try {
        if (typeof zxcvbn === "function") {
            const expandir = item => [item, ...(item.base_matches || []).flatMap(expandir)];
            padroes = zxcvbn(senha, ["senha", "segredo", "bemvindo", "brasil", "futebol", "familia"]).sequence.flatMap(expandir);
        }
    } catch { /* The explicit pattern checks remain available if the estimator fails. */ }
    const palavra = comum || padroes.some(item => item.pattern === "dictionary" && item.token.length >= 4 && item.rank <= 10000);
    const repetida = repeticao || padroes.some(item => item.pattern === "repeat");
    const sequencial = sequencia || padroes.some(item => ["sequence", "spatial"].includes(item.pattern) && item.token.length >= 4);
    const data = padroes.some(item => item.pattern === "date");
    const dicas = [];
    if (tamanho < 16) dicas.push("Poucos caracteres: prefira 16 ou mais, gerados aleatoriamente. Acrescentar apenas um ano não resolve a previsibilidade.");
    if (palavra) dicas.push("Palavra comum: substitua nomes e palavras previsíveis por uma combinação aleatória. Trocar letras por símbolos pode continuar previsível.");
    if (repetida) dicas.push("Repetição: evite repetir caracteres ou blocos para aumentar o tamanho. Gere uma combinação nova.");
    if (sequencial) dicas.push("Sequência previsível: evite números em ordem e caminhos do teclado, como 1234 ou qwerty.");
    if (data) dicas.push("Data reconhecível: evite aniversários e datas pessoais; prefira caracteres sorteados.");
    if (/^\d+$/u.test(senha)) dicas.push("Somente números: quando o serviço permitir, amplie o conjunto com letras e outros caracteres.");
    if (!dicas.length) dicas.push(`${tamanho} caracteres. Nenhum desses padrões foi destacado; isso não confirma aleatoriedade nem ausência em vazamentos.`);
    dicas.push("Use uma senha diferente por conta e guarde-a em um gerenciador.");
    return { titulo: palavra || repetida || sequencial || data ? "Há padrões previsíveis nesta combinação." : tamanho < 16 ? "Uma combinação mais longa seria um bom começo." : "Bom comprimento. Esta análise não comprova segurança.", dicas };
}
function atualizarAnalise() {
    analysisActions.hidden = !senhaInput.value;
    atualizarTempo();
    dicasAnalise.replaceChildren();
    if (!senhaInput.value) {
        tituloAnalise.textContent = "Digite um exemplo para começar.";
        return;
    }
    const avaliacao = analisar(senhaInput.value);
    tituloAnalise.textContent = avaliacao.titulo;
    avaliacao.dicas.forEach(texto => {
        const item = document.createElement("li");
        item.textContent = texto;
        dicasAnalise.append(item);
    });
}
function limparAnalise() {
    clearTimeout(analiseTimer);
    invalidarConsulta();
    senhaInput.value = "";
    senhaInput.type = "password";
    mostrarSenha.textContent = "Mostrar";
    mostrarSenha.setAttribute("aria-pressed", "false");
    atualizarAnalise();
    verificarVazamento.disabled = true;
}
senhaInput.addEventListener("input", () => {
    analysisActions.hidden = !senhaInput.value;
    invalidarConsulta();
    clearTimeout(analiseTimer);
    tempoEstimado.textContent = senhaInput.value ? "Calculando…" : "—";
    tempoContexto.textContent = senhaInput.value ? "Estimativa local em andamento." : "Digite uma senha para ver a estimativa.";
    tituloAnalise.textContent = senhaInput.value ? "Analisando…" : "Digite um exemplo para começar.";
    dicasAnalise.replaceChildren();
    analiseTimer = setTimeout(atualizarAnalise, 200);
});
mostrarSenha.addEventListener("click", () => {
    const mostrar = senhaInput.type === "password";
    senhaInput.type = mostrar ? "text" : "password";
    mostrarSenha.textContent = mostrar ? "Ocultar" : "Mostrar";
    mostrarSenha.setAttribute("aria-pressed", String(mostrar));
});
document.getElementById("limpar-analise").addEventListener("click", limparAnalise);
window.addEventListener("pagehide", limparAnalise);
limparAnalise();
gerarFrase();
