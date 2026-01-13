"use client";

import type { Strategy } from "@/app/page";

interface StrategyOutputProps {
  strategy: Strategy;
  onReset: () => void;
}

export default function StrategyOutput({ strategy, onReset }: StrategyOutputProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Marketing Strategy
        </h2>
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
        >
          Start Over
        </button>
      </div>

      {/* Executive Summary */}
      <Section title="Executive Summary">
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
          {strategy.executiveSummary}
        </p>
      </Section>

      {/* Target Audience */}
      <Section title="Target Audience">
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
          {strategy.targetAudience}
        </p>
      </Section>

      {/* Key Insights */}
      <Section title="Key Insights">
        <ul className="space-y-3">
          {strategy.keyInsights.map((insight, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-medium">
                {index + 1}
              </span>
              <span className="text-slate-700 dark:text-slate-300">{insight}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Content Strategy */}
      <Section title="Content Strategy">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-3">Content Pillars</h4>
            <ul className="space-y-2">
              {strategy.contentStrategy.pillars.map((pillar, index) => (
                <li key={index} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {pillar}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-3">Themes</h4>
            <ul className="space-y-2">
              {strategy.contentStrategy.themes.map((theme, index) => (
                <li key={index} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {theme}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-3">Formats</h4>
            <ul className="space-y-2">
              {strategy.contentStrategy.formats.map((format, index) => (
                <li key={index} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  {format}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Channel Strategy */}
      <Section title="Channel Strategy">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-3">Primary Channels</h4>
            <div className="flex flex-wrap gap-2">
              {strategy.channelStrategy.primary.map((channel, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
                >
                  {channel}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-3">Secondary Channels</h4>
            <div className="flex flex-wrap gap-2">
              {strategy.channelStrategy.secondary.map((channel, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm font-medium"
                >
                  {channel}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Messaging Framework */}
      <Section title="Messaging Framework">
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-2">Value Proposition</h4>
            <p className="text-slate-700 dark:text-slate-300 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border-l-4 border-blue-500">
              {strategy.messagingFramework.valueProposition}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-3">Key Messages</h4>
            <ul className="space-y-2">
              {strategy.messagingFramework.keyMessages.map((message, index) => (
                <li key={index} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                  <span className="text-blue-500 mt-1">&#8594;</span>
                  {message}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-2">Tone of Voice</h4>
            <p className="text-slate-700 dark:text-slate-300">{strategy.messagingFramework.toneOfVoice}</p>
          </div>
        </div>
      </Section>

      {/* Quick Wins & Long Term */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Quick Wins">
          <ul className="space-y-3">
            {strategy.quickWins.map((win, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 text-green-500 mt-0.5">&#10003;</span>
                <span className="text-slate-700 dark:text-slate-300">{win}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Long-Term Initiatives">
          <ul className="space-y-3">
            {strategy.longTermInitiatives.map((initiative, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 text-purple-500 mt-0.5">&#9679;</span>
                <span className="text-slate-700 dark:text-slate-300">{initiative}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {/* KPIs */}
      <Section title="Key Performance Indicators">
        <div className="flex flex-wrap gap-3">
          {strategy.kpis.map((kpi, index) => (
            <span
              key={index}
              className="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm"
            >
              {kpi}
            </span>
          ))}
        </div>
      </Section>

      {/* Export Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={() => {
            const content = JSON.stringify(strategy, null, 2);
            const blob = new Blob([content], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "marketing-strategy.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition"
        >
          Export Strategy
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}
