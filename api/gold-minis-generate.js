export default async function handler(req, res) {
res.setHeader(“Access-Control-Allow-Origin”, “*”);
res.setHeader(“Access-Control-Allow-Methods”, “GET, POST, OPTIONS”);
res.setHeader(“Access-Control-Allow-Headers”, “Content-Type, Authorization”);

if (req.method === “OPTIONS”) {
return res.status(200).end();
}

if (req.method === “GET”) {
return res.status(200).json({
success: true,
message: “Gold Minis image endpoint is live. Use POST from Zapier.”
});
}

if (req.method !== “POST”) {
return res.status(405).json({
success: false,
error: “Method not allowed. Use POST.”
});
}

try {
const body = req.body || {};

const prompt = body.prompt || "";
const productTitle = body.product_title || "1Luxury Gold Minis Pendant";
if (!prompt) {
  return res.status(400).json({
    success: false,
    error: "Missing prompt.",
    receivedBody: body
  });
}
if (!process.env.REPLICATE_API_TOKEN) {
  return res.status(500).json({
    success: false,
    error: "Missing REPLICATE_API_TOKEN in Vercel."
  });
}
const finalPrompt = [
  "Create a premium luxury macro product photograph for the 1Luxury Gold Minis Collection.",
  "Product title: " + productTitle,
  "Design request: " + prompt,
  "Small polished 14k yellow gold mini pendant with elegant bail.",
  "Cream silk or Paraiba blue luxury background.",
  "Soft champagne lighting, shallow depth of field, realistic warm gold reflections.",
  "Premium catalog-ready jewelry photography.",
  "No third-party logos, no copied designer motifs, no fake gemstones unless requested, no clutter."
].join("\n");
const replicateResponse = await fetch(
  "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.REPLICATE_API_TOKEN,
      "Content-Type": "application/json",
      Prefer: "wait=60"
    },
    body: JSON.stringify({
      input: {
        prompt: finalPrompt,
        aspect_ratio: body.aspect_ratio || "1:1",
        output_format: body.output_format || "webp",
        output_quality: Number(body.output_quality || 90),
        num_outputs: Number(body.num_outputs || 1)
      }
    })
  }
);
const prediction = await replicateResponse.json();
if (!replicateResponse.ok) {
  return res.status(500).json({
    success: false,
    error: "Replicate request failed.",
    details: prediction
  });
}
let imageUrl = "";
if (Array.isArray(prediction.output)) {
  imageUrl = prediction.output[0] || "";
}
if (typeof prediction.output === "string") {
  imageUrl = prediction.output;
}
if (!imageUrl) {
  return res.status(202).json({
    success: false,
    message: "Prediction created but image was not ready yet.",
    predictionId: prediction.id || null,
    predictionUrl: prediction.urls && prediction.urls.get ? prediction.urls.get : null,
    output: prediction.output || null,
    promptUsed: finalPrompt,
    status: prediction.status || null
  });
}
return res.status(200).json({
  success: true,
  imageUrl: imageUrl,
  productTitle: productTitle,
  collection: "1Luxury Gold Minis Collection",
  promptUsed: finalPrompt,
  predictionId: prediction.id || null,
  status: prediction.status || "succeeded"
});

} catch (error) {
return res.status(500).json({
success: false,
error: “Server error.”,
message: error.message
});
}
}
