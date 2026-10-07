// Recebe a aplicação do formulário, valida e encaminha para o webhook do n8n.
// A URL do n8n fica só no servidor (variável de ambiente N8N_WEBHOOK_URL).

const ORIGEM = "lp-curso-lindomar";

const OPCOES = {
  experiencia: ["nunca atuei", "menos de 1 ano", "1 a 3 anos", "mais de 3 anos"],
  curso: ["3 dias", "5 dias", "ainda não sei"],
  unidade: ["Linhares", "Serra"],
  inicio: ["neste mês", "em 2 a 3 meses", "só pesquisando"],
};

// Limite de envios por IP.
// ATENÇÃO: o contador fica na memória da função. Na Vercel cada instância
// tem a própria memória e ela é descartada quando a função "esfria", então
// o limite é aproximado (protege contra rajadas, não contra ataque distribuído).
// Para um limite exato, troque o Map por um armazenamento persistente
// (ex.: Upstash Redis / Vercel KV).
const LIMITE = 5;
const JANELA_MS = 10 * 60 * 1000;
const envios = new Map();

function excedeuLimite(ip) {
  const agora = Date.now();
  const recentes = (envios.get(ip) || []).filter((t) => agora - t < JANELA_MS);
  recentes.push(agora);
  envios.set(ip, recentes);
  if (envios.size > 5000) envios.clear(); // evita crescer sem fim
  return recentes.length > LIMITE;
}

const texto = (v, max = 200) => String(v ?? "").trim().slice(0, max);

function normalizarWhatsapp(v) {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length < 10 || d.length > 11) return null;
  return "55" + d;
}

function normalizarInstagram(v) {
  let s = texto(v, 120)
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@+/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(s)) return null;
  return "@" + s;
}

function dataHoraBR(d) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(d);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, erro: "Método não permitido." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ ok: false, erro: "Dados inválidos." });
  }

  // Honeypot: humano não vê esse campo. Se veio preenchido, é robô.
  // Responde sucesso para não dar pista, mas não encaminha nada.
  if (texto(body.empresa)) {
    return res.status(200).json({ ok: true });
  }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()
    || req.socket?.remoteAddress || "desconhecido";
  if (excedeuLimite(ip)) {
    return res.status(429).json({ ok: false, erro: "Muitos envios em pouco tempo. Tente de novo em alguns minutos." });
  }

  const nome = texto(body.nome, 120).replace(/\s+/g, " ");
  const whatsapp = normalizarWhatsapp(body.whatsapp);
  const instagram = normalizarInstagram(body.instagram);
  const campos = {};
  for (const [campo, validas] of Object.entries(OPCOES)) {
    campos[campo] = validas.includes(body[campo]) ? body[campo] : null;
  }

  const erros = [];
  if (nome.split(" ").filter(Boolean).length < 2) erros.push("nome");
  if (!whatsapp) erros.push("whatsapp");
  if (!instagram) erros.push("instagram");
  for (const [campo, valor] of Object.entries(campos)) if (!valor) erros.push(campo);
  if (erros.length) {
    return res.status(400).json({ ok: false, erro: "Confira os campos destacados.", campos: erros });
  }

  const agora = new Date();
  const payload = {
    nome,
    whatsapp,
    instagram,
    ...campos,
    prioridade: campos.inicio === "neste mês" ? "alta" : "normal",
    origem: ORIGEM,
    utm_source: texto(body.utm_source),
    utm_medium: texto(body.utm_medium),
    utm_campaign: texto(body.utm_campaign),
    utm_content: texto(body.utm_content),
    page_url: texto(body.page_url, 500),
    referrer: texto(body.referrer, 500),
    enviado_em: agora.toISOString(),
    enviado_em_br: dataHoraBR(agora),
  };

  const webhook = process.env.N8N_WEBHOOK_URL;
  if (!webhook) {
    console.error("N8N_WEBHOOK_URL não configurada");
    return res.status(500).json({ ok: false, erro: "Envio indisponível no momento." });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const resposta = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resposta.ok) throw new Error(`n8n respondeu ${resposta.status}`);
  } catch (err) {
    console.error("Falha ao encaminhar para o n8n:", err.message);
    return res.status(502).json({ ok: false, erro: "Não conseguimos registrar sua aplicação agora." });
  }

  return res.status(200).json({ ok: true });
};
