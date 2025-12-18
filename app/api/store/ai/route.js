
import { NextResponse } from "next/server";
import authSeller from "@/middlewares/authSellers";
import { getAuth } from "@clerk/nextjs/server";
import { openai } from "@/configs/openai";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

async function analyzeImage(base64Image, mimeType) {
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    max_completion_tokens: 300,
    messages: [
      {
        role: "system",
        content: `
                You are a product listing assistant.

                Respond ONLY with raw JSON.
                Do NOT use markdown.
                Do NOT wrap in triple backticks.
                Schema:
                {
                  "name": "string",
                  "description": "string"
                }
        `,
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze this product image." },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
  });

  let raw = response.choices[0]?.message?.content?.trim();

  if (!raw) {
    throw new Error("Empty AI response");
  }

  // ✅ REMOVE ```json ``` OR ```
  raw = raw
    .replace(/```json/i, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("RAW AI OUTPUT (cleaned):", raw);
    throw new Error("AI returned invalid JSON");
  }
}


export async function POST(req) {
  try {
    const { userId } = getAuth(req);
    const isSeller = await authSeller(userId);
    if (!isSeller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { base64Image, mimeType } = await req.json();
    if (!base64Image || !mimeType) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const result = await analyzeImage(base64Image, mimeType);

    // đảm bảo là object JSON
    return NextResponse.json({
      name: result.name,
      description: result.description,
    });
  } catch (err) {
    console.error("AI route error:", err);
    return NextResponse.json(
      { error: err.message || "AI error" },
      { status: 500 }
    );
  }
}
