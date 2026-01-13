"use client";

import { useState } from "react";
import type { OnboardingData } from "@/app/page";
import FileUpload from "./FileUpload";

interface OnboardingFormProps {
  onSubmit: (data: OnboardingData) => void;
  isLoading: boolean;
}

export default function OnboardingForm({ onSubmit, isLoading }: OnboardingFormProps) {
  const [clientName, setClientName] = useState("");
  const [industry, setIndustry] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [socialProfile, setSocialProfile] = useState("");
  const [transcript, setTranscript] = useState("");
  const [auditLink, setAuditLink] = useState("");
  const [auditDeck, setAuditDeck] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let meetingRecording: OnboardingData["meetingRecording"] = null;

    if (transcript.trim()) {
      meetingRecording = { type: "transcript", content: transcript };
    }

    onSubmit({
      clientName,
      industry,
      websiteUrl,
      socialProfile,
      meetingRecording,
      auditDeck,
      auditLink,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Client Info Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Client Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Client Name *
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Acme Corp"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Industry *
            </label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="SaaS, E-commerce, Healthcare..."
            />
          </div>
        </div>
      </div>

      {/* Meeting Transcript Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Meeting Transcript
        </h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Paste Transcript
          </label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition min-h-[200px]"
            placeholder="Paste your meeting transcript here (from Fathom, Zoom, Otter, etc.)..."
          />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Tip: In Fathom, open your recording and click &quot;Copy Transcript&quot;
          </p>
        </div>
      </div>

      {/* Audit Deck Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Audit Deck
        </h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Google Slides / Docs Link
            </label>
            <input
              type="url"
              value={auditLink}
              onChange={(e) => setAuditLink(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="https://docs.google.com/presentation/d/..."
            />
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Set sharing to &quot;Anyone with the link can view&quot;
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Or Upload PDF
            </label>
            <FileUpload
              accept=".pdf"
              file={auditDeck}
              onFileChange={setAuditDeck}
              label="Upload audit deck PDF"
            />
          </div>
        </div>
      </div>

      {/* Online Presence Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Online Presence
        </h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Website URL
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Social Profile URL
            </label>
            <input
              type="url"
              value={socialProfile}
              onChange={(e) => setSocialProfile(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="https://linkedin.com/company/... or https://twitter.com/..."
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !clientName || !industry}
        className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating Strategy...
          </span>
        ) : (
          "Generate Marketing Strategy"
        )}
      </button>
    </form>
  );
}
