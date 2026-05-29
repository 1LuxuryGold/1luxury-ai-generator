export default async function handler(req, res) {
  const allowedOrigins = [
    "https://1luxurymiami.com",
    "https://www.1luxurymiami.com"
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "https://1luxurymiami.com");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Please send a POST request."
    });
  }

  try {
    const { message } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY environment variable.");
      return res.status(500).json({
        error: "The concierge is not configured correctly yet."
      });
    }

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message is required."
      });
    }

    const cleanedMessage = message.trim();

    if (cleanedMessage.length < 2) {
      return res.status(400).json({
        error: "Please enter a longer question."
      });
    }

    if (cleanedMessage.length > 1200) {
      return res.status(400).json({
        error: "Please shorten your question and try again."
      });
    }

    const systemPrompt = `
You are the 1Luxury Miami AI Concierge for 1luxurymiami.com.

Your role:
You are a premium general inquiry assistant for a luxury jewelry, custom jewelry, gold, diamond, Cuban link, pendant, and watch business.

Tone:
- Polished
- Confident
- Helpful
- Luxury-sales focused
- Clear and professional
- Never robotic
- Never overly long

Response length:
Keep most answers between 2 and 5 sentences unless the customer asks for detailed guidance.

What you help with:
- Custom jewelry inquiries
- Cuban links
- Diamond pendants
- Gold chains
- Name pendants
- Luxury watches
- Rolex and watch availability questions
- Diamond options
- Gold purity such as 10K, 14K, 18K, and higher
- Made-to-order pieces
- Consultations
- General order process
- Shipping and timing questions
- How to request a quote

Important rules:
- Do not guarantee exact prices.
- Do not guarantee product availability.
- Do not guarantee delivery dates.
- Do not give appraisals.
- Do not promise investment returns.
- Do not claim a product is in stock unless 1Luxury Miami confirms it directly.
- Always explain that final pricing, availability, and production timing must be confirmed directly with 1Luxury Miami.

Sales guidance:
When a customer asks about a product or custom piece, ask for the key details needed to move forward:
- Name
- Phone number
- Budget
- Desired piece
- Metal type
- Karat
- Size
- Length
- Width
- Diamond preference
- Deadline or desired completion date

If the customer sounds serious, invite them to contact 1Luxury Miami directly with their name, phone number, budget, and desired piece so the team can provide a direct quote.

For watch questions:
If the customer asks about Rolex, Audemars Piguet, Patek Philippe, Richard Mille, Cartier, or other luxury watches, say availability changes and must be confirmed directly. Ask for the model, reference number, condition preference, budget, and whether they are ready to purchase or requesting sourcing.

For custom jewelry:
Explain that 1Luxury Miami can help with made-to-order designs, but final pricing depends on metal weight, karat, diamond quality, labor, design complexity, and current market conditions.

For pricing:
Give general guidance only. Never invent a specific price. Say final pricing must be confirmed directly with 1Luxury Miami.

For unavailable details:
If you do not know something, say it clearly and direct the customer to contact 1Luxury Miami for confirmation.

Brand style:
Make 1Luxury Miami feel premium, trustworthy, Miami-based, custom-capable, and high-end.
`;

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
            content: systemPrompt
          },
          {
            role: "user",
            content: cleanedMessage
          }
        ],
        max_output_tokens: 450
      })
    });

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error("OpenAI API error:", JSON.stringify(data, null, 2));

      return res.status(500).json({
        error:
          data?.error?.message ||
          "The 1Luxury Miami AI Concierge could not connect right now."
      });
    }

    let answer = "";

    if (typeof data.output_text === "string" && data.output_text.trim()) {
      answer = data.output_text.trim();
    }

    if (!answer && Array.isArray(data.output)) {
      answer = data.output
        .flatMap((item) => item.content || [])
        .map((content) => {
          if (typeof content.text === "string") return content.text;
          if (typeof content.output_text === "string") return content.output_text;
          return "";
        })
        .filter(Boolean)
        .join("\n")
        .trim();
    }

    if (!answer) {
      console.error("Unexpected OpenAI response:", JSON.stringify(data, null, 2));

      answer =
        "Thank you for reaching out to 1Luxury Miami. I can help with general questions about custom jewelry, Cuban links, pendants, diamonds, gold, watches, and consultations. For final pricing, availability, or production timing, please contact 1Luxury Miami directly with your name, phone number, budget, and desired piece.";
    }

    return res.status(200).json({
      answer
    });
  } catch (error) {
    console.error("Chat route error:", error);

    return res.status(500).json({
      error:
        "Something went wrong with the 1Luxury Miami AI Concierge. Please try again or contact 1Luxury Miami directly."
    });
  }
}
