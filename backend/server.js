import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// --- Pollinations.ai Integration ---

async function generateTextPollinations(prompt) {
    // Pollinations Text API (Simple GET/POST)
    // We construct a URL-safe prompt
    const cleanPrompt = prompt.replace(/[^\w\s,.?!]/g, ' ').substring(0, 1000); // safety cap
    const url = `https://text.pollinations.ai/${encodeURIComponent(cleanPrompt)}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Pollinations Service Busy");
    const text = await response.text();
    return text;
}

async function generateImagePollinations(prompt) {
    // Pollinations Image API
    const cleanPrompt = prompt.replace(/[^\w\s,.?!]/g, ' ').substring(0, 200);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}`;
    
    // We verify it works by fetching head, but usually we just return the URL
    // since the frontend can load the URL directly.
    return url; 
}

// Fallback logic if everything breaks
function fallbackStory(userInput) {
    return "The winds of fate shift... (Simulated Response: The connection was weak, but the story moves forward. Please try again or describe what happens next!)";
}

// --- Endpoints ---

app.post('/api/generate', async (req, res) => {
    try {
        const { userInput, context, config, image } = req.body;
        
        // Context Building
        const genre = config?.genre || 'fantasy';
        const tone = config?.tone || 'adventurous';
        
        let prompt = `Write the NEXT SHORT PARAGRAPH (3 sentences) of a ${genre} story in a ${tone} tone.`;
        if (context) prompt += ` Story so far: ${context.substring(context.length - 500)}.`;
        if (userInput) prompt += ` Action: ${userInput}.`;
        if (image) prompt += ` (Incorporate a visual element based on an uploaded image).`;
        
        console.log("Asking Pollinations API...");
        let text = await generateTextPollinations(prompt);
        
        // Basic cleanup
        if (!text || text.length < 5) text = fallbackStory();
        
        res.json({ text });

    } catch (error) {
        console.error("Text Gen Error:", error.message);
        // "Flawless" mode: return a safe fallback instead of an error
        res.json({ text: fallbackStory() });
    }
});

app.post('/api/generate-cover', async (req, res) => {
    try {
        const { storyText, config } = req.body;
        const prompt = `Cover art for a ${config?.genre} story, masterpiece, 8k, ${storyText.substring(0, 50)}`;
        
        const imageUrl = await generateImagePollinations(prompt);
        // Pollinations URLs are valid images directly. 
        // We can output this directly.
        
        console.log("Generated Cover URL:", imageUrl);
        res.json({ imageUrl });

    } catch (error) {
        console.error("Cover Error:", error.message);
        res.json({ imageUrl: null, error: "Image Gen Failed" });
    }
});

app.post('/api/generate-title', async (req, res) => {
    try {
        const { storyText } = req.body;
        const prompt = `Create a short title for a story about: ${storyText.substring(0, 100)}`;
        const title = await generateTextPollinations(prompt);
        res.json({ title: title.replace(/['"]/g, '').trim() });
    } catch (e) {
        res.json({ title: "The Unnamed Adventure" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (Pollinations.ai Mode)`);
});