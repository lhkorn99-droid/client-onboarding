import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Lazy initialization to avoid build-time errors
let anthropic: Anthropic | null = null;

/**
 * Attempts to read the API key from CLI credential files.
 * Supports both Claude Code (~/.claude/) and Anthropic CLI (~/.anthropic/) credential locations.
 */
function getCliApiKey(): string | null {
  const homeDir = os.homedir();
  const credentialPaths = [
    // Claude Code (clawdbot) credential locations
    path.join(homeDir, ".claude", "credentials.json"),
    path.join(homeDir, ".claude", "config.json"),
    path.join(homeDir, ".claude", "auth.json"),
    // Anthropic CLI credential locations
    path.join(homeDir, ".anthropic", "credentials.json"),
    path.join(homeDir, ".config", "anthropic", "credentials.json"),
    path.join(homeDir, ".anthropic", "auth.json"),
    path.join(homeDir, ".config", "anthropic", "auth.json"),
  ];

  for (const credPath of credentialPaths) {
    try {
      if (fs.existsSync(credPath)) {
        const content = fs.readFileSync(credPath, "utf-8");
        const credentials = JSON.parse(content);
        // Check common credential field names used by various CLI tools
        const apiKey =
          credentials.api_key ||
          credentials.apiKey ||
          credentials.anthropic_api_key ||
          credentials.key ||
          credentials.claudeApiKey ||
          credentials.token;
        if (apiKey) {
          console.log(`Loaded API key from CLI credentials: ${credPath}`);
          return apiKey;
        }
      }
    } catch (error) {
      console.warn(`Failed to read credentials from ${credPath}:`, error);
    }
  }

  return null;
}

function getAnthropic() {
  if (!anthropic) {
    // Priority: 1. Environment variable, 2. CLI credentials file
    let apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      apiKey = getCliApiKey() || undefined;
    }

    if (!apiKey) {
      throw new Error(
        "Anthropic API key not found. Please set ANTHROPIC_API_KEY environment variable " +
        "or authenticate via the Claude CLI (run 'claude login' or 'anthropic auth login')."
      );
    }

    anthropic = new Anthropic({
      apiKey,
    });
  }
  return anthropic;
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

  return url;
}

async function fetchLinkContent(url: string): Promise<string> {
  const fetchUrl = convertToFetchableUrl(url);

  const response = await fetch(fetchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!response.ok) {
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

    // Process meeting transcript
    if (meetingRecordingType === "transcript" && meetingRecordingContent) {
      collectedData.meetingTranscript = meetingRecordingContent;
    }

    // Process audit deck - first try link, then fall back to file
    if (auditLink) {
      try {
        console.log("Fetching audit link:", auditLink);
        const content = await fetchLinkContent(auditLink);
        console.log("Audit content fetched, length:", content.length, "chars");
        console.log("Audit content preview:", content.slice(0, 500));
        collectedData.auditDeckContent = content;
      } catch (error) {
        console.error("Error fetching audit link:", error);
        collectedData.auditDeckContent = `[Could not fetch content from: ${auditLink}. Make sure sharing is set to "Anyone with the link can view"]`;
      }
    } else if (auditDeck) {
      try {
        const arrayBuffer = await auditDeck.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (auditDeck.name.endsWith(".pdf")) {
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

    // Fetch website content
    if (websiteUrl) {
      try {
        const response = await fetch(websiteUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; MarketingStrategyBot/1.0)",
          },
        });
        const html = await response.text();
        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 10000);
        collectedData.websiteContent = textContent;
      } catch (error) {
        console.error("Error fetching website:", error);
        collectedData.websiteContent = "[Error fetching website content]";
      }
    }

    // For social profiles, note the URL
    if (socialProfile) {
      collectedData.socialContent = `[Social profile URL provided: ${socialProfile}]`;
    }

    // Generate strategy using Claude
    const strategy = await generateStrategy(collectedData);

    return NextResponse.json({ strategy });
  } catch (error) {
    console.error("Error generating strategy:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Check for authentication-related errors
    const isAuthError =
      errorMessage.includes("API key") ||
      errorMessage.includes("authentication") ||
      errorMessage.includes("401") ||
      errorMessage.includes("Unauthorized") ||
      errorMessage.includes("invalid_api_key");

    if (isAuthError) {
      return NextResponse.json(
        {
          error: "Authentication failed. Please check your Anthropic API key configuration.",
          details: errorMessage,
          help: "Set ANTHROPIC_API_KEY environment variable or run 'claude login' to authenticate via CLI."
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: `Failed to generate strategy: ${errorMessage}` },
      { status: 500 }
    );
  }
}

async function generateStrategy(data: CollectedData) {
  // Truncate content to avoid token limits
  const truncate = (text: string | null, maxLen: number) => {
    if (!text) return null;
    return text.length > maxLen ? text.slice(0, maxLen) + "... [truncated]" : text;
  };

  const meetingTranscript = truncate(data.meetingTranscript, 15000);
  const auditDeckContent = truncate(data.auditDeckContent, 15000);
  const websiteContent = truncate(data.websiteContent, 8000);

  console.log("Content lengths - Transcript:", meetingTranscript?.length || 0,
              "Audit:", auditDeckContent?.length || 0,
              "Website:", websiteContent?.length || 0);

  const prompt = `You are a senior marketing strategist. Based on the following client information, create a comprehensive marketing strategy.

## Client Information
- **Client Name:** ${data.clientName}
- **Industry:** ${data.industry}

## Meeting Notes/Transcript
${meetingTranscript || "No meeting transcript provided"}

## Audit Deck Content
${auditDeckContent || "No audit deck provided"}

## Website Content
${websiteContent || "No website content available"}

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
    console.error("Failed to parse strategy JSON. Response was:", textContent.text.slice(0, 500));
    throw new Error(`Invalid strategy format from AI. Response started with: ${textContent.text.slice(0, 100)}`);
  }
}
