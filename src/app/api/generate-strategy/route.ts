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

function convertToFetchableUrl(url: string): string {
  // Google Docs - convert to export URL
  const docsMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch) {
    return `https://docs.google.com/document/d/${docsMatch[1]}/export?format=txt`;
  }

  // Google Slides - convert to export URL
  const slidesMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slidesMatch) {
    return `https://docs.google.com/presentation/d/${slidesMatch[1]}/export?format=txt`;
  }

  // Google Drive file - convert to direct download
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }

  // Fathom - extract the call ID for API fetch
  if (url.includes("fathom.video")) {
    // Extract call ID from various Fathom URL formats
    // e.g., https://fathom.video/share/abc123 or https://fathom.video/call/abc123
    const fathomMatch = url.match(/fathom\.video\/(?:share|call|recording)\/([a-zA-Z0-9_-]+)/);
    if (fathomMatch) {
      return `FATHOM:${fathomMatch[1]}`;
    }
    return `FATHOM_INVALID:${url}`;
  }

  return url;
}

async function fetchFathomTranscript(shareId: string): Promise<string> {
  const apiKey = process.env.FATHOM_API_KEY;

  if (!apiKey) {
    throw new Error("Fathom API key not configured. Add FATHOM_API_KEY to your environment variables.");
  }

  // Try multiple endpoint formats since share ID might differ from call ID
  const endpoints = [
    `https://api.fathom.ai/external/v1/share/${shareId}/transcript`,
    `https://api.fathom.ai/external/v1/calls/${shareId}/transcript`,
    `https://api.fathom.ai/external/v1/recordings/${shareId}/transcript`,
    `https://api.fathom.ai/external/v1/calls/${shareId}`,
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Trying Fathom endpoint: ${endpoint}`);
      const response = await fetch(endpoint, {
        headers: {
          "X-Api-Key": apiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Fathom API success:", JSON.stringify(data).slice(0, 200));

        // If this is a call object with transcript field
        if (data.transcript) {
          return formatFathomTranscript(data.transcript);
        }
        return formatFathomTranscript(data);
      }
      console.log(`Endpoint ${endpoint} returned ${response.status}`);
    } catch (e) {
      console.log(`Endpoint ${endpoint} failed:`, e);
    }
  }

  // If none worked, try to list recent calls and find matching one
  try {
    const listResponse = await fetch(`https://api.fathom.ai/external/v1/calls?include_transcript=true&limit=20`, {
      headers: {
        "X-Api-Key": apiKey,
      },
    });

    if (listResponse.ok) {
      const calls = await listResponse.json();
      console.log("Got calls list, searching for match...");

      // Look through recent calls for one that might match
      if (Array.isArray(calls)) {
        for (const call of calls) {
          if (call.share_url?.includes(shareId) || call.id === shareId) {
            if (call.transcript) {
              return formatFathomTranscript(call.transcript);
            }
          }
        }
      }
    }
  } catch (e) {
    console.log("List calls failed:", e);
  }

  throw new Error(`Could not fetch transcript for share ID: ${shareId}. The share link ID may not be accessible via API. Try using the call ID from your Fathom dashboard or paste the transcript directly.`);
}

function formatFathomTranscript(data: unknown): string {
  // Handle different response formats
  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    // Array of transcript entries with speaker, text, timestamp
    return data.map((entry: { speaker?: { display_name?: string }; text?: string; timestamp?: string }) => {
      const speaker = entry.speaker?.display_name || 'Speaker';
      const text = entry.text || '';
      const timestamp = entry.timestamp || '';
      return `[${timestamp}] ${speaker}: ${text}`;
    }).join('\n');
  }

  if (data && typeof data === 'object' && 'transcript' in data) {
    const transcript = (data as { transcript: unknown }).transcript;
    if (typeof transcript === 'string') {
      return transcript;
    }
    if (Array.isArray(transcript)) {
      return formatFathomTranscript(transcript);
    }
  }

  // Fallback: stringify the response
  return JSON.stringify(data, null, 2);
}

async function fetchLinkContent(url: string): Promise<string> {
  const fetchUrl = convertToFetchableUrl(url);

  // Special handling for Fathom links
  if (fetchUrl.startsWith("FATHOM:")) {
    const callId = fetchUrl.replace("FATHOM:", "");
    try {
      return await fetchFathomTranscript(callId);
    } catch (error) {
      console.error("Fathom API error:", error);
      return `[Could not fetch Fathom transcript. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please paste the transcript directly.]`;
    }
  }

  if (fetchUrl.startsWith("FATHOM_INVALID:")) {
    return `[Invalid Fathom URL format. Please use a link like fathom.video/share/xxx or paste the transcript directly.]`;
  }

  const response = await fetch(fetchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    // Provide helpful error messages
    if (url.includes("google.com")) {
      throw new Error(`Google link not accessible. Make sure sharing is set to "Anyone with the link can view"`);
    }
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  // If it's plain text (like Google Docs export), return as-is
  if (contentType.includes("text/plain")) {
    return text.slice(0, 20000);
  }

  // Extract text content - strip HTML tags
  const textContent = text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20000);

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
