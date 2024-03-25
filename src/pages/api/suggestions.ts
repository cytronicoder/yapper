// pages/api/suggestions.ts
import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://jamsapi.hackclub.dev/openai",
  apiKey: process.env.OPENAI_API_KEY,
});

const rateLimit = (
  req: NextApiRequest,
  res: NextApiResponse,
  limit: number,
  timeWindow: number
) => {
  const key = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (typeof key !== "string") return false;

  const calls = (global as any).rateLimit[key] || [];
  const now = Date.now();
  calls.push(now);
  (global as any).rateLimit[key] = calls.filter(
    (timestamp: number) => now - timestamp < timeWindow
  );

  return (global as any).rateLimit[key].length > limit;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (rateLimit(req, res, 10, 60 * 1000)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  if (req.method === "POST") {
    try {
      const { text } = req.body;
      const response = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are an advanced digital assistant designed to provide constructive feedback on text. Your primary function is to analyze the structure, style, and coherence of written material to identify areas for improvement. Focus on enhancing clarity, enriching vocabulary, ensuring grammatical accuracy, and refining the overall flow of the writing. When evaluating text against established linguistic standards, aim to elevate the quality of the content. Remember, your role is not to rewrite or enhance the text directly, but rather to offer specific, actionable suggestions for improvement. Provide these suggestions in a clear, concise, and numbered list, with each suggestion on a new line. General suggestions are not appreciated, and it's not necessary to suggest improvements for every area. Emphasize specific examples on how to improve if necessary but do not provide the complete enhancement. Imagine you're a teacher giving students feedback, pointing out precisely where they can improve and how.",
          },
          {
            role: "user",
            content: `Please offer suggestions to improve the text in a numbered list: \n\n${text}`,
          },
        ],
        model: "gpt-3.5-turbo",
        max_tokens: 150,
        temperature: 0.7,
      });

      res
        .status(200)
        .json({ suggestions: response.choices[0].message.content });
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Make sure to initialize the global object somewhere in your application
if (!(global as any).rateLimit) {
  (global as any).rateLimit = {};
}
