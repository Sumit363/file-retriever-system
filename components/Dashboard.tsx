"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Terminal, Download, Server, LogOut, Loader2 } from "lucide-react";
import { logFileLines } from "@/lib/config";
import Link from "next/link";

const Dashboard = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    alias: "",
    filePath: "",
    imeis: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [realTimeLogs, setRealTimeLogs] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [singleFileContent, setSingleFileContent] = useState<string>("");

  useEffect(() => {
    const fetchLogs = async () => {
      const res = await fetch("/api/get-logs");
      if (res.ok) {
        const data = await res.json();
        const refinedData = data.map((log: { message: string }) => log.message);
        setLogs(refinedData);
      }
    };

    fetchLogs();
  }, []);

  const handleLogout = async () => {
    const res = await fetch("/api/logout", { method: "POST" });
    if (res.ok) {
      router.push("/login");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.alias || !formData.filePath || !formData.imeis) {
      alert("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    setRealTimeLogs(""); // Clear previous logs
    setSingleFileContent(""); // Clear previous single file content

    let currentLogs = "";
    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleString();
      const logLine = `[${timestamp}] ${message}\n`;
      currentLogs += logLine;
      setRealTimeLogs((prev) => `${prev}${logLine}`);
    };

    addLog(`Starting file fetch from bench: ${formData.alias}`);
    addLog(`File path: ${formData.filePath}`);
    addLog(
      `Processing IMEIs: ${formData.imeis
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", ")}`
    );

    try {
      const res = await fetch("/api/fetch-files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const contentType = res.headers.get("Content-Type");
        // if it's a single file, just display the content in the website
        if (contentType && contentType.includes("text/plain")) {
          const textContent = await res.text();
          setSingleFileContent(textContent);
          addLog("✅ File content fetched successfully.");
        } else {
          // if multiple files are found, just zip it and download it.
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "logs.zip";
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          addLog("✅ Files downloaded successfully as logs.zip");
        }
      } else {
        const errorData = await res.json();
        addLog(`❌ Error: ${errorData.message}`);
        if (errorData.error) {
          addLog(`Details: ${errorData.error}`);
        }
      }
    } catch (error) {
      addLog("❌ An unexpected error occurred.");
      if (error instanceof Error) {
        addLog(`Details: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
      // gotta save the logs here
      try {
        await fetch("/api/save-logs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ realTimeLogs: currentLogs }),
        });
      } catch (error) {
        console.error("Error saving logs:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-12">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Server className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Bench File Fetcher
              </h1>
              <p className="text-gray-400">SSH-based file retrieval system</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 rounded-md transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {/* Main Form */}
          <div className="w-full">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <Terminal className="h-5 w-5 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">
                    File Retrieval Form
                  </h2>
                </div>
                <p className="text-gray-400">
                  Enter bench details and IMEI(s) to fetch files via SSH
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="alias"
                      className="block text-sm font-medium text-gray-300"
                    >
                      Bench Name *
                    </label>
                    <input
                      id="alias"
                      type="text"
                      placeholder="e.g. bench1"
                      value={formData.alias}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          alias: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="filePath"
                      className="block text-sm font-medium text-gray-300"
                    >
                      File Path *
                    </label>
                    <input
                      id="filePath"
                      type="text"
                      placeholder="/path/to/your/logs"
                      value={formData.filePath}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          filePath: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="imeis"
                      className="block text-sm font-medium text-gray-300"
                    >
                      IMEI(s) *
                    </label>
                    <textarea
                      id="imeis"
                      placeholder="Enter comma-separated IMEIs or one per line\n123456789012345, 987654321098765\n555666777888999"
                      value={formData.imeis}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          imeis: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-none"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors flex items-center justify-center cursor-pointer"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Fetching Files...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Fetch Files
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Single File Content Display */}
          {singleFileContent && (
            <div className="w-full">
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Displaying last {logFileLines} lines
                  </h3>
                  <button
                    onClick={() => {
                      const blob = new Blob([singleFileContent], {
                        type: "text/plain",
                      });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${formData.imeis.split(/[\n,]/)[0]}`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                    }}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Logs
                  </button>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 max-h-96 overflow-y-auto font-mono text-sm">
                  <pre className="text-gray-300 whitespace-pre-wrap">
                    {singleFileContent}
                  </pre>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-8">
            {/* Real Time Logs */}
            {realTimeLogs && (
              <div className="w-full">
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Real Time Logs
                  </h3>
                  <div className="bg-gray-900/50 rounded-lg p-3 max-h-72 overflow-y-auto font-mono text-sm">
                    {realTimeLogs.split("\n").map((log, index) => (
                      <div key={index} className="text-gray-300 mb-1">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {logs.length > 0 && (
              <div className="w-full">
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Previous Logs
                    </h3>
                    <Link href="/all-logs" className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer">
                      View All Logs
                    </Link>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 max-h-72 overflow-y-auto font-mono text-sm">
                    {logs.map((log, index) => (
                      <div key={index} className="mb-4">
                        {log.split("\n").map((lg, index) => (
                          <div key={index} className="text-gray-300 mb-1">
                            {lg}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
