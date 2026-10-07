// Configuração pública da página (nada sigiloso aqui).
module.exports = (req, res) => {
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  res.status(200).json({
    pixelId: process.env.META_PIXEL_ID || "",
    whatsappNumber: (process.env.WHATSAPP_NUMBER || "").replace(/\D/g, ""),
  });
};
