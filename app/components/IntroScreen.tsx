"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TypingText } from "../effects/TypingText";

export default function IntroScreen() {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  const handleComplete = () => {
    setExiting(true);
    setTimeout(() => router.push("/home"), 300);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 font-sans">
      <div
        className={`transition-opacity duration-300 ease-out ${
          exiting ? "opacity-0" : "opacity-100"
        }`}
      >
        <TypingText
          text="hi, my name is natalie lim"
          color="text-white"
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
