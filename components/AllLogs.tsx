import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const DisplayLogs = () => {
  const [logs, setLogs] = useState<string[]>([]);
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
  return (
    <div className="w-full">
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Previous Logs</h3>
          <button className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer">
            <Link href="/">
              <ArrowLeft />
            </Link>
          </button>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3 font-mono text-sm">
          {logs.map((log, index) => (
            <div key={index} className="mb-6">
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
  );
};

export default DisplayLogs;
