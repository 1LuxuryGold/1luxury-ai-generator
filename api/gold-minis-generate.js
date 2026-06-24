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
var body = req.body || {};

if (typeof body === "string") {
  try {
    body = JSON.parse(body);
  } catch (error) {
    body = { prompt: body };
  }
}
if (body.data && typeof body.data === "string") {
  try {
    var parsedData = JSON.parse(body.data);
    body = Object.assign({}, body, parsedData);
  } catch (error) {}
}
var prompt = body.prompt || body.image_generation_prompt || body.imageGenerationPrompt || body["Image Generation Prompt"] || "";
var productTitle = body.product_title || body.productTitle || body["Product Title"] || "1Luxury Gold Minis Pendant";
if (!prompt || typeof prompt !== "string") {
  return res.status(400).json({
    success: false,
    error: "Missing prompt.",
    receivedBody: body
  });
}
var token = process.env.REPLICATE_API_TOKEN;
if (!token) {
  return res.status(500).json({
    success: false,
    error: "Missing REPLICATE_API_TOKEN in Vercel Environment Variables."
  });
}
var finalPrompt = [
  "Create a premium luxury macro product photograph for the 1Luxury Gold Minis Collection.",
  "",
  "Product title: " + productTitle,
  "",
  "Design request: " + prompt.slice(0, 1200),
  "",
  "Visual requirements:",
  "- Original 1Luxury Miami jewelry concept",
  "- Small polished 14k yellow gold mini pendant",
  "- Elegant bail",
  "- Smooth rounded high-polish surfaces",
  "- Realistic warm yellow gold reflections",
  "- Clean jewelry proportions",
  "- Premium craftsmanship",
  "- Cream silk or Paraiba blue luxury material background",
  "- Soft champagne lighting",
  "- Shallow depth of field",
  "- Refined feminine luxury styling",
  "- Parisian high-jewelry maison inspired composition",
  "- Premium catalog-ready jewelry photography",
  "- Ultra-realistic jewelry product photography",
  "",
  "Avoid:",
  "- Third-party logos",
  "- Copied designer motifs",
  "- Fake gemstones or diamonds unless requested",
  "- Cluttered background",
  "- Engraved text unless requested",
  "- Cartoon style",
  "- Melted metal",
  "- Distorted shapes",
  "- Bad proportions"
].join("\n");
var replicateResponse = await fetch(
  "https://api.replicate.com/v1/models/black-forest-labs/flux-2-pro/predictions",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json",
      "Prefer": "wait"
    },
    body: JSON.stringify({
      input: {
        prompt: finalPrompt,
        aspect_ratio: body.aspect_ratio || "1:1",
        output_format: body.output_format || "png"
      }
    })
  }
);
var prediction = await replicateResponse.json();
if (!replicateResponse.ok) {
  return res.status(500).json({
    success: false,
    error: "Replicate generation failed.",
    details: prediction
  });
}
var imageUrl = null;
if (Array.isArray(prediction.output)) {
  imageUrl = prediction.output[0];
} else if (typeof prediction.output === "string") {
  imageUrl = prediction.output;
}
if (!imageUrl) {
  return res.status(500).json({
    success: false,
    error: "No image returned.",
    details: prediction,
    promptUsed: finalPrompt
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
