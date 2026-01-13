import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// Lazy initialization to avoid build-time errors
let anthropic: Anthropic | null = null;
let openai: OpenAI | null = null;

function getAnthropic() {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

async function fetchLinkContent(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MarketingStrategyBot/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const html = await response.text();

  // Extract text content - strip HTML tags
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15000); // Limit content

  return textContent;
}

interface CollectedData {
  clientName: string;
  industry: string;
  websiteUrl: string;
  socialProfile: string;
  meetingTranscript: string | null;
  auditDeckContent: string | null;
  websiteContent: string | null;
  socialContent: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const clientName = formData.get("clientName") as string;
    const industry = formData.get("industry") as string;
    const websiteUrl = formData.get("websiteUrl") as string;
    const socialProfile = formData.get("socialProfile") as string;
    const meetingRecordingType = formData.get("meetingRecordingType") as string | null;
    const meetingRecordingContent = formData.get("meetingRecordingContent") as string | null;
    const meetingRecordingFile = formData.get("meetingRecordingFile") as File | null;
    const auditDeck = formData.get("auditDeck") as File | null;
    const auditLink = formData.get("auditLink") as string | null;

    // Collect all data
    const collectedData: CollectedData = {
      clientName,
      industry,
      websiteUrl,
      socialProfile,
      meetingTranscript: null,
      auditDeckContent: null,
      websiteContent: null,
      socialContent: null,
    };

    // Process meeting recording
    if (meetingRecordingType === "transcript" && meetingRecordingContent) {
      collectedData.meetingTranscript = meetingRecordingContent;
    } else if (meetingRecordingType === "link" && meetingRecordingContent) {
      // Fetch content from the link
      try {
        const content = await fetchLinkContent(meetingRecordingContent);
        collectedData.meetingTranscript = content;
      } catch (error) {
        console.error("Error fetching transcript link:", error);
        collectedData.meetingTranscript = `[Could not fetch content from: ${meetingRecordingContent}]`;
      }
    } else if (meetingRecordingType === "file" && meetingRecordingFile) {
      // Transcribe audio/video using Whisper
      try {
        const arrayBuffer = await meetingRecordingFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Create a File object for OpenAI
        const file = new File([buffer], meetingRecordingFile.name, {
          type: meetingRecordingFile.type,
        });

        const transcription = await getOpenAI().audio.transcriptions.create({
          file: file,
          model: "whisper-1",
        });

        collectedData.meetingTranscript = transcription.text;
      } catch (error) {
        console.error("Error transcribing audio:", error);
        collectedData.meetingTranscript = "[Error transcribing audio file]";
      }
    }

    // Process audit deck - first try link, then fall back to file
    if (auditLink) {
      try {
        const content = await fetchLinkContent(auditLink);
        collectedData.auditDeckContent = content;
      } catch (error) {
        console.error("Error fetching audit link:", error);
        collectedData.auditDeckContent = `[Could not fetch content from: ${auditLink}]`;
      }
    } else if (auditDeck) {
      try {
        const arrayBuffer = await auditDeck.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (auditDeck.name.endsWith(".pdf")) {
          // Dynamic import for pdf-parse
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require("pdf-parse");
          const pdfData = await pdfParse(buffer);
          collectedData.auditDeckContent = pdfData.text;
        } else {
          collectedData.auditDeckContent = `[File uploaded: ${auditDeck.name}]`;
        }
      } catch (error) {
        console.error("Error processing audit deck:", error);
        collectedData.auditDeckContent = "[Error processing audit deck]";
      }
    }

    // Fetch website content (simple fetch)
    if (websiteUrl) {
      try {
        const response = await fetch(websiteUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; MarketingStrategyBot/1.0)",
          },
        });
        const html = await response.text();
        // Extract text content (basic - strip HTML tags)
        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 10000); // Limit content
        collectedData.websiteContent = textContent;
      } catch (error) {
        console.error("Error fetching website:", error);
        collectedData.websiteContent = "[Error fetching website content]";
      }
    }

    // For social profiles, we'd need specific API integrations
    if (socialProfile) {
      collectedData.socialContent = `[Social profile URL provided: ${socialProfile}]`;
    }

    // Generate strategy using Claude
    const strategy = await generateStrategy(collectedData);

    return NextResponse.json({ strategy });
  } catch (error) {
    console.error("Error generating strategy:", error);
    return NextResponse.json(
      { error: "Failed to generate strategy" },
      { status: 500 }
    );
  }
}

async function generateStrategy(data: CollectedData) {
  const prompt = `You are a senior marketing strategist. Based on the following client information, create a comprehensive marketing strategy.

## Client Information
- **Client Name:** ${data.clientName}
- **Industry:** ${data.industry}

## Meeting Notes/Transcript
${data.meetingTranscript || "No meeting transcript provided"}

## Audit Deck Content
${data.auditDeckContent || "No audit deck provided"}

## Website Content
${data.websiteContent || "No website content available"}

## Social Media Presence
${data.socialContent || "No social profile information available"}

---

Based on all the above information, create a detailed marketing strategy. You must respond with ONLY a valid JSON object (no markdown, no code blocks, just raw JSON) in the following format:

{
  "executiveSummary": "A 2-3 paragraph executive summary of the recommended marketing strategy",
  "targetAudience": "Detailed description of the ideal target audience based on the information provided",
  "keyInsights": ["insight 1", "insight 2", "insight 3", "insight 4", "insight 5"],
  "contentStrategy": {
    "pillars": ["pillar 1", "pillar 2", "pillar 3"],
    "themes": ["theme 1", "theme 2", "theme 3", "theme 4"],
    "formats": ["format 1", "format 2", "format 3", "format 4"]
  },
  "channelStrategy": {
    "primary": ["channel 1", "channel 2"],
    "secondary": ["channel 3", "channel 4"]
  },
  "messagingFramework": {
    "valueProposition": "Clear value proposition statement",
    "keyMessages": ["message 1", "message 2", "message 3"],
    "toneOfVoice": "Description of recommended tone of voice"
  },
  "quickWins": ["quick win 1", "quick win 2", "quick win 3"],
  "longTermInitiatives": ["initiative 1", "initiative 2", "initiative 3"],
  "kpis": ["KPI 1", "KPI 2", "KPI 3", "KPI 4", "KPI 5"]
}

Make the strategy specific, actionable, and tailored to the client's industry and the information provided. If certain information is missing, make reasonable assumptions based on the industry.`;

  const message = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  // Extract the text content
  const textContent = message.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse the JSON response
  try {
    const strategy = JSON.parse(textContent.text);
    return strategy;
  } catch {
    console.error("Failed to parse strategy JSON:", textContent.text);
    throw new Error("Invalid strategy format from AI");
  }
}
