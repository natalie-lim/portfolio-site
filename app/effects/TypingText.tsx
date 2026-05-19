"use client";

import { useState, useEffect, useRef } from "react";

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
  completeDelay?: number;
  onComplete?: () => void;
};

export function TypingText({
  text,
  speed,
  color,
  className,
  completeDelay = 500,
  onComplete,
}: TypingTextProps) {
  const displayed = useTypingEffect(text, speed);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (displayed !== text || text.length === 0) return;

    const id = setTimeout(() => onCompleteRef.current?.(), completeDelay);
    return () => clearTimeout(id);
  }, [displayed, text, completeDelay]);

  return (
    <p className={[color, className].filter(Boolean).join(" ")}>{displayed}</p>
  );
}
