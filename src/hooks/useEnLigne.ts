"use client";

import { useEffect, useState } from "react";

/** État du réseau, tel que le navigateur le voit. */
export function useEnLigne(): boolean {
  const [enLigne, setEnLigne] = useState(true);

  useEffect(() => {
    const majEtat = () => setEnLigne(navigator.onLine);
    majEtat();
    window.addEventListener("online", majEtat);
    window.addEventListener("offline", majEtat);
    return () => {
      window.removeEventListener("online", majEtat);
      window.removeEventListener("offline", majEtat);
    };
  }, []);

  return enLigne;
}
