import { useEffect, useRef, useState } from "react";

const GOOGLE_SCRIPT_ID = "google-identity-services";

function ensureGoogleScript() {
  if (document.getElementById(GOOGLE_SCRIPT_ID)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

export default function GoogleAuthButton({ onCredential, text = "signin_with" }) {
  const containerRef = useRef(null);
  const [error, setError] = useState("");
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      if (!clientId) {
        if (!cancelled) setError("Google login is not configured.");
        return;
      }

      try {
        await ensureGoogleScript();
        if (cancelled || !window.google?.accounts?.id || !containerRef.current) return;

        containerRef.current.innerHTML = "";
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            if (credential) {
              onCredential(credential);
            }
          },
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          width: 320,
          text,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Google login failed to initialize.");
        }
      }
    };

    setup();
    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential, text]);

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="flex justify-center [&>div]:!mx-auto"
      />
      {error && (
        <p className="text-center text-xs text-red-300">{error}</p>
      )}
    </div>
  );
}
