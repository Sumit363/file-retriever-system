import { useState } from "react";
import { Terminal, Lock } from "lucide-react";

interface LoginFormProps {
  onLogin: (success: boolean) => void;
}

const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          onLogin(true);
        } else {
          setError(data.message || "Invalid credentials");
          onLogin(false);
        }
      } else {
        setError("An error occurred while logging in.");
        onLogin(false);
      }
    } catch (error) {
      setError("An error occurred while logging in.");
      onLogin(false);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-900">
      {/* Background Image */}
      <div className="absolute inset-0 bg-cover bg-center opacity-20" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md p-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-2xl p-8">
          <div className="text-center pb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Terminal className="h-8 w-8 text-blue-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Bench File Fetcher
            </h1>
            <p className="text-gray-400">Secure SSH file retrieval system</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-300"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-300"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                <Lock className="h-4 w-4 text-red-400 mr-2" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
              disabled={isLoading}
            >
              {isLoading ? "Authenticating..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
