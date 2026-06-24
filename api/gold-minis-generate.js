const DEFAULT_MODEL = “black-forest-labs/flux-schnell”;

function setCors(req, res) {
res.setHeader(“Access-Control-Allow-Origin”, “*”);
res.setHeader(“Access-Control-Allow-Methods”, “GET, POST, OPTIONS”);
res.setHeader(“Access-Control-Allow-Headers”, “Content-Type, Authorization”);
}

function getPrompt(body) {
if (!body) return “”;

if (typeof body === “string”) {
try {
body = JSON.parse(body);
} catch (error) {
return body.trim();
}
}

if (body.data && typeof body.data === “string”) {
try {
const parsedData = JSON.parse(body.data);
body = {
…body,
…parsedData
};
} catch (error) {}
}

return String(
body.prompt ||
body.image_generation_prompt ||
body.imageGenerationPrompt ||
body[“Image Generation Prompt”] ||
“”
).trim();
}

function getProductTitle(body) {
if (!body) return “1Luxury Gold Minis Pendant”;

if (typeof body === “string”) {
try {
body = JSON.parse(body);
} catch (error) {
return “1Luxury Gold Minis Pendant”;
}
}

return String(
body.product_title ||
body.productTitle ||
body[“Product Title”] ||
“1Luxury Gold Minis Pendant”
).trim();
}

function buildFinalPrompt(prompt, productTitle) {
return `
Create a premium luxury macro product photograph for the 1Luxury Gold Minis Collection.

Product title:
${productTitle}

Design request:
${prompt}

Visual requirements:

* Original 1Luxury Miami jewelry concept
* Small polished 14k yellow gold mini pendant
* Elegant bail
* Smooth rounded high-polish surfaces
* Realistic warm yellow gold reflections
* Clean jewelry proportions
* Premium craftsmanship
* Cream silk or Paraiba blue luxury material background
* Soft champagne lighting
* Shallow depth of field
* Refined feminine luxury styling
* Parisian high-jewelry maison inspired composition
* Premium catalog-ready finish
* Ultra-realistic jewelry product photography

Avoid:

* Third-party logos
* Copied designer motifs
* Fake gemstones or diamonds unless requested
* Cluttered background
* Engraved text unless requested
* Cartoon style
* Melted metal
* Distorted shapes
* Bad proportions
    `.trim();
    }

function extractImageUrl(output) {
if (!output) return “”;

if (typeof output === “string”) {
return output;
}

if (Array.isArray(output)) {
for (let i = 0; i < output.length; i++) {
const found = extractImageUrl(output[i]);
if (found) return found;
}
}

if (typeof output === “object”) {
return output.url || output.image || output.imageUrl || output.src || “”;
}

return “”;
}

async function waitForPrediction(prediction, token) {
let current = prediction;

for (let i = 0; i < 20; i++) {
if (current.status === “succeeded”) return current;
if (current.status === “failed”) return current;
if (current.status === “canceled”) return current;

if (!current.urls || !current.urls.get) {
  return current;
}
await new Promise(function(resolve) {
  setTimeout(resolve, 1500);
});
const pollResponse = await fetch(current.urls.get, {
  method: "GET",
  headers: {
    Authorization: "Bearer " + token
  }
});
current = await pollResponse.json();

}

return current;
}

export default async function handler(req, res) {
setCors(req, res);

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
const token = process.env.REPLICATE_API_TOKEN;

if (!token) {
  return res.status(500).json({
    success: false,
    error: "Missing REPLICATE_API_TOKEN in Vercel Environment Variables."
  });
}
const body = req.body || {};
const prompt = getPrompt(body);
const productTitle = getProductTitle(body);
if (!prompt) {
  return res.status(400).json({
    success: false,
    error: "Missing prompt.",
    receivedBody: body
  });
}
const finalPrompt = buildFinalPrompt(prompt.slice(0, 1800), productTitle);
const modelName = process.env.REPLICATE_MODEL || DEFAULT_MODEL;
const cleanedModelName = modelName
  .replace("https://replicate.com/", "")
  .replace(/^\/+|\/+$/g, "");
const replicateUrl =
  "https://api.replicate.com/v1/models/" +
  cleanedModelName +
  "/predictions";
const createResponse = await fetch(replicateUrl, {
  method: "POST",
  headers: {
    Authorization: "Bearer " + token,
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
});
const prediction = await createResponse.json();
if (!createResponse.ok) {
  return res.status(createResponse.status).json({
    success: false,
    error: "Replicate generation failed.",
    details: prediction
  });
}
const completed = await waitForPrediction(prediction, token);
const imageUrl = extractImageUrl(completed.output);
if (!imageUrl) {
  return res.status(202).json({
    success: false,
    status: completed.status,
    message: "Prediction started but image URL was not ready yet.",
    predictionId: completed.id || null,
    predictionUrl:
      completed.urls && completed.urls.get ? completed.urls.get : null,
    output: completed.output || null,
    promptUsed: finalPrompt
  });
}
return res.status(200).json({
  success: true,
  imageUrl: imageUrl,
  productTitle: productTitle,
  collection: "1Luxury Gold Minis Collection",
  promptUsed: finalPrompt,
  predictionId: completed.id || null,
  status: completed.status || "succeeded"
});

} catch (error) {
return res.status(500).json({
success: false,
error: “Server error.”,
message: error.message
});
}
}
