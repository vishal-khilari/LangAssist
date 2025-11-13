require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const axios = require("axios");
const FormData = require("form-data");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Configuration
const CONFIG = {
  GEMINI_API_KEY: "AIzaSyDCIldmBlCOaG4eh6Fe1VMAZ_L_ElwZesI",
  ASSEMBLYAI_API_KEY: "9d011498d08f41b7af187061499554f8",
  CLOUDINARY_CLOUD_NAME: "dbi20wt1c",
  CLOUDINARY_UPLOAD_PRESET: "n8n_unsigned",
  PORT: 3000,
};

const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-api-key"],
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.static("public")); // Serve your HTML file from here

// Handle OPTIONS preflight request
app.options("/webhook/langassist", cors());

// Main webhook endpoint
app.post("/webhook/langassist", upload.single("file"), async (req, res) => {
  // Add CORS headers explicitly
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  try {
    // Handle ping test
    if (req.body.ping) {
      return res.json({ status: "ok", message: "Connection successful" });
    }

    const section =
      req.body.section ||
      (req.body.payload ? JSON.parse(req.body.payload).section : "Unknown");

    console.log(`Processing request for section: ${section}`);

    if (section === "Text Assist") {
      return await handleTextAssist(req, res);
    } else if (section === "Voice Assistant") {
      return await handleVoiceAssistant(req, res);
    } else if (section === "Practice Mode") {
      return await handlePracticeMode(req, res);
    } else {
      res.status(400).json({ error: "Unknown section" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 1. TEXT ASSIST HANDLER
async function handleTextAssist(req, res) {
  const { action, tone, inputLang, targetLang, text } = req.body;

  const systemPrompt = `System Prompt for AI Agent
You are an AI-Based Language Assistant.

Your Tasks:
Translate
Grammar Correction
Summarize
Explain
Rephrase

Output Rules:
Always perform the action exactly as requested.
Respond in the requested tone/style: Neutral, Formal, Casual, Professional, or Friendly.
Use the input language when specified.
Deliver the result in the target language chosen by the user.
Return output only in JSON format with one field: "result".
Do not include explanations, notes, or formatting outside JSON.

Variables:
Action: ${action}
Tone/Style: ${tone}
Input Language: ${inputLang}
Target Language: ${targetLang}
Text to Process: ${text}

Expected Output Format:
{
  "result": "processed text here"
}`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    console.log("Sending to Gemini:", {
      action,
      tone,
      inputLang,
      targetLang,
      textLength: text.length,
    });

    const result = await model.generateContent([systemPrompt, text]);
    const response = await result.response;
    const responseText = response.text();

    console.log("Gemini response:", responseText);

    // Try to parse JSON response
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(responseText);
    } catch (e) {
      // If not valid JSON, wrap it
      jsonResponse = { result: responseText };
    }

    res.json(jsonResponse.result);
  } catch (error) {
    console.error("Gemini API Full Error:", error.message);
    console.error("Error details:", JSON.stringify(error, null, 2));
    res.status(500).json({ error: error.message || "Failed to process text" });
  }
}

// 2. VOICE ASSISTANT HANDLER
async function handleVoiceAssistant(req, res) {
  try {
    let audioBuffer;

    // Get audio from file upload or base64
    if (req.file) {
      audioBuffer = req.file.buffer;
    } else if (req.body.file && req.body.file.base64) {
      audioBuffer = Buffer.from(req.body.file.base64, "base64");
    } else {
      return res.status(400).json({ error: "No audio file provided" });
    }

    // Step 1: Upload to Cloudinary
    const cloudinaryUrl = await uploadToCloudinary(audioBuffer);

    // Step 2: Transcribe with AssemblyAI
    const transcription = await transcribeAudio(cloudinaryUrl);

    // Step 3: Process with AI
    const aiResponse = await processWithAI(transcription);

    // Step 4: Generate TTS audio
    const audioData = await generateTTS(aiResponse);

    res.json({
      file: {
        data: audioData,
        mimeType: "audio/mpeg",
        fileName: "response.mp3",
      },
    });
  } catch (error) {
    console.error("Voice Assistant Error:", error);
    res.status(500).json({ error: error.message });
  }
}

// 3. PRACTICE MODE HANDLER
async function handlePracticeMode(req, res) {
  try {
    const targetText = req.body.text;
    let audioBuffer;

    if (req.file) {
      audioBuffer = req.file.buffer;
    } else if (req.body.file && req.body.file.base64) {
      audioBuffer = Buffer.from(req.body.file.base64, "base64");
    } else {
      return res.status(400).json({ error: "No audio file provided" });
    }

    // Upload and transcribe
    const cloudinaryUrl = await uploadToCloudinary(audioBuffer);
    const transcription = await transcribeAudio(cloudinaryUrl);

    // Evaluate pronunciation
    const evaluation = await evaluatePronunciation(targetText, transcription);

    res.json(evaluation);
  } catch (error) {
    console.error("Practice Mode Error:", error);
    res.status(500).json({ error: error.message });
  }
}

// HELPER FUNCTIONS

async function uploadToCloudinary(audioBuffer) {
  const formData = new FormData();
  const base64Audio = audioBuffer.toString("base64");

  formData.append("file", `data:audio/mpeg;base64,${base64Audio}`);
  formData.append("upload_preset", CONFIG.CLOUDINARY_UPLOAD_PRESET);
  formData.append("resource_type", "video");

  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD_NAME}/video/upload`,
    formData,
    { headers: formData.getHeaders() }
  );

  return response.data.url;
}

async function transcribeAudio(audioUrl) {
  // Start transcription
  const transcriptResponse = await axios.post(
    "https://api.assemblyai.com/v2/transcript",
    { audio_url: audioUrl },
    { headers: { Authorization: CONFIG.ASSEMBLYAI_API_KEY } }
  );

  const transcriptId = transcriptResponse.data.id;

  // Poll for completion
  let transcript;
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const statusResponse = await axios.get(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      { headers: { Authorization: CONFIG.ASSEMBLYAI_API_KEY } }
    );

    transcript = statusResponse.data;

    if (transcript.status === "completed") {
      return transcript.text;
    } else if (transcript.status === "error") {
      throw new Error("Transcription failed");
    }
  }

  throw new Error("Transcription timeout");
}

async function processWithAI(text) {
  const systemPrompt = `You are a Professional Language Teaching Assistant.

Your primary role:
- Act like a friendly teacher for the user's language (detected from their input).
- Help the user with grammar, vocabulary, spelling, and pronunciation.
- Correct mistakes clearly and explain the corrections with examples.
- Adapt to the language used in the user's input.
- Encourage the learner and provide supportive tips to improve.

Secondary role:
- If the user asks something unrelated to language (general knowledge, casual chat, friendly talk, etc.), 
  respond normally and helpfully, like a polite assistant.

Always reply in a way that is:
- Accurate
- Easy to understand
- Supportive and encouraging`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent([systemPrompt, text]);
  const response = await result.response;
  return response.text();
}

async function generateTTS(text) {
  // Split text into chunks (max 180 chars)
  const chunks = text.match(/.{1,180}(?=\s|$)/g) || [text];
  const audioChunks = [];

  for (const chunk of chunks) {
    const params = new URLSearchParams({
      ie: "UTF-8",
      q: chunk.trim(),
      tl: "en",
      client: "tw-ob",
    });

    const response = await axios.get(
      `https://translate.google.com/translate_tts?${params}`,
      { responseType: "arraybuffer" }
    );

    audioChunks.push(Buffer.from(response.data));
  }

  // Merge audio chunks
  const mergedAudio = Buffer.concat(audioChunks);
  return mergedAudio.toString("base64");
}

async function evaluatePronunciation(targetText, pronouncedText) {
  const systemPrompt = `You are a Language Pronunciation Evaluation Assistant.  
Your task is to compare the text that the user was supposed to pronounce with the text that was actually spoken (transcribed from audio).  

Inputs:  
- Text to pronounce: ${targetText}
- Pronounced (transcribed): ${pronouncedText}

Instructions:  
1. Compare both texts word by word.  
2. Highlight words that were missed, added, or mispronounced.  
3. Give a short feedback summary (e.g., "Good attempt, but a few missing words" or "Accurate pronunciation overall").  
4. Provide a **score out of 10** for pronunciation accuracy.  
5. Be concise and clear so the user understands their mistakes easily.  

Output Format (JSON):  
{
  "target_text": "...",
  "pronounced_text": "...",
  "accuracy": "...%",
  "mistakes": [{"expected": "...", "said": "...", "feedback": "..."}],
  "feedback": "short summary",
  "score": "X/10"
}`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent([
    systemPrompt,
    `Text to pronounce: ${targetText}\npronounced: ${pronouncedText}`,
  ]);

  const response = await result.response;
  const responseText = response.text();

  try {
    return JSON.parse(responseText);
  } catch (e) {
    return { feedback: responseText, score: "N/A" };
  }
}
// Test endpoint
app.get("/webhook/langassist", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

app.post("/webhook/langassist/test", (req, res) => {
  res.json({ status: "ok", message: "Connection successful" });
});

// Test endpoint to list models
app.get("/test-models", async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    res.json({ message: "Try gemini-2.5-flash first" });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.listen(CONFIG.PORT, () => {
  console.log(`Server running on http://localhost:${CONFIG.PORT}`);
});