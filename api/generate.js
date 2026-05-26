export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { prompt } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing prompt." });
    }

    const finalPrompt = `
Create a premium 1Luxury Miami custom jewelry visualization.

Design request:
${prompt.slice(0, 1200)}

Style requirements:
- High-end Miami jewelry aesthetic
- Luxury product photography
- Realistic gold, platinum, or silver metal
- Realistic diamond and gemstone setting
- Sharp craftsmanship details
- Clean premium background
- Elegant reflections
- Balanced proportions
- Made-to-order custom jewelry concept

Avoid:
- Cartoon style
- Blurry stones
- Distorted letters
- Melted metal
- Extra random chains
- Incorrect text
- Unrealistic proportions
`;

    const response = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-2-pro/predictions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
          "Prefer": "wait"
        },
        body: JSON.stringify({
          input: {
            prompt: finalPrompt,
            aspect_ratio: "1:1",
            output_format: "png"
          }
        })
      }
    );

    const prediction = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: "Replicate generation failed.",
        details: prediction
      });
    }

    let imageUrl = null;

    if (Array.isArray(prediction.output)) {
      imageUrl = prediction.output[0];
    } else if (typeof prediction.output === "string") {
      imageUrl = prediction.output;
    }

    if (!imageUrl) {
      return res.status(500).json({
        error: "No image returned.",
        details: prediction
      });
    }

    return res.status(200).json({
      imageUrl,
      prompt: finalPrompt
    });

  } catch (error) {
    return res.status(500).json({
      error: "Server error.",
      message: error.message
    });
  }
}
