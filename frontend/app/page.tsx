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
} from "recharts";


export default function Home() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"clusters" | "coverage">("clusters");
  type Difficulty = "Easy" | "Medium" | "Hard";


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
        pdfCounts[q.source_pdf] =
          (pdfCounts[q.source_pdf] || 0) + 1;
      });
    });
  
    return Object.entries(pdfCounts).map(([name, value]) => ({
      name,
      value,
    }));
  };
  type CoverageRow = [string, string, string, number];

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

  const csvContent =
    [headers.join(","), ...rows.map((r: CoverageRow) => r.join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "minimal_coverage_set.csv";
  link.click();

  URL.revokeObjectURL(url);
};

  
  

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">
          AI Question Deduplication Engine
        </h1>

        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="mb-4"
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Processing..." : "Upload PDF"}
        </button>

        {error && (
          <p className="mt-4 text-red-600 font-medium">{error}</p>
        )}

        {/* VIEW TOGGLE */}
        {result && (
          <div className="flex gap-4 my-6">
            <button
              onClick={() => setView("clusters")}
              className={`px-4 py-2 rounded ${
                view === "clusters"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              Cluster View
            </button>

            <button
              onClick={() => setView("coverage")}
              className={`px-4 py-2 rounded ${
                view === "coverage"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              Minimal Coverage Set
            </button>
          </div>
        )}

        {/* RESULTS */}
        {result && (
          <div className="mt-6 space-y-6">
            <div className="flex gap-6 text-sm text-gray-700">
              <p>
                <strong>Total Questions:</strong> {result.total_questions}
              </p>
              <p>
                <strong>Total Clusters:</strong> {result.total_clusters}
              </p>
              <p>
                <strong>Reduced Set:</strong> {result.reduced_questions}
              </p>
              <p>
                <strong>Reduction:</strong> {result.reduction_percent}%
              </p>
            </div>

            {/* ================= CLUSTER VIEW ================= */}
            {view === "clusters" &&
              result.clusters.map((cluster: any, idx: number) => (
                <div
                  key={idx}
                  className="border rounded-lg p-4 bg-gray-50 shadow-sm"
                >
                  <div className="mb-3">
                    <h3 className="font-semibold">
                      Cluster {idx + 1}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Confidence: {cluster.cluster_confidence}
                    </p>
                  </div>

                  <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <p className="font-medium text-blue-900">
                      Canonical Question
                    </p>
                    <p className="text-gray-800 mt-1">
                      {cluster.canonical_question.question}
                    </p>
                    <span className="text-xs text-gray-600">
                      Difficulty: {cluster.canonical_question.difficulty}
                    </span>
                  </div>

                  <ul className="space-y-2">
                    {cluster.questions.map((item: any, qIdx: number) => (
                      <li
                        key={qIdx}
                        className="flex justify-between items-start gap-4"
                      >
                        <div>
                          <p className="text-gray-800">{item.question}</p>
                          <p className="text-xs text-gray-500">
                            Similarity: {item.similarity} | Source:{" "}
                            {item.source_pdf}
                          </p>
                        </div>

                        <span
                          className={`px-2 py-1 text-xs rounded font-semibold
                            ${
                              item.difficulty === "Easy"
                                ? "bg-green-200 text-green-800"
                                : item.difficulty === "Medium"
                                ? "bg-yellow-200 text-yellow-800"
                                : "bg-red-200 text-red-800"
                            }
                          `}
                        >
                          {item.difficulty}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {/* ================= DASHBOARD CHARTS ================= */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
  
  {/* Difficulty Distribution */}
  <div className="bg-white border rounded-lg p-4 shadow">
    <h3 className="font-semibold mb-3">Difficulty Distribution</h3>
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={getDifficultyData()}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label
        >
          <Cell fill="#86efac" />
          <Cell fill="#fde047" />
          <Cell fill="#fca5a5" />
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </div>

  {/* Questions per PDF */}
  <div className="bg-white border rounded-lg p-4 shadow">
    <h3 className="font-semibold mb-3">Questions per PDF</h3>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={getPdfData()}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>


            {/* ================= MINIMAL COVERAGE VIEW ================= */}
            {view === "coverage" && (
  <>
    <div className="flex justify-between items-center mb-4">
      <h2 className="font-semibold text-lg">
        Optimized Practice Set
      </h2>

      <button
        onClick={exportCoverageCSV}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Download CSV
      </button>
    </div>

    <div className="space-y-4">
      {result.minimal_coverage_set.map((item: any, idx: number) => (
        <div
          key={idx}
          className="border rounded-lg p-4 bg-green-50 shadow-sm"
        >
          <p className="font-medium text-gray-900">
            {idx + 1}. {item.question}
          </p>

          <div className="mt-2 flex gap-4 text-xs text-gray-600">
            <span>Difficulty: {item.difficulty}</span>
            <span>Source: {item.source_pdf}</span>
            <span>Confidence: {item.cluster_confidence}</span>
          </div>
        </div>
      ))}
    </div>
  </>
)}

          </div>
        )}
      </div>
    </main>
  );
}

