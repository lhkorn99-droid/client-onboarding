"use client";

import { useState } from "react";
import OnboardingForm from "@/components/OnboardingForm";
import StrategyOutput from "@/components/StrategyOutput";

export interface OnboardingData {
  meetingRecording: {
    type: "file" | "transcript" | "link";
    content: string | File;
  } | null;
  auditDeck: File | null;
  auditLink: string;
  websiteUrl: string;
  socialProfile: string;
  clientName: string;
  industry: string;
}

export interface Strategy {
  executiveSummary: string;
  targetAudience: string;
  keyInsights: string[];
  contentStrategy: {
    pillars: string[];
    themes: string[];
    formats: string[];
  };
  channelStrategy: {
    primary: string[];
    secondary: string[];
  };
  messagingFramework: {
    valueProposition: string;
    keyMessages: string[];
    toneOfVoice: string;
  };
  quickWins: string[];
  longTermInitiatives: string[];
  kpis: string[];
}

export default function Home() {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: OnboardingData) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("clientName", data.clientName);
      formData.append("industry", data.industry);
      formData.append("websiteUrl", data.websiteUrl);
      formData.append("socialProfile", data.socialProfile);

      if (data.meetingRecording) {
        formData.append("meetingRecordingType", data.meetingRecording.type);
        if (data.meetingRecording.type === "file" && data.meetingRecording.content instanceof File) {
          formData.append("meetingRecordingFile", data.meetingRecording.content);
        } else if (typeof data.meetingRecording.content === "string") {
          formData.append("meetingRecordingContent", data.meetingRecording.content);
        }
      }

      if (data.auditDeck) {
        formData.append("auditDeck", data.auditDeck);
      }

      if (data.auditLink) {
        formData.append("auditLink", data.auditLink);
      }

      const response = await fetch("/api/generate-strategy", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate strategy");
      }

      const result = await response.json();
      setStrategy(result.strategy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStrategy(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Client Onboarding
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Share your client information and we&apos;ll generate a comprehensive marketing strategy
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {!strategy ? (
          <OnboardingForm onSubmit={handleSubmit} isLoading={isLoading} />
        ) : (
          <StrategyOutput strategy={strategy} onReset={handleReset} />
        )}
      </main>
    </div>
  );
}
