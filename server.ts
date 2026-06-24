import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize GoogleGenAI client to avoid crash if API key is not present initially
let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined in the environment. Please configure it in Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY_FOR_INIT",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Endpoint: Analyze an individual segment of speech
app.post("/api/analyze-segment", async (req, res) => {
  try {
    const { text, speakerLabel } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "No text provided for analysis" });
    }

    const ai = getAI();
    const prompt = `Analyze this spoken statement by "${speakerLabel || "a speaker"}" in a live philosophical debate.
Statement: "${text}"

Provide a detailed analysis of the statement in JSON format based on the requested schema. Make sure to evaluate:
1. factDensity: Percentage (0-100) of statements that are factual, logically sound, or empirically verifiable.
2. fluffDensity: Percentage (0-100) of conversational padding, repetitive phrasing, rhetorical empty questions, or generic filler.
3. errorDensity: Percentage (0-100) of factually incorrect, logically fallacious, or clearly misleading statements.
4. harmDensity: Percentage (0-100) of aggressive, toxic, ad hominem, or manipulative phrasing.
Note: factDensity + fluffDensity + errorDensity + harmDensity should ideally make sense (e.g., they don't have to sum to exactly 100 as some phrases can be both fluff and error, but keep them descriptive).
5. complexityScore: Percentage (0-100) reflecting the sophistication of the language, usage of complex vocabulary, and depth of philosophical concepts mentioned.
6. keyArguments: Array of main ideas/propositions presented in this short speech segment.
7. vagueOrNeedsBetterAssessment: Concrete advice on what parts of their argument are too vague, poorly formulated, or need a deeper assessment.
8. philosophicalPosition: The implied philosophical worldview or school of thought they align with based on their argument (e.g., "Stoicism", "Utilitarianism", "Skeptical Empiricism", "Epistemic Nihilism", "Socratic Irony", "Deontology", "Rationalist").

Respond strictly with valid JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            factDensity: { type: Type.INTEGER, description: "Logical/empirical correctness percentage" },
            fluffDensity: { type: Type.INTEGER, description: "Empty fluff or filler words percentage" },
            errorDensity: { type: Type.INTEGER, description: "Wrong facts or fallacious claims percentage" },
            harmDensity: { type: Type.INTEGER, description: "Harmful, ad hominem, or highly toxic elements percentage" },
            complexityScore: { type: Type.INTEGER, description: "Language/concept complexity score (0-100)" },
            keyArguments: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Bullet points of key arguments",
            },
            vagueOrNeedsBetterAssessment: {
              type: Type.STRING,
              description: "Analysis of vague claims or elements needing better logical assessment",
            },
            philosophicalPosition: {
              type: Type.STRING,
              description: "Implied philosophical position or school of thought",
            },
          },
          required: [
            "factDensity",
            "fluffDensity",
            "errorDensity",
            "harmDensity",
            "complexityScore",
            "keyArguments",
            "vagueOrNeedsBetterAssessment",
            "philosophicalPosition",
          ],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini API");
    }

    const data = JSON.parse(resultText.trim());
    return res.json(data);
  } catch (error: any) {
    console.error("Error in /api/analyze-segment:", error);
    return res.status(500).json({
      error: error.message || "Failed to analyze speech segment",
      // Provide fallback values in case of API issues so the UI continues working beautifully
      fallback: {
        factDensity: 40,
        fluffDensity: 40,
        errorDensity: 15,
        harmDensity: 5,
        complexityScore: 50,
        keyArguments: ["Presented general ideas on the topic"],
        vagueOrNeedsBetterAssessment: "No deep flaws detected, but logic could be more rigorous.",
        philosophicalPosition: "Pragmatism"
      }
    });
  }
});

// Endpoint: Generate complete debate comparison & profiles
app.post("/api/summarize-debate", async (req, res) => {
  try {
    const { segments, speakers } = req.body;
    if (!segments || segments.length === 0) {
      return res.status(400).json({ error: "No debate segments available to summarize" });
    }

    const ai = getAI();

    // Prepare a clean text log of the debate for Gemini to analyze
    const transcriptText = segments
      .map((seg: any) => {
        const name = speakers[seg.speakerId]?.label || seg.speakerLabel;
        return `${name}: ${seg.text}`;
      })
      .join("\n\n");

    const speakerList = Object.values(speakers)
      .map((s: any) => `- ${s.label} (${s.id})`)
      .join("\n");

    const prompt = `You are an elite, impartial Socratic debate judge and philosophical analyst. 
Analyze the following complete debate transcript between these participants:
${speakerList}

Here is the transcript:
"""
${transcriptText}
"""

Please perform a deep, comprehensive on-the-fly profiling of EACH speaker based on their actual statements in this transcript.
Compare their speaking volume (quantity of words) with their actual quality, and answer these core philosophical inquiries:
1. Was the person who talked the most actually the correct one? Or were they mostly filling the air with noise?
2. Was the person who used the most complex vocabulary and flowery philosophical terms actually logically sound? Or were they committing sophomore-level sophistry?
3. Who was the most precise, fact-driven speaker, and who was the most useful?
4. What is the ultimate intellectual profile, style, strengths, weaknesses, and conclusion for each participant?

For each speaker, construct a JSON profile containing:
- personalitySummary: A paragraph describing their psychological/philosophical persona in this debate.
- strengths: Array of 3 distinct logical or rhetoric strengths.
- weaknesses: Array of 3 distinct logical flaws, fallacies, or rhetoric weaknesses.
- averageCorrectnessRating: Calculated overall percentage (0-100) of logical/empirical soundness.
- averageComplexity: Evaluated rating (0-100) of vocabulary/concept complexity.
- mostUsedKeywords: 3 to 5 core keywords or philosophical concepts they frequently referred to.
- debateStyle: A creative human label for their style (e.g., "The Rigorous Empiricist", "The Sophomoric Sophist", "The Quiet Rationalist", "The Rhetorical Firebrand", "Socratic Ironist").
- conclusion: A concluding judgment on their contribution.
- conversationalStyle: A concise label characterizing their voice and speaking delivery style (e.g., "Measured, analytical & deeply structured" or "Expressive, dramatic & high-frequency").
- speechPaceText: A brief characterization of their speech rate/tempo based on the flow (e.g., "Fast-paced & energetic", "Deliberate & meditative", "Measured & conversational").
- vocabularyDiversity: An estimated percentage score (0-100) of how diverse their vocabulary choice is in the debate.
- jargonDensity: An estimated percentage score (0-100) of how heavily they rely on technical jargon, slang, or academic terms.
- selfInsightSummary: A deep, constructive, Socratic analysis tailored as a feedback message to the user, highlighting how they can understand themselves better, balance their vocal tone with logic, communicate with greater clarity, and speak more persuasively.

Additionally, provide a 'debateVerdict' object that answers who was the most logical/correct, who talked the most versus who said the most useful things, and summarizes the core intellectual conclusions.

Respond strictly with valid JSON conforming to the requested schema.`;

    // We define a comprehensive schema to get a fully structured, deep response
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            speakerProfiles: {
              type: Type.OBJECT,
              description: "Map of speaker ID to their generated profile",
              properties: {
                sig_alpha: {
                  type: Type.OBJECT,
                  properties: {
                    personalitySummary: { type: Type.STRING },
                    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                    averageCorrectnessRating: { type: Type.INTEGER },
                    averageComplexity: { type: Type.INTEGER },
                    mostUsedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                    debateStyle: { type: Type.STRING },
                    conclusion: { type: Type.STRING },
                    conversationalStyle: { type: Type.STRING },
                    speechPaceText: { type: Type.STRING },
                    vocabularyDiversity: { type: Type.INTEGER },
                    jargonDensity: { type: Type.INTEGER },
                    selfInsightSummary: { type: Type.STRING }
                  },
                  required: [
                    "personalitySummary",
                    "strengths",
                    "weaknesses",
                    "averageCorrectnessRating",
                    "averageComplexity",
                    "mostUsedKeywords",
                    "debateStyle",
                    "conclusion",
                    "conversationalStyle",
                    "speechPaceText",
                    "vocabularyDiversity",
                    "jargonDensity",
                    "selfInsightSummary"
                  ]
                },
                sig_beta: {
                  type: Type.OBJECT,
                  properties: {
                    personalitySummary: { type: Type.STRING },
                    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                    averageCorrectnessRating: { type: Type.INTEGER },
                    averageComplexity: { type: Type.INTEGER },
                    mostUsedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                    debateStyle: { type: Type.STRING },
                    conclusion: { type: Type.STRING },
                    conversationalStyle: { type: Type.STRING },
                    speechPaceText: { type: Type.STRING },
                    vocabularyDiversity: { type: Type.INTEGER },
                    jargonDensity: { type: Type.INTEGER },
                    selfInsightSummary: { type: Type.STRING }
                  },
                  required: [
                    "personalitySummary",
                    "strengths",
                    "weaknesses",
                    "averageCorrectnessRating",
                    "averageComplexity",
                    "mostUsedKeywords",
                    "debateStyle",
                    "conclusion",
                    "conversationalStyle",
                    "speechPaceText",
                    "vocabularyDiversity",
                    "jargonDensity",
                    "selfInsightSummary"
                  ]
                },
                sig_gamma: {
                  type: Type.OBJECT,
                  properties: {
                    personalitySummary: { type: Type.STRING },
                    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                    averageCorrectnessRating: { type: Type.INTEGER },
                    averageComplexity: { type: Type.INTEGER },
                    mostUsedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                    debateStyle: { type: Type.STRING },
                    conclusion: { type: Type.STRING },
                    conversationalStyle: { type: Type.STRING },
                    speechPaceText: { type: Type.STRING },
                    vocabularyDiversity: { type: Type.INTEGER },
                    jargonDensity: { type: Type.INTEGER },
                    selfInsightSummary: { type: Type.STRING }
                  },
                  required: [
                    "personalitySummary",
                    "strengths",
                    "weaknesses",
                    "averageCorrectnessRating",
                    "averageComplexity",
                    "mostUsedKeywords",
                    "debateStyle",
                    "conclusion",
                    "conversationalStyle",
                    "speechPaceText",
                    "vocabularyDiversity",
                    "jargonDensity",
                    "selfInsightSummary"
                  ]
                }
              },
              required: ["sig_alpha", "sig_beta", "sig_gamma"]
            },
            debateVerdict: {
              type: Type.OBJECT,
              properties: {
                mostVolubleSpeaker: { type: Type.STRING, description: "Name of speaker who spoke the most" },
                mostLogicalSpeaker: { type: Type.STRING, description: "Name of speaker who was most logically correct" },
                mostSophisticatedSpeaker: { type: Type.STRING, description: "Name of speaker who used the most complex words" },
                wasVolumeCorrelatedWithTruth: { type: Type.BOOLEAN, description: "Whether the most talkative speaker was actually the most correct" },
                verdictExplanation: { type: Type.STRING, description: "Impartial judge's detailed comparison of volume vs. correctness vs. verbosity" },
                keyPhilosophicalTakeaway: { type: Type.STRING, description: "A summarizing synthesis of the debate's conclusions" }
              },
              required: [
                "mostVolubleSpeaker",
                "mostLogicalSpeaker",
                "mostSophisticatedSpeaker",
                "wasVolumeCorrelatedWithTruth",
                "verdictExplanation",
                "keyPhilosophicalTakeaway"
              ]
            }
          },
          required: ["speakerProfiles", "debateVerdict"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini API during debate summary");
    }

    const data = JSON.parse(resultText.trim());
    return res.json(data);
  } catch (error: any) {
    console.error("Error in /api/summarize-debate:", error);
    return res.status(500).json({ error: error.message || "Failed to summarize debate" });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  }).then((vite) => {
    app.use(vite.middlewares);
    
    // Fallback static files serving in case Vite misses some files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));

    // Handle SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "index.html"));
    });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[DEV] Server running on http://localhost:${PORT}`);
    });
  });
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  
  // Handle SPA fallback
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PROD] Server running on port ${PORT}`);
  });
}
