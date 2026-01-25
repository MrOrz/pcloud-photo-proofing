import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const [inputUrl, setInputUrl] = useState("");
  const navigate = useNavigate();

  const handleGo = () => {
    // Extract public link code
    // Example: https://u.pcloud.link/publink/show?code=kZvSyF5Zq48YtoTelemtD7vX0WhoVR6x8XqX
    const codeMatch = inputUrl.match(/code=([a-zA-Z0-9]+)/);
    if (codeMatch) {
      navigate({ to: "/app", search: { publink_code: codeMatch[1] } });
      return;
    }

    // Fallback: Check if the user pasted just the code
    if (inputUrl.length > 20 && !inputUrl.includes("/") && !inputUrl.includes(".")) {
      navigate({ to: "/app", search: { publink_code: inputUrl } });
      return;
    }

    alert("Could not parse Valid Public Link Code from the URL");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-stone-800">pCloud Photo Proofing</CardTitle>
          <CardDescription className="text-center">
            Enter a pCloud Public Link to start proofing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Input
              placeholder="https://u.pcloud.link/publink/show?code=..."
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGo()}
            />
            <Button onClick={handleGo} className="w-full bg-stone-800 hover:bg-stone-700 text-white cursor-pointer">
              Go to Album
            </Button>
          </div>
          <div className="text-xs text-stone-500 mt-4">
            <p>Supported format:</p>
            <ul className="list-disc list-inside">
              <li>Public Link: https://u.pcloud.link/publink/show?code=ABC...</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}