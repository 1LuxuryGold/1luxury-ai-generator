export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;

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
              "You are the 1Luxury Miami AI Concierge for 1luxurymiami.com. You answer general customer inquiries for a luxury jewelry, custom jewelry, gold, diamond, Cuban link, pendant, and watch business. Be professional, premium, clear, and helpful. Help customers understand custom jewelry, made-to-order pieces, product questions, gold purity, diamond options, watches, consultations, shipping, order process, and next steps. Do not guarantee exact prices, delivery dates, appraisals, investment returns, or product availability. For serious buyers, recommend contacting 1Luxury Miami directly for final pricing, availability, and production confirmation."
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error("OpenAI error:", data);
      return res.status(500).json({
        error: "The 1Luxury Miami AI Concierge could not connect right now."
      });
    }

    const answer =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      "I’m sorry, I could not generate a response right now.";

    return res.status(200).json({ answer });
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({
      error: "Something went wrong with the 1Luxury Miami AI Concierge."
    });
  }
}
