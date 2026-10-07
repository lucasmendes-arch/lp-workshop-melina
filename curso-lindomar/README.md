# LP — Método Rei: Soltura de Cachos 2.0 (Lindomar · Rei dos Cachos)

Página de captura e aplicação para o curso individual do Lindomar (5 vagas/mês). A venda acontece depois, no WhatsApp.

Este projeto mora na pasta `curso-lindomar/` do repositório `lp-workshop-melina` e é publicado como um **projeto separado na Vercel**. A página do workshop (`index.html` na raiz) não depende daqui e continua igual.

## Estrutura

```
curso-lindomar/
├── index.html         página completa (HTML + CSS + JS, sem build)
├── privacidade.html   política de privacidade (LGPD)
├── api/
│   ├── lead.js        recebe o formulário, valida, anti-spam e envia ao n8n
│   └── config.js      entrega Pixel ID e número do WhatsApp para a página
├── assets/            logo + fotos (ver checklist abaixo)
├── vercel.json        URLs limpas (/privacidade) e cache das imagens
└── .env.example       variáveis de ambiente
```

## Variáveis de ambiente

| Variável | Obrigatória | Exemplo | Para quê |
|---|---|---|---|
| `N8N_WEBHOOK_URL` | sim | `https://n8n.srv1476439.hstgr.cloud/webhook/curso-lindomar-aplicacao` | URL de **produção** do Webhook no n8n. Fica só no servidor, não aparece no navegador. |
| `WHATSAPP_NUMBER` | sim | `5527999999999` | Número que abre no botão "Falar com o Lindomar no WhatsApp". DDI + DDD + número, só dígitos. |
| `META_PIXEL_ID` | não | `123456789012345` | ID do Meta Pixel. Se ficar vazio, o Pixel não é carregado. |

Depois de criar ou alterar uma variável na Vercel, faça um **Redeploy** para ela valer.

## Deploy na Vercel (projeto novo)

1. Envie esta pasta para o GitHub (commit + push no repositório `lp-workshop-melina`).
2. Na Vercel: **Add New… → Project → Import** o repositório `lucasmendes-arch/lp-workshop-melina`.
3. Em **Configure Project**:
   - **Project Name:** `lp-curso-lindomar` (ou o que preferir)
   - **Framework Preset:** `Other`
   - **Root Directory:** clique em *Edit* e escolha `curso-lindomar` ← **essencial**
   - Build/Output: deixe vazio (não tem build)
4. Em **Environment Variables**, adicione as 3 variáveis acima.
5. Clique em **Deploy**.
6. Em **Settings → Analytics**, ative o Web Analytics (o script já está na página).

> O projeto do workshop continua apontando para a raiz do repositório, e os dois projetos não interferem um no outro. Se quiser que um push no curso não gere deploy no workshop (e vice-versa), configure em cada projeto **Settings → Git → Ignored Build Step**:
> - no projeto do curso: `git diff HEAD^ HEAD --quiet -- .`
> - no projeto do workshop: `git diff HEAD^ HEAD --quiet -- index.html`

### Testar localmente

```bash
cd curso-lindomar
npm i -g vercel        # uma vez
vercel link            # vincula ao projeto da Vercel
vercel env pull .env   # baixa as variáveis
vercel dev             # abre em http://localhost:3000
```

Para testar sem mexer no fluxo real, use temporariamente em `N8N_WEBHOOK_URL` a **Test URL** do n8n ou uma URL do [webhook.site](https://webhook.site). Abra a página com `?utm_source=teste&utm_campaign=teste` para conferir as UTMs.

## Domínio próprio (ex.: `curso.reidoscachos.com.br`)

### Na Vercel
1. Projeto do curso → **Settings → Domains → Add** e digite `curso.reidoscachos.com.br`.
2. A Vercel mostra o registro DNS que precisa ser criado, normalmente:
   - **Tipo:** `CNAME` · **Nome:** `curso` · **Valor:** `cname.vercel-dns.com`
3. No painel onde o domínio está registrado (Registro.br, Hostinger, Cloudflare etc.), crie esse registro CNAME.
   - No Cloudflare, deixe o proxy **desligado** (nuvem cinza).
4. Volte na Vercel e aguarde o status **Valid Configuration** (minutos a algumas horas). O HTTPS é emitido automaticamente.

### No Meta Business Manager (verificação do domínio)
1. Acesse **business.facebook.com → Configurações do negócio → Segurança da marca → Domínios → Adicionar** e digite `reidoscachos.com.br` (o domínio raiz, que já cobre o subdomínio).
2. Escolha **Registro TXT de DNS** e copie o valor (`facebook-domain-verification=...`).
3. No painel de DNS do domínio, crie um registro **TXT** com nome `@` e esse valor.
4. Volte ao Business Manager e clique em **Verificar** (pode levar até 72h para propagar).
5. Depois de verificado, em **Gerenciador de Eventos → seu Pixel → Configurações**, confira se o domínio aparece como permitido e configure o evento **Lead** na *Mensuração de eventos agregados*, se for pedido.

## O que a página envia para o n8n

`POST` em JSON para `N8N_WEBHOOK_URL`, um por aplicação:

```json
{
  "nome": "Maria Silva",
  "whatsapp": "5527999998888",
  "instagram": "@maria.cachos",
  "experiencia": "nunca atuei",
  "curso": "5 dias",
  "unidade": "Serra",
  "inicio": "neste mês",
  "prioridade": "alta",
  "origem": "lp-curso-lindomar",
  "utm_source": "ig",
  "utm_medium": "paid",
  "utm_campaign": "teste",
  "utm_content": "v1",
  "page_url": "https://curso.reidoscachos.com.br/?utm_source=ig&utm_medium=paid&utm_campaign=teste&utm_content=v1",
  "referrer": "",
  "enviado_em": "2026-10-06T17:20:43.936Z",
  "enviado_em_br": "06/10/2026, 14:20:43"
}
```

Valores possíveis:

| Campo | Valores |
|---|---|
| `experiencia` | `nunca atuei` · `menos de 1 ano` · `1 a 3 anos` · `mais de 3 anos` |
| `curso` | `3 dias` · `5 dias` · `ainda não sei` |
| `unidade` | `Linhares` · `Serra` |
| `inicio` | `neste mês` · `em 2 a 3 meses` · `só pesquisando` |
| `prioridade` | `alta` (quando `inicio` = `neste mês`) · `normal` |

- `whatsapp` chega sempre só com dígitos e com `55` na frente, pronto para usar em `https://wa.me/{{whatsapp}}`.
- `instagram` chega sempre com `@`.
- `enviado_em` está em UTC (ISO). `enviado_em_br` já vem no horário de Brasília, bom para a planilha.

**Sugestão de fluxo no n8n:**
1. **Webhook** (POST, *Respond: Immediately*).
2. **Google Sheets → Append Row** com os campos acima.
3. **IF** `prioridade = alta` → mensagem de WhatsApp com destaque ("🔥 quer começar este mês").
4. **WhatsApp** (Evolution API / Z-API / Cloud API): aviso para a equipe com nome, WhatsApp, curso, unidade e início.

> O webhook precisa responder **2xx**. Se responder erro ou demorar mais de 8s, a página mostra a mensagem de falha e oferece o botão do WhatsApp para não perder o lead.

## Proteções do formulário

- **Validação** no navegador e de novo no servidor: nome e sobrenome, WhatsApp com DDD, @ do Instagram e as 4 escolhas.
- **Honeypot:** campo invisível `empresa`. Se vier preenchido, a API responde 200 e **não** envia ao n8n.
- **Limite por IP:** 5 envios a cada 10 minutos.
  - O contador fica na memória da função, então é aproximado: cada instância da Vercel tem o seu, e ele zera quando a função fica inativa.
  - Para um limite exato, troque por Upstash Redis/Vercel KV (comentário em `api/lead.js`).
- **Falha no envio:**
  - mostra o erro e o botão do WhatsApp com a mensagem pronta;
  - guarda o lead no `localStorage` do navegador (`rdc_leads_curso`);
  - **não** dispara o evento Lead do Pixel.

## Rastreamento

- **UTMs** (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`) são lidas na chegada e guardadas na sessão do navegador.
- **Meta Pixel:**
  - `PageView` ao carregar;
  - `Lead` **só** quando o n8n confirmou o recebimento.
  - Confira com a extensão *Meta Pixel Helper*.
- **Vercel Web Analytics:** visitas e páginas.

---

## ✅ Checklist do que substituir

### Fotos
Basta salvar os arquivos em `assets/` **com estes nomes**, sem mexer no código. Enquanto o arquivo não existir, aparece um placeholder listrado com o nome.

| Arquivo | Onde aparece | Formato sugerido |
|---|---|---|
| ~~`assets/lindomar-hero.webp`~~ ✅ | Topo da página (foto recortada, fundo transparente) | já colocada: 1080×1350px, 81 KB |
| `assets/lindomar-historia.jpg` | Seção "Por que com o Lindomar" (P&B automático) | vertical 4:5, ~900×1125px |
| `assets/divisor.jpg` | Faixa de foto em largura total entre "Por que com o Lindomar" e "Resultados" (P&B automático) | horizontal, ~1920×800px, até 250 KB |
| `assets/antes-1.jpg` … `antes-3.jpg` | Antes/depois | vertical 3:4, ~600×800px |
| `assets/depois-1.jpg` … `depois-3.jpg` | Antes/depois | vertical 3:4, ~600×800px |
| `assets/aluno-1.jpg` … `aluno-3.jpg` | Foto redonda nos depoimentos | quadrada, ~200×200px |

Dica: exporte em `.jpg` com qualidade ~75% (ou converta em squoosh.app) para a página continuar rápida no 4G.

### Textos (`index.html`)
Procure por `SUBSTITUIR` e `REVISAR` no arquivo.

- [ ] **Nome do método/técnica:** constantes `METODO` ("Método Rei") e `TECNICA` ("Soltura de Cachos 2.0") no início do `<script>`. Elas preenchem todos os elementos `js-metodo`/`js-tecnica`, a mensagem do WhatsApp e o evento Lead. Se mudar, troque também o `<title>`, a `meta description` e o `og:title` no `<head>` (o Google lê o HTML antes do script).
- [ ] **Depoimentos:** 3 cards em `#resultados`, com texto, nome, cidade e curso feito.
- [ ] **4 pontos do método** em `#metodo` e os **3 cards de "O que muda"** em `#o-que-muda`: ajustar ao conteúdo real.
- [ ] **Legenda dos placeholders** em `#resultados` (`.ph-note`): apagar quando as fotos reais estiverem no lugar.
- [ ] **História do Lindomar** em `#lindomar`: confirmar os detalhes.
- [ ] **Instagram:** link no rodapé (`id="igLink"`).
- [ ] **og:image:** hoje aponta para a foto do hero. No domínio final, troque pela URL absoluta (é a imagem que aparece ao compartilhar o link).

### Variáveis na Vercel
- [ ] `N8N_WEBHOOK_URL`: URL de produção do webhook.
- [ ] `WHATSAPP_NUMBER`: número que recebe os alunos.
- [ ] `META_PIXEL_ID`: ID do Pixel.

### Política de Privacidade (`privacidade.html`)
Procure por `REVISAR`.

- [ ] Razão social, CNPJ e endereço.
- [ ] E-mail de contato para privacidade.
- [ ] Prazo de guarda dos dados (hoje "24 meses").
- [ ] Lista de ferramentas usadas, se for diferente de Vercel/n8n/Google/WhatsApp/Meta.
- [ ] Data da última atualização.
