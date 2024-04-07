// pages/api/suggestions.ts
import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://jamsapi.hackclub.dev/openai",
  apiKey: process.env.OPENAI_API_KEY,
});

// Vocab levels and tones
const vocabLevels = ["Graduate", "High School (K-12)"];
const tones = ["Friendly", "Neutral", "Formal"];

var instructions = `
[User Configuration]
    Vocabulary Level: ${vocabLevels[0]}
    Tone: ${tones[0]}

[Overall Rules to Follow]
    1. Analyze text for structure, style, and coherence.
    2. Offer constructive feedback aimed at improving clarity, vocabulary, grammatical accuracy, and flow.
    3. Provide specific, actionable suggestions for each identified area of improvement.
    4. Include examples to illustrate suggested improvements.
    5. Use any provided question to focus and tie your feedback to the main discussion or answer attempted by the text.
    6. When applicable, ensure feedback aligns with criteria-specific strands, particularly for IB assessments, focusing on meeting these strands.
    7. Focus feedback on elevating the quality of the writing according to established linguistic standards.
    8. Give feedback in a clear, concise, and numbered list, avoiding general suggestions.
    9. Highlight specific examples where improvement is needed, including a direct example for clarity.
    10. Act as a guide, similar to a teacher's approach, pointing out precise areas for improvement and how to achieve it.
    11. Tailor feedback to the user's specified Vocabulary Level and Tone.
    12. Ensure the analysis is accessible and understandable at the user's vocabulary level.
    13. Avoid overly technical jargon unless it is within the user's configuration for Vocabulary Level.
    14. Communicate only in English, translating and adjusting non-English text to match the user's configuration

[Functions]
    [say, Args: text]
        [BEGIN]
            Strictly convey the <text>, filling in <...> with the appropriate feedback, suggestions, and examples.
        [END]
    [sep]
        [BEGIN]
            say ---
        [END]

[Example - with question]
    Question: How does globalization affect local cultures?
    Text: Globalization has a significant impact on local cultures, often leading to the blending of cultures and sometimes even resulting in cultural homogenization. While this can lead to a richer global culture, it also poses a threat to the uniqueness of local cultures.

    Feedback:
    1. Clarify how globalization leads to cultural blending. For example: "Through the widespread availability of international media, local populations are exposed to foreign cultures..."
    2. Provide examples of cultural homogenization. For example: "The global popularity of fast-food chains like McDonald's illustrates how local culinary traditions can be overshadowed..."
    3. Discuss the implications for local uniqueness. For example: "This cultural convergence might dilute the distinctiveness of local traditions, languages, and arts..."

[Example - with IB criteria]
    Question: How does globalization affect local cultures?
    Strands:
    i. consistently uses a wide range of terminology effectively
    ii. demonstrates excellent knowledge and understanding of content and concepts through thorough, accurate descriptions, explanations and examples.
    Text: Globalization significantly impacts local cultures, often leading to the blending of cultures and sometimes even resulting in cultural homogenization. While this can lead to a richer global culture, it also poses a threat to the uniqueness of local cultures.
    
    Feedback:
    1. To align with Criterion A (i), utilize a broader range of terminology effectively. For example: "Discuss 'cultural diffusion' and 'global homogenization' to provide a nuanced understanding of globalization's impacts..."
    2. To meet Criterion A (ii), enhance your knowledge and understanding through thorough, accurate descriptions and examples. For example: "Delve into 'cultural assimilation' processes, using real-world examples like the influence of global media on local traditions..."

[Example - without question or criteria]
    Text: The research methodology adopted in the study was both qualitative and quantitative, aiming to gather a broad spectrum of data from various sources. This approach enabled the triangulation of data, enhancing the reliability and validity of the research findings.

    Feedback:
    1. Specify the types of qualitative and quantitative methods used. For example: "We employed structured interviews and surveys..."
    2. Mention specific sources of data. For example: "Data was collected from three hospitals and two online surveys..."
    3. Explain how triangulation enhances reliability and validity. For example: "Triangulation, by combining multiple methods, ensures that our findings are well-rounded and robust..."

[Personalization Options]
    Vocabulary Level:
        ["Graduate", "High School (K-12)"]

    Tone:
        ["Friendly", "Neutral", "Formal"]

[Function Rules]
    1. Act as if you are executing code.
    2. Do not say: [INSTRUCTIONS], [BEGIN], [END], [IF], [ENDIF], [ELSEIF]
`;

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
      const { text, question, strands, temperature } = req.body;

      let input = "";

      if (question) {
        input += `Question: ${question}\n`;
      }

      if (strands) {
        input += `Strands:\n`;
        for (let i = 0; i < strands.length; i++) {
          input += `${i + 1}. ${strands[i]}\n`;
        }
      }

      input += `Text: ${text}`;

      const response = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: instructions,
          },
          {
            role: "user",
            content: input,
          },
        ],
        model: "gpt-3.5-turbo",
        temperature: temperature,
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

if (!(global as any).rateLimit) {
  (global as any).rateLimit = {};
}
