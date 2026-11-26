import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { ENV } from "@/lib/env";

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      width?: number;
      text?: "signin_with" | "signup_with" | "continue_with";
    }
  ) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with";
}

const GSI_SCRIPT_ID = "google-gsi-client-script";

export function GoogleSignInButton({
  onCredential,
  text = "continue_with",
}: GoogleSignInButtonProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onCredential);
  const [scriptError, setScriptError] = useState(false);

  callbackRef.current = onCredential;

  useEffect(() => {
    if (!ENV.googleClientId || !containerRef.current) {
      return;
    }

    let cancelled = false;

    const renderGoogleButton = () => {
      if (cancelled || !containerRef.current || !window.google?.accounts?.id) {
        return;
      }

      containerRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: ENV.googleClientId,
        callback: (response) => {
          if (response.credential) {
            callbackRef.current(response.credential);
          }
        },
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: theme === "dark" ? "filled_black" : "outline",
        size: "large",
        width: 340,
        text,
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => {
        cancelled = true;
      };
    }

    let script = document.getElementById(
      GSI_SCRIPT_ID
    ) as HTMLScriptElement | null;

    const handleLoad = () => renderGoogleButton();
    const handleError = () => {
      if (!cancelled) setScriptError(true);
    };

    if (!script) {
      script = document.createElement("script");
      script.id = GSI_SCRIPT_ID;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    return () => {
      cancelled = true;
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
    };
  }, [text, theme]);

  if (!ENV.googleClientId) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--tx-border-strong)] bg-[var(--tx-bg)]/40 px-3 py-2.5 text-center text-xs text-[var(--tx-text-muted)]">
        Google Sign-In requires{" "}
        <code className="font-mono text-[var(--tx-text-secondary)]">
          VITE_GOOGLE_CLIENT_ID
        </code>{" "}
        in{" "}
        <code className="font-mono text-[var(--tx-text-secondary)]">
          frontend/.env
        </code>
        .
      </p>
    );
  }

  if (scriptError) {
    return (
      <p className="text-center text-xs text-[var(--tx-text-muted)]">
        Unable to load Google Sign-In script. Use email and password above.
      </p>
    );
  }

  return (
    <div className="flex min-h-[44px] w-full justify-center">
      <div ref={containerRef} />
    </div>
  );
}
