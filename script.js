const grupos = {
    maiusculas: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    minusculas: "abcdefghijklmnopqrstuvwxyz",
    numeros: "0123456789",
    simbolos: "!@#$%&*()_-+=",
};
const tamanhoInput = document.getElementById("tamanho");
const tamanhoRange = document.getElementById("tamanho-range");
const resultado = document.getElementById("resultado");
const gerar = document.getElementById("gerar");
const copiar = document.getElementById("copiar");
const mensagem = document.getElementById("mensagem");
const copyLabel = document.getElementById("copy-label");
let copyTimeout;

const presets = {
    geral: { tamanho: 16, simbolos: true, excluir: false, descricao: "16 caracteres · letras, números e símbolos." },
    "sem-simbolos": { tamanho: 20, simbolos: false, excluir: false, descricao: "20 caracteres · letras e números, sem símbolos." },
    digitar: { tamanho: 20, simbolos: false, excluir: true, descricao: "20 caracteres · letras e números, sem símbolos e sem I, l, 1, O, o e 0." },
};
function marcarPreset(nome) {
    document.querySelectorAll("[data-preset]").forEach(botao => {
        botao.setAttribute("aria-pressed", String(botao.getAttribute("data-preset") === nome));
    });
    document.getElementById("preset-description").textContent = presets[nome]?.descricao || "Configuração personalizada. Clique em gerar para aplicar suas escolhas.";
}
function aplicarPreset(nome) {
    if (!Object.hasOwn(presets, nome)) return;
    const preset = presets[nome];
    sincronizarTamanho(preset.tamanho);
    for (const id of ["maiusculas", "minusculas", "numeros"]) document.getElementById(id).checked = true;
    document.getElementById("simbolos").checked = preset.simbolos;
    document.getElementById("excluir-semelhantes").checked = preset.excluir;
    marcarPreset(nome);
    novaSenha();
}
document.querySelectorAll("[data-preset]").forEach(botao => {
    botao.addEventListener("click", () => aplicarPreset(botao.getAttribute("data-preset")));
});
document.getElementById("excluir-semelhantes").addEventListener("change", () => marcarPreset(null));

// Rejeição evita favorecer caracteres quando o intervalo não divide 2³².
function indiceAleatorio(limite) {
    const valor = new Uint32Array(1);
    const teto = Math.floor(4294967296 / limite) * limite;
    do { crypto.getRandomValues(valor); } while (valor[0] >= teto);
    return valor[0] % limite;
}
function montarBanco() {
    const banco = Object.entries(grupos)
        .filter(([id]) => document.getElementById(id).checked)
        .map(([, caracteres]) => caracteres).join("");
    return document.getElementById("excluir-semelhantes").checked ? banco.replace(/[Il1Oo0]/g, "") : banco;
}
function gerarSenha(tamanho, banco) {
    return Array.from({ length: tamanho }, () => banco[indiceAleatorio(banco.length)]).join("");
}
function sincronizarTamanho(valor) {
    const tamanho = Math.min(32, Math.max(4, Math.round(Number(valor) || 16)));
    tamanhoInput.value = tamanho;
    tamanhoRange.value = tamanho;
    tamanhoRange.style.setProperty("--progress", `${((tamanho - 4) / 28) * 100}%`);
    return tamanho;
}
function atualizarForca(tamanho, banco) {
    const bits = tamanho * Math.log2(banco.length);
    const nivel = bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
    const nomes = ["FRACA", "MODERADA", "FORTE", "MUITO FORTE"];
    document.getElementById("strength-label").textContent = `${nomes[nivel - 1]} / ESTIMATIVA`;
    document.querySelectorAll(".strength-bars i").forEach((barra, indice) => {
        barra.classList.toggle("active", indice < nivel);
    });
    document.getElementById("character-count").textContent = `${tamanho} CARACTERES`;
}
function novaSenha() {
    const banco = montarBanco();
    if (!banco) {
        mensagem.textContent = "Selecione pelo menos um tipo de caractere para gerar.";
        return;
    }
    const tamanho = sincronizarTamanho(tamanhoInput.value);
    try {
        resultado.textContent = gerarSenha(tamanho, banco);
        atualizarForca(tamanho, banco);
        mensagem.textContent = "";
        copiar.disabled = false;
        clearTimeout(copyTimeout);
        copyLabel.textContent = "COPIAR";
        copiar.setAttribute("aria-label", "Copiar senha");
    } catch {
        copiar.disabled = !resultado.textContent;
        mensagem.textContent = "Não foi possível gerar com segurança. Tente em um navegador atualizado.";
    }
}
tamanhoRange.addEventListener("input", () => { sincronizarTamanho(tamanhoRange.value); marcarPreset(null); });
// Normaliza também os valores digitados diretamente, antes de gerar.
tamanhoInput.addEventListener("change", () => { sincronizarTamanho(tamanhoInput.value); marcarPreset(null); });
Object.keys(grupos).forEach((id) => {
    document.getElementById(id).addEventListener("change", () => {
        marcarPreset(null);
        mensagem.textContent = montarBanco() ? "" : "Selecione pelo menos um tipo de caractere para gerar.";
    });
});
gerar.addEventListener("click", novaSenha);
copiar.addEventListener("click", async () => {
    if (!resultado.textContent) return;
    try {
        await navigator.clipboard.writeText(resultado.textContent);
        copyLabel.textContent = "COPIADA!";
        copiar.setAttribute("aria-label", "Senha copiada");
        mensagem.textContent = "Senha copiada para a área de transferência.";
        clearTimeout(copyTimeout);
        copyTimeout = setTimeout(() => {
            copyLabel.textContent = "COPIAR";
            copiar.setAttribute("aria-label", "Copiar senha");
            if (mensagem.textContent === "Senha copiada para a área de transferência.") mensagem.textContent = "";
        }, 2000);
    } catch {
        mensagem.textContent = "Não foi possível copiar. Selecione a senha e copie manualmente.";
        const selecao = window.getSelection();
        const intervalo = document.createRange();
        intervalo.selectNodeContents(resultado);
        selecao.removeAllRanges();
        selecao.addRange(intervalo);
    }
});
sincronizarTamanho(tamanhoInput.value);
novaSenha();
