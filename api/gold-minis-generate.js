export const config = {
api: {
bodyParser: {
sizeLimit: “10mb”,
},
},
};

const DEFAULT_MODEL = “black-forest-labs/flux-schnell”;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setCors(req, res) {
const allowedOrigins = [
“https://1luxurymiami.com”,
“https://www.1luxurymiami.com”,
“https://zapier.com”,
“https://hooks.zapier.com”,
];

const origin = req.headers.origin;

if (origin && allowedOrigins.includes(origin)) {
res.setHeader(“Access-Control-Allow-Origin”, origin);
} else {
res.setHeader(“Access-Control-Allow-Origin”, “*”);
}

res.setHeader(“Access-Control-Allow-Methods”, “POST, OPTIONS”);
res.setHeader(
“Access-Control-Allow-Headers”,
“Content-Type, Authorization, x-zapier-secret, x-api-key”
);
}

async function readRawBody(req) {
const chunks = [];

for await (const chunk of req) {
chunks.push(Buffer.from(chunk));
}

return Buffer.concat(chunks).toString(“utf8”);
}

function parseMaybeJson(value) {
if (!value) return {};

if (typeof value === “object”) {
return value;
}

if (typeof value !== “string”) {
return {};
}

const trimmed = value.trim();

if (!trimmed) return {};

try {
return JSON.parse(trimmed);
} catch (error) {
try {
return Object.fromEntries(new URLSearchParams(trimmed));
} catch (urlError) {
return { prompt: trimmed };
}
}
}

async function getRequestBody(req) {
if (req.body && typeof req.body === “object”) {
return req.body;
}

if (req.body && typeof req.body === “string”) {
return parseMaybeJson(req.body);
}

const rawBody = await readRawBody(req);
return parseMaybeJson(rawBody);
}

function extractPrompt(body) {
let parsedBody = body || {};

if (parsedBody.data) {
const parsedData = parseMaybeJson(parsedBody.data);

if (parsedData && typeof parsedData === "object") {
  parsedBody = {
    ...parsedBody,
    ...parsedData,
    data: parsedData,
  };
}

}

const possiblePrompts = [
parsedBody.prompt,
parsedBody.image_generation_prompt,
parsedBody.imageGenerationPrompt,
parsedBody[“Image Generation Prompt”],
parsedBody?.data?.prompt,
parsedBody?.data?.image_generation_prompt,
parsedBody?.data?.imageGenerationPrompt,
parsedBody?.input?.prompt,
];

for (const item of possiblePrompts) {
if (typeof item === “string” && item.trim().length > 0) {
return item.trim();
}
}

return “”;
}

function buildGoldMinisPrompt(prompt, body) {
const productTitle =
body.product_title ||
body.productTitle ||
body?.data?.product_title ||
“1Luxury Gold Minis Pendant”;

const collection =
body.collection ||
body?.data?.collection ||
“1Luxury Gold Minis Collection”;

const fixedStyle = `
Create a premium luxury macro product photograph for ${collection}.
Product title: ${productTitle}.

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
* No third-party logos
* No copied designer motifs
* No fake gemstones or diamonds unless requested
* No cluttered background
* No engraved text unless requested
* Ultra-realistic jewelry product photography
    `.trim();
    return ${prompt}\n\n${fixedStyle};
    }

function extractImageUrl(output) {
if (!output) return “”;

if (typeof output === “string”) {
return output;
}

if (Array.isArray(output)) {
for (const item of output) {
const found = extractImageUrl(item);
if (found) return found;
}
}

if (typeof output === “object”) {
return (
output.url ||
output.image ||
output.imageUrl ||
output.output ||
output.src ||
“”
);
}

return “”;
}

async function createReplicatePrediction(finalPrompt, body) {
const token = process.env.REPLICATE_API_TOKEN;

if (!token) {
throw new Error(“Missing REPLICATE_API_TOKEN environment variable in Vercel.”);
}

const modelVersion = process.env.REPLICATE_MODEL_VERSION;
const modelName = process.env.REPLICATE_MODEL || DEFAULT_MODEL;

const input = {
prompt: finalPrompt,
aspect_ratio: body.aspect_ratio || body.aspectRatio || “1:1”,
output_format: body.output_format || “webp”,
output_quality: Number(body.output_quality || 90),
num_outputs: Number(body.num_outputs || 1),
};

let replicateUrl;
let requestBody;

if (modelVersion) {
replicateUrl = “https://api.replicate.com/v1/predictions”;
requestBody = {
version: modelVersion,
input,
};
} else {
const cleanedModelName = modelName
.replace(“https://replicate.com/”, “”)
.replace(/^/+|/+$/g, “”);

replicateUrl = `https://api.replicate.com/v1/models/${cleanedModelName}/predictions`;
requestBody = { input };

}

const createResponse = await fetch(replicateUrl, {
method: “POST”,
headers: {
Authorization: Bearer ${token},
“Content-Type”: “application/json”,
Prefer: “wait=60”,
},
body: JSON.stringify(requestBody),
});

const prediction = await createResponse.json();

if (!createResponse.ok) {
throw new Error(
prediction?.detail ||
prediction?.error ||
Replicate request failed with status ${createResponse.status}
);
}

return prediction;
}

async function waitForPrediction(prediction) {
let currentPrediction = prediction;

for (let attempt = 0; attempt < 20; attempt += 1) {
if (
currentPrediction.status === “succeeded” ||
currentPrediction.status === “failed” ||
currentPrediction.status === “canceled”
) {
break;
}

if (!currentPrediction?.urls?.get) {
  break;
}
await sleep(1500);
const pollResponse = await fetch(currentPrediction.urls.get, {
  headers: {
    Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
  },
});
currentPrediction = await pollResponse.json();

}

return currentPrediction;
}

export default async function handler(req, res) {
setCors(req, res);

if (req.method === “OPTIONS”) {
return res.status(200).end();
}

if (req.method !== “POST”) {
return res.status(405).json({
success: false,
error: “Method not allowed. Use POST.”,
});
}

try {
const zapierSecret = process.env.ZAPIER_IMAGE_SECRET;

if (zapierSecret) {
  const providedSecret =
    req.headers["x-zapier-secret"] || req.headers["x-api-key"];
  if (providedSecret !== zapierSecret) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized Zapier request.",
    });
  }
}
const body = await getRequestBody(req);
const prompt = extractPrompt(body);
if (!prompt) {
  return res.status(400).json({
    success: false,
    error: "Missing prompt.",
    receivedBody: body,
  });
}
const finalPrompt = buildGoldMinisPrompt(prompt, body);
const prediction = await createReplicatePrediction(finalPrompt, body);
const completedPrediction = await waitForPrediction(prediction);
if (completedPrediction.status === "failed") {
  return res.status(500).json({
    success: false,
    error: "Replicate prediction failed.",
    predictionId: completedPrediction.id,
    logs: completedPrediction.logs,
  });
}
if (completedPrediction.status === "canceled") {
  return res.status(500).json({
    success: false,
    error: "Replicate prediction was canceled.",
    predictionId: completedPrediction.id,
  });
}
const imageUrl = extractImageUrl(completedPrediction.output);
if (!imageUrl) {
  return res.status(202).json({
    success: false,
    status: completedPrediction.status,
    message:
      "Prediction created, but no image URL was returned yet. Check predictionUrl.",
    predictionId: completedPrediction.id,
    predictionUrl: completedPrediction?.urls?.get || null,
    output: completedPrediction.output || null,
    promptUsed: finalPrompt,
  });
}
return res.status(200).json({
  success: true,
  imageUrl,
  promptUsed: finalPrompt,
  predictionId: completedPrediction.id,
  status: completedPrediction.status,
  productTitle:
    body.product_title ||
    body.productTitle ||
    body?.data?.product_title ||
    "1Luxury Gold Minis Pendant",
  collection:
    body.collection ||
    body?.data?.collection ||
    "1Luxury Gold Minis Collection",
});

} catch (error) {
return res.status(500).json({
success: false,
error: error.message || “Unknown server error.”,
});
}
}
