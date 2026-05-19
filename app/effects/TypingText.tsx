"use client";

import { useState, useEffect } from "react";

export function useTypingEffect(text: string, speed = 80) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      setDisplayed(text.slice(0, ++i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return displayed;
}

type TypingTextProps = {
  text: string;
  color: string;
  speed?: number;
  className?: string;
};

export function TypingText({ text, speed, color, className }: TypingTextProps) {
  const displayed = useTypingEffect(text, speed);
  const [mounted, setMounted] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    setMounted(true);
    setFading(false);
    if (displayed !== text || text.length === 0) return;

    const id = setTimeout(() => setFading(true), 500);
    return () => clearTimeout(id);
  }, [displayed, text]);

  if (!mounted) return null;

  return (
    <p
      className={[
        color,
        className,
        "transition-opacity duration-300 ease-out",
        fading ? "opacity-0" : "opacity-100",
      ]
        .filter(Boolean)
        .join(" ")}
      onTransitionEnd={(e) => {
        if (fading && e.propertyName === "opacity") setMounted(false);
      }}
    >
      {displayed}
    </p>
  );
}