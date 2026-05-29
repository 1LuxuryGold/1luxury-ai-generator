export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://1luxurymiami.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5.5",
        input: [
          {
            role: "system",
            content:
              "You are the 1Luxury Miami AI Concierge for 1luxurymiami.com. You answer general customer inquiries for a luxury jewelry, custom jewelry, gold, diamond, Cuban link, pendant, and watch business. Be professional, premium, clear, and helpful. Help customers understand custom jewelry, made-to-order pieces, product questions, gold purity, diamond options, watches, consultations, shipping, order process, and next steps. Do not guarantee exact prices, delivery dates, appraisals, investment returns, or product availability. If a customer asks about product availability, say that availability must be confirmed directly with 1Luxury Miami. For serious buyers, recommend contacting 1Luxury Miami directly for final pricing, availability, and production confirmation."
          },
          {
            role: "user",
            content: message
          }
        ],
        max_output_tokens: 350
      })
    });

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error("OpenAI error:", JSON.stringify(data, null, 2));
      return res.status(500).json({
        error:
          data?.error?.message ||
          "The 1Luxury Miami AI Concierge could not connect right now."
      });
    }

    let answer = data.output_text;

    if (!answer && Array.isArray(data.output)) {
      answer = data.output
        .flatMap((item) => item.content || [])
        .map((content) => content.text || "")
        .join("\n")
        .trim();
    }

    if (!answer) {
      console.error("Unexpected OpenAI response:", JSON.stringify(data, null, 2));
      answer =
        "Thank you for reaching out to 1Luxury Miami. I can help with general questions about custom jewelry, Cuban links, pendants, diamonds, gold, watches, and consultations. For final pricing or availability, please contact 1Luxury Miami directly.";
    }

    return res.status(200).json({ answer });
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({
      error: "Something went wrong with the 1Luxury Miami AI Concierge."
    });
  }
}
