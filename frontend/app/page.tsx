"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type Difficulty = "Easy" | "Medium" | "Hard";
type CoverageRow = [string, string, string, number];

export default function Home() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"clusters" | "coverage">("clusters");
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(
    new Set()
  );

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      setError("Please select at least one PDF file");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("http://127.0.0.1:8000/upload-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Upload failed");
      }

      const data = await response.json();
      setResult(data);
      setExpandedClusters(new Set());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyData = () => {
    if (!result) return [];

    const counts: Record<Difficulty, number> = {
      Easy: 0,
      Medium: 0,
      Hard: 0,
    };

    result.clusters.forEach((cluster: any) => {
      cluster.questions.forEach((q: any) => {
        const level = q.difficulty as Difficulty;
        counts[level]++;
      });
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const getPdfData = () => {
    if (!result) return [];
    const pdfCounts: Record<string, number> = {};

    result.clusters.forEach((cluster: any) => {
      cluster.questions.forEach((q: any) => {
        pdfCounts[q.source_pdf] = (pdfCounts[q.source_pdf] || 0) + 1;
      });
    });

    return Object.entries(pdfCounts).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const exportCoverageCSV = () => {
    if (!result?.minimal_coverage_set) return;

    const headers = [
      "Question",
      "Difficulty",
      "Source PDF",
      "Cluster Confidence",
    ];

    const rows: CoverageRow[] = result.minimal_coverage_set.map((q: any) => [
      `"${q.question.replace(/"/g, '""')}"`,
      q.difficulty,
      q.source_pdf,
      q.cluster_confidence,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r: CoverageRow) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "minimal_coverage_set.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const toggleCluster = (idx: number) => {
    setExpandedClusters((prev) => {
      const updated = new Set(prev);
      if (updated.has(idx)) {
        updated.delete(idx);
      } else {
        updated.add(idx);
      }
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-md">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  AI Question Deduplication
                </h1>
                <p className="text-sm text-slate-500">
                  Smart exam prep optimization
                </p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Upload Exam Papers
          </h2>

          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex-1 cursor-pointer">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-200">
                <svg
                  className="mx-auto h-12 w-12 text-slate-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-2 text-sm text-slate-600">
                  {files
                    ? `${files.length} file(s) selected`
                    : "Click to select PDF files"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Multiple PDFs supported
                </p>
              </div>
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="hidden"
              />
            </label>

            <button
              onClick={handleUpload}
              disabled={loading || !files}
              className="sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : (
                "Analyze Questions"
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl shadow border border-slate-200 p-6 animate-pulse"
                >
                  <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
                  <div className="h-8 bg-slate-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">
                      Total Questions
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      {result.total_questions}
                    </p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-cyan-100 text-sm font-medium">
                      Unique Clusters
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      {result.total_clusters}
                    </p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium">
                      Optimized Set
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      {result.reduced_questions}
                    </p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">
                      Reduction
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      {result.reduction_percent}%
                    </p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  Difficulty Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getDifficultyData()}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) =>
                        `${name} ${((percent || 0) * 100).toFixed(0)}%`
                      }
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Questions per PDF
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getPdfData()}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex gap-4 bg-white rounded-xl shadow-lg border border-slate-200 p-2">
              <button
                onClick={() => setView("clusters")}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  view === "clusters"
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Cluster Analysis
              </button>

              <button
                onClick={() => setView("coverage")}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  view === "coverage"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Practice Set
              </button>
            </div>

            {view === "clusters" && (
              <div className="space-y-4">
                {result.clusters.map((cluster: any, idx: number) => {
                  const isExpanded = expandedClusters.has(idx);
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden transition-all duration-200 hover:shadow-xl"
                    >
                      <div
                        className="p-6 cursor-pointer"
                        onClick={() => toggleCluster(idx)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-slate-900">
                                Cluster {idx + 1}
                              </h3>
                              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded-full">
                                {cluster.questions.length} question
                                {cluster.questions.length > 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-500">
                                Confidence:
                              </span>
                              <div className="flex-1 max-w-xs bg-slate-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${
                                      cluster.cluster_confidence * 100
                                    }%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-semibold text-slate-700">
                                {(cluster.cluster_confidence * 100).toFixed(0)}
                                %
                              </span>
                            </div>
                          </div>
                          <svg
                            className={`w-6 h-6 text-slate-400 transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-slate-200 p-6 bg-slate-50 space-y-4 animate-in slide-in-from-top duration-200">
                          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold mt-0.5">
                                BEST
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-slate-900 mb-2">
                                  {cluster.canonical_question.question}
                                </p>
                                <div className="flex items-center gap-3 text-sm">
                                  <span
                                    className={`px-2 py-1 rounded font-semibold ${
                                      cluster.canonical_question.difficulty ===
                                      "Easy"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : cluster.canonical_question
                                            .difficulty === "Medium"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-rose-100 text-rose-800"
                                    }`}
                                  >
                                    {cluster.canonical_question.difficulty}
                                  </span>
                                  <span className="text-slate-600">
                                    {cluster.canonical_question.source_pdf}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {cluster.questions.map(
                              (item: any, qIdx: number) => (
                                <div
                                  key={qIdx}
                                  className="bg-white rounded-lg p-4 border border-slate-200 hover:border-blue-300 transition-all duration-200"
                                >
                                  <p className="text-slate-800 mb-2">
                                    {item.question}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span
                                      className={`px-2 py-1 rounded font-semibold ${
                                        item.difficulty === "Easy"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : item.difficulty === "Medium"
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-rose-100 text-rose-800"
                                      }`}
                                    >
                                      {item.difficulty}
                                    </span>
                                    <span className="text-slate-500">
                                      Similarity: {(item.similarity * 100).toFixed(0)}%
                                    </span>
                                    <span className="text-slate-500">
                                      {item.source_pdf}
                                    </span>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {view === "coverage" && (
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Optimized Practice Set
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      The most representative questions from each cluster
                    </p>
                  </div>

                  <button
                    onClick={exportCoverageCSV}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Export CSV
                  </button>
                </div>

                <div className="space-y-4">
                  {result.minimal_coverage_set.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="group bg-gradient-to-r from-emerald-50 to-teal-50 border-l-4 border-emerald-500 rounded-lg p-5 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 mb-3 leading-relaxed">
                            {item.question}
                          </p>
                          <div className="flex flex-wrap items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                item.difficulty === "Easy"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : item.difficulty === "Medium"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {item.difficulty}
                            </span>
                            <span className="text-sm text-slate-600">
                              {item.source_pdf}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">
                                Confidence:
                              </span>
                              <div className="w-20 bg-slate-200 rounded-full h-1.5">
                                <div
                                  className="bg-emerald-500 h-1.5 rounded-full"
                                  style={{
                                    width: `${item.cluster_confidence * 100}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-xs font-semibold text-slate-700">
                                {(item.cluster_confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
