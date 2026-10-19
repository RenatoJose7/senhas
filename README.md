# CHAVE

Site estático, gratuito e sem dependências de build. Mantém a identidade monocromática do gerador original e acrescenta conteúdos educativos.

## Prévia local

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Abra http://127.0.0.1:4173. Em produção, sirva por HTTPS para habilitar a área de transferência.

## Conteúdo e ferramentas

- `index.html`: home organizada em Gerar → Verificar → Aprender, com atalhos do gerador, artigos, casos e FAQ.
- `script.js`: geração com Web Crypto e exclusão opcional de caracteres semelhantes.
- `ferramentas.html` e `tools.js`: frases-senha, análise local com estimativa de tempo e consulta opcional ao Pwned Passwords.
- `aprenda/`: três guias e sua página de índice.
- `historias/`: dois casos documentados (Cloudflare e 23andMe), com fontes, datas e lições práticas.
- `como-funciona.html`: método, privacidade, limites das ferramentas e critérios editoriais.
- `sobre.html` e `privacidade.html`: informações do projeto e descrição do tratamento de dados desta versão.
- `style.css`: identidade visual compartilhada e layouts responsivos.

Os artigos já estão no HTML, sem depender de JavaScript para leitura ou indexação. Há títulos e descrições próprios, Open Graph e dados estruturados de aplicação, artigos e FAQ. Isso fornece contexto a buscadores e sistemas de resposta, sem prometer ranking ou citações.

## Verificação

```sh
node tests/security.test.cjs
```

Os testes cobrem geração, atalhos, sugestões práticas, checklist, estimativas, privacidade da requisição de vazamentos, erros de rede e respostas obsoletas após limpar o campo. A estimativa é local e a única consulta remota ocorre por clique explícito no botão de vazamentos; não há persistência ou telemetria.

## Configurações que dependem da publicação

- Informar domínio definitivo para URLs canônicas, `og:url` e sitemap; nenhum domínio fictício foi inserido.
- Informar o e-mail público em `sobre.html#contato` e atualizar a política de privacidade com os dados reais da operação e hospedagem.
- Escolher e configurar a rede de anúncios. O espaço `.ad-slot` é uma reserva visual, sem receita ou rastreamento ativo.
- Ao integrar publicidade, preservar o isolamento das credenciais: scripts de terceiros no mesmo documento podem acessar os campos e as senhas exibidas. Planejar isolamento e atualizar a política conforme a integração real.

Publique o HTML, CSS, JavaScript, favicon e a pasta `vendor/` com sua licença; a pasta de testes e este README não são necessários no site público. Esta primeira versão não foi publicada por esta tarefa.

## Estimativa de resistência e vazamentos

- Biblioteca local: `zxcvbn@4.4.2`, obtida do registro npm. A cópia em `vendor/zxcvbn/` mantém a licença MIT. Não carrega JavaScript de CDN.
- Tempos calculados a partir das tentativas estimadas pelo zxcvbn e de cenários hipotéticos identificados na interface; não prevê invasão, phishing ou hardware real. A entrada aceita até 128 caracteres, sem truncamento silencioso no cálculo.
- Consulta via HTTPS à API pública Pwned Passwords somente por clique: SHA-1 calculado localmente, primeiros cinco caracteres enviados, comparação do sufixo local. `Add-Padding: true`, sem cookies, sem referrer e sem cache de resposta. SHA-1 é usado apenas para compatibilidade com a consulta, nunca para armazenamento de senhas.
- Timeout de 12 segundos. Editar ou limpar invalida resultados e cancela requisições pendentes. Erros não são apresentados como ausência de vazamento. Ocorrências substituem a estimativa por “Já exposta”.
- Fonte: https://haveibeenpwned.com/API/V3#SearchingPwnedPasswordsByRange
- Metodologia: https://github.com/dropbox/zxcvbn

## Organização e próximos passos

A home tem três entradas: Gerar, Verificar e Aprender. A consulta positiva de vazamentos revela quatro passos de recuperação com progresso efêmero; a análise oferece sugestões por padrão e um link para gerar uma alternativa. A senha analisada não é transferida em URL nem salva para navegar entre ferramentas.

A configuração de SEO de publicação foi adiada a pedido do usuário até a definição do endereço público. Não gerar canônicas nem sitemap com domínio de exemplo. Os títulos, descrições e dados estruturados já existentes foram preservados onde aplicável.
