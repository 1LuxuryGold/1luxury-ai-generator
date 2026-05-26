export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Use POST."
    });
  }

  try {
    const {
      name = "",
      email = "",
      phone = "",
      instagram = "",
      notes = "",
      prompt = "",
      selections = {},
      generatedImage = "",
      referenceFileNames = []
    } = req.body || {};

    if (!name || !email || !phone) {
      return res.status(400).json({
        error: "Name, email, and phone are required."
      });
    }

    const payload = {
      submittedAt: new Date().toISOString(),
      source: "1Luxury Miami AI Jewelry Generator",
      customer: {
        name,
        email,
        phone,
        instagram
      },
      concept: {
        prompt,
        generatedImage,
        selections,
        referenceFileNames
      },
      notes
    };

    /*
      Optional:
      Add LEAD_WEBHOOK_URL in Vercel Environment Variables
      if you want quote requests sent to Make, Zapier, Formspree,
      Klaviyo, Google Sheets, or your CRM.

      If LEAD_WEBHOOK_URL is blank or not added yet,
      this endpoint will still return success, but the lead
      will not be forwarded anywhere.
    */
    const webhookUrl = process.env.LEAD_WEBHOOK_URL;

    if (webhookUrl) {
      const webhookRes = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const webhookText = await webhookRes.text();

      if (!webhookRes.ok) {
        return res.status(500).json({
          error: "Webhook failed.",
          detail: webhookText
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: webhookUrl
        ? "Lead sent successfully."
        : "Lead captured successfully, but no LEAD_WEBHOOK_URL is configured yet.",
      lead: payload
    });

  } catch (error) {
    console.error("lead error:", error);

    return res.status(500).json({
      error: error?.message || "Unexpected server error."
    });
  }
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
