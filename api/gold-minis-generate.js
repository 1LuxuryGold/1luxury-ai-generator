export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      message: "Gold Minis image endpoint is live. Test route working."
    });
  }

  if (req.method === "POST") {
    return res.status(200).json({
      success: true,
      message: "POST received successfully.",
      receivedBody: req.body || null
    });
  }

  return res.status(405).json({
    success: false,
    error: "Method not allowed."
  });
}
