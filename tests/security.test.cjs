const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const { webcrypto, createHash } = require('node:crypto');
const zxcvbn = require('../vendor/zxcvbn/zxcvbn.js');

// Minimal UI adapter to exercise security logic without browser dependencies.
function load(file, crypto = webcrypto) {
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, {
            value: id === 'tamanho' ? '16' : id === 'palavras' ? '12' : '',
            checked: ['maiusculas', 'minusculas', 'numeros', 'simbolos'].includes(id),
            textContent: '', disabled: true, children: [], listeners: {},
            style: { setProperty() {} }, classList: { toggle() {} },
            addEventListener(name, fn) { this.listeners[name] = fn; },
            setAttribute(name, value) { this[name] = value; },
            getAttribute(name) { return this[name]; },
            replaceChildren() { this.children = []; },
            append(item) { this.children.push(item); },
        });
        return elements.get(id);
    };
    const context = vm.createContext({
        crypto, Uint32Array, Uint8Array, TextEncoder, AbortController, setTimeout, clearTimeout, zxcvbn,
        fetch: async () => { throw new Error('Unexpected network request in test'); },
        document: { getElementById: element, querySelectorAll: selector => {
            if (selector === '[data-recovery-step]') return [0,1,2,3].map(i => element(`step-${i}`));
            if (selector === '[data-preset]') return ['geral','sem-simbolos','digitar'].map(name => {
                const button = element(`preset-${name}`); button['data-preset'] = name; return button;
            });
            return [];
        }, createElement: () => ({ textContent: '' }) },
        window: { addEventListener() {} }, navigator: { clipboard: { writeText: async () => {} } },
    });
    vm.runInContext(readFileSync(resolve(__dirname, '..', file), 'utf8'), context);
    return { context, element, run: code => vm.runInContext(code, context) };
}

test('exclusion removes all ambiguous characters, including numeric-only generation', () => {
    const app = load('script.js');
    app.element('excluir-semelhantes').checked = true;
    app.element('maiusculas').checked = false;
    app.element('minusculas').checked = false;
    app.element('simbolos').checked = false;
    app.element('tamanho').value = '32';
    for (let i = 0; i < 20; i++) {
        app.run('novaSenha()');
        assert.match(app.element('resultado').textContent, /^[2-9]{32}$/);
    }
});

test('empty selection gives feedback without generating invalid output', () => {
    const app = load('script.js');
    const previous = app.element('resultado').textContent;
    for (const id of ['maiusculas', 'minusculas', 'numeros', 'simbolos']) app.element(id).checked = false;
    app.run('novaSenha()');
    assert.match(app.element('mensagem').textContent, /Selecione pelo menos/);
    assert.equal(app.element('resultado').textContent, previous);
});

test('random sampler rejects out-of-range samples rather than applying biased modulo', () => {
    const app = load('script.js');
    let calls = 0;
    app.context.crypto = { getRandomValues(array) { array[0] = ++calls === 1 ? 4294967295 : 17; } };
    assert.equal(app.run('indiceAleatorio(10)'), 7);
    assert.equal(calls, 2);
});

test('both generators fail closed when secure randomness is unavailable', () => {
    const unavailable = { getRandomValues() { throw new Error('Unavailable'); } };
    const password = load('script.js', unavailable);
    assert.equal(password.element('resultado').textContent, '');
    assert.equal(password.element('copiar').disabled, true);
    assert.match(password.element('mensagem').textContent, /Não foi possível gerar com segurança/);
    const phrase = load('tools.js', unavailable);
    assert.equal(phrase.element('frase-resultado').textContent, '');
    assert.equal(phrase.element('copiar-frase').disabled, true);
});

test('phrases use the requested word count and expose their actual entropy', () => {
    const app = load('tools.js');
    for (const count of [10, 12, 14]) {
        app.element('palavras').value = String(count);
        app.run('gerarFrase()');
        const words = app.element('frase-resultado').textContent.split('-');
        assert.equal(words.length, count);
        for (const word of words) assert.match(word, /^[a-z]+$/);
        assert.match(app.element('phrase-entropy').textContent, new RegExp(`${count} palavras`));
        assert.ok(app.run(`Math.floor(${count} * Math.log2(dicionario.length))`) >= 80);
    }
});

test('analyzer flags long common passwords, repetition and keyboard patterns without overstating safety', () => {
    const app = load('tools.js');
    for (const sample of ['P@ssw0rd2026!!!!!!!', 'abcabcabcabcabcabc', 'qwerty1234567890!!!']) {
        app.context.sample = sample;
        assert.match(app.run('analisar(sample).titulo'), /padrões previsíveis/);
    }
    app.context.sample = 'aJ!9Lz2#kW6&nR8+';
    assert.match(app.run('analisar(sample).titulo'), /não comprova segurança/);
});

test('clearing analysis removes the value and hides it again', () => {
    const app = load('tools.js');
    app.element('senha-analise').value = 'Example-only-1234';
    app.element('senha-analise').type = 'text';
    app.run('atualizarAnalise(); limparAnalise()');
    assert.equal(app.element('senha-analise').value, '');
    assert.equal(app.element('senha-analise').type, 'password');
    assert.equal(app.element('analise-dicas').children.length, 0);
    assert.equal(app.element('mostrar-senha')['aria-pressed'], 'false');
});

const example = 'password'; // Public, deliberately weak fixture; never a real credential.
const hashFor = value => createHash('sha1').update(value, 'utf8').digest('hex').toUpperCase();
const responseFor = (value, count) => ({ ok: true, text: async () => `${hashFor(value).slice(5)}:${count}\r\n${'F'.repeat(35)}:0` });

test('time estimate recognizes common passwords and changes with the declared scenario', () => {
    const app = load('tools.js');
    app.element('senha-analise').value = example;
    app.run('atualizarTempo()');
    assert.equal(app.element('tempo-estimado').textContent, 'Menos de 1 segundo');
    app.element('senha-analise').value = 'correct horse battery staple';
    app.element('cenario-ataque').value = 'offline_fast_hashing_1e10_per_second';
    app.run('atualizarTempo()');
    const offline = app.element('tempo-estimado').textContent;
    app.element('cenario-ataque').value = 'online_throttling_100_per_hour';
    app.run('atualizarTempo()');
    assert.notEqual(app.element('tempo-estimado').textContent, offline);
    assert.match(app.element('tempo-contexto').textContent, /100 tentativas por hora/);
});

test('a missing estimator never invents a crack time', () => {
    const app = load('tools.js');
    app.context.zxcvbn = undefined;
    app.element('senha-analise').value = example;
    app.run('atualizarTempo()');
    assert.equal(app.element('tempo-estimado').textContent, 'Indisponível');
});

test('typing performs no breach query; explicit query sends only a padded five-character hash prefix', async () => {
    const app = load('tools.js');
    let calls = 0;
    app.context.fetch = async (url, options) => {
        calls++;
        assert.equal(url, `https://api.pwnedpasswords.com/range/${hashFor(example).slice(0, 5)}`);
        assert.equal(options.headers['Add-Padding'], 'true');
        assert.equal(options.credentials, 'omit');
        assert.equal(options.referrerPolicy, 'no-referrer');
        assert.equal(options.cache, 'no-store');
        assert.equal(options.body, undefined);
        return responseFor(example, 1234);
    };
    app.element('senha-analise').value = example;
    app.element('senha-analise').listeners.input();
    await new Promise(resolve => setTimeout(resolve, 250));
    assert.equal(calls, 0);
    await app.run('consultarVazamentos()');
    assert.equal(calls, 1);
    assert.equal(app.element('vazamento-titulo').textContent, 'Senha encontrada');
    assert.equal(app.element('tempo-estimado').textContent, 'Já exposta');
    assert.match(app.element('vazamento-detalhe').textContent, /1\.234/);
    assert.equal(app.element('vazamento-resultado')['aria-busy'], 'false');
});

test('zero-count padding is not exposure and absence does not imply safety', async () => {
    const app = load('tools.js');
    app.element('senha-analise').value = example;
    app.run('invalidarConsulta()');
    app.context.fetch = async () => responseFor(example, 0);
    await app.run('consultarVazamentos()');
    assert.equal(app.element('vazamento-titulo').textContent, 'Não encontrada');
    assert.match(app.element('vazamento-detalhe').textContent, /não garante/);
});

test('network failures, HTTP failures and invalid responses cannot report a clean password', async () => {
    for (const response of [null, {ok:false}, {ok:true,text:async()=>'<html>Error</html>'}, {ok:true,text:async()=>''}]) {
        const app = load('tools.js');
        app.element('senha-analise').value = example;
        app.run('invalidarConsulta()');
        app.context.fetch = async () => { if (!response) throw new Error('Network unavailable'); return response; };
        await app.run('consultarVazamentos()');
        assert.equal(app.element('vazamento-titulo').textContent, 'Consulta indisponível');
        assert.equal(app.element('verificar-vazamento').disabled, false);
    }
});

test('a response arriving after the field is cleared cannot restore the old result', async () => {
    const app = load('tools.js');
    app.element('senha-analise').value = example;
    app.run('invalidarConsulta()');
    let finish;
    let called;
    const started = new Promise(resolve => { called = resolve; });
    app.context.fetch = async () => { called(); return new Promise(resolve => { finish = resolve; }); };
    const pending = app.run('consultarVazamentos()');
    await started;
    app.run('limparAnalise()');
    finish(responseFor(example, 1234));
    await pending;
    assert.equal(app.element('vazamento-titulo').textContent, 'Não consultada');
    assert.equal(app.element('tempo-estimado').textContent, '—');
    assert.equal(app.element('verificar-vazamento').disabled, true);
});

test('hashing preserves spaces and Unicode exactly', async () => {
    const app = load('tools.js');
    const value = ' é-fixture-only ';
    app.element('senha-analise').value = value;
    app.run('invalidarConsulta()');
    app.context.fetch = async url => {
        assert.equal(url.split('/').pop(), hashFor(value).slice(0, 5));
        return responseFor(value, 1);
    };
    await app.run('consultarVazamentos()');
    assert.equal(app.element('vazamento-titulo').textContent, 'Senha encontrada');
});

test('presets generate immediately with the advertised length, alphabet and exclusions', () => {
    const app = load('script.js');
    app.run('aplicarPreset("sem-simbolos")');
    assert.match(app.element('resultado').textContent, /^[A-Za-z0-9]{20}$/);
    assert.equal(app.element('simbolos').checked, false);
    assert.equal(app.element('preset-sem-simbolos')['aria-pressed'], 'true');
    app.run('aplicarPreset("digitar")');
    const easy = app.element('resultado').textContent;
    assert.equal(easy.length, 20);
    assert.match(easy, /^[A-Za-z0-9]+$/);
    assert.doesNotMatch(easy, /[Il1Oo0]/);
    assert.equal(app.element('preset-sem-simbolos')['aria-pressed'], 'false');
    app.run('aplicarPreset("geral")');
    assert.equal(app.element('resultado').textContent.length, 16);
    assert.equal(app.element('simbolos').checked, true);
    assert.equal(app.element('excluir-semelhantes').checked, false);
});

test('editing a preset clears the selected preset and explains custom configuration', () => {
    const app = load('script.js');
    app.run('aplicarPreset("digitar")');
    app.element('tamanho').value = '24';
    app.element('tamanho').listeners.change();
    assert.equal(app.element('preset-digitar')['aria-pressed'], 'false');
    assert.match(app.element('preset-description').textContent, /personalizada/);
});

test('a found breach reveals a checklist that resets after editing or clearing', async () => {
    const app = load('tools.js');
    assert.equal(app.element('breach-checklist').hidden, true);
    app.element('senha-analise').value = example;
    app.run('invalidarConsulta()');
    app.context.fetch = async () => responseFor(example, 4);
    await app.run('consultarVazamentos()');
    assert.equal(app.element('breach-checklist').hidden, false);
    app.element('step-0').checked = true;
    app.element('step-0').listeners.change();
    assert.equal(app.element('checklist-progress').textContent, '1 de 4 etapas marcadas.');
    app.run('limparAnalise()');
    assert.equal(app.element('breach-checklist').hidden, true);
    assert.equal(app.element('step-0').checked, false);
    assert.equal(app.element('checklist-progress').textContent, '0 de 4 etapas marcadas.');
    assert.equal(app.element('analysis-actions').hidden, true);
});

test('the analysis gives a reason and a practical action instead of echoing the password', () => {
    const app = load('tools.js');
    app.context.sample = '12345678';
    const advice = app.run('analisar(sample).dicas.join(" ")');
    assert.match(advice, /Sequência previsível/);
    assert.match(advice, /evite/);
    assert.ok(!advice.includes('12345678'));
    app.context.sample = 'monkeymonkeymonkey';
    const repeated = app.run('analisar(sample).dicas.join(" ")');
    assert.match(repeated, /Palavra comum/);
    assert.match(repeated, /Repetição/);
});
