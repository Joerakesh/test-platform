// @ts-nocheck
"use client";

import { useEffect, useRef, useState } from "react";
import { formatSeconds } from "@/lib/format";

export function useCountdown(deadline: any, onExpire?: any) {
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)));
  const firedRef = useRef(false);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    firedRef.current = false;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0 && !firedRef.current) {
        firedRef.current = true;
        expireRef.current?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return seconds;
}

export default function ExamTimer({ deadline, onExpire, compact = false }: any) {
  const seconds = useCountdown(deadline, onExpire);
  const warn = seconds <= 300;
  const critical = seconds <= 60;

  return (
    <span
      className={`timer ${warn ? "warn" : ""}`}
      style={compact ? { fontSize: 18, padding: "3px 10px" } : undefined}
      role="timer"
      aria-live={critical ? "assertive" : "off"}
      title="Time remaining"
    >
      {critical && <span aria-hidden="true">⚠ </span>}
      {formatSeconds(seconds)}
    </span>
  );
}

export function TimeSpent({ seconds }: any) {
  return <span className="mono">{formatSeconds(seconds || 0)}</span>;
}
