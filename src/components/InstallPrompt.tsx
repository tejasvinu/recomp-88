import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { cn } from "../utils";

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: Array<string>;
    readonly userChoice: Promise<{
        outcome: "accepted" | "dismissed",
        platform: string
    }>;
    prompt(): Promise<void>;
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Check if the user has already dismissed it in the past
        const dismissed = localStorage.getItem("recomp88-pwa-dismissed");
        if (dismissed === "true") {
            setIsDismissed(true);
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Update UI notify the user they can install the PWA
            setIsInstallable(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        // If it's effectively installed already, don't show prompt
        window.addEventListener("appinstalled", () => {
            setIsInstallable(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            setIsInstallable(false);
        }

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setIsInstallable(false);
        setIsDismissed(true);
        localStorage.setItem("recomp88-pwa-dismissed", "true");
    };

    if (!isInstallable || isDismissed) return null;

    return (
        <div className={cn(
            "fixed left-0 right-0 z-[100] px-4 pb-4 sm:pb-[calc(env(safe-area-inset-bottom)+1rem)] transform transition-transform duration-500",
            "bottom-[4.5rem]" // Place it just above the bottom nav
        )}>
            <div className="max-w-md mx-auto bg-[#111] border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-slide-up">
                <div className="w-12 h-12 rounded-xl bg-lime-400/10 border border-lime-400/20 flex flex-shrink-0 items-center justify-center">
                    <Download size={22} className="text-lime-400" />
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                        Install Recomp 88
                    </h3>
                    <p className="text-xs text-neutral-400 whitespace-nowrap overflow-hidden text-ellipsis">
                        Add to home screen for offline use
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={handleDismiss}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/8 text-neutral-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                        aria-label="Dismiss install prompt"
                    >
                        <X size={16} />
                    </button>

                    <button
                        onClick={handleInstallClick}
                        className="px-3 py-1.5 h-8 bg-lime-400 text-neutral-950 font-bold text-[11px] uppercase tracking-wider rounded-lg hover:bg-lime-300 active:scale-95 transition-all shadow-[0_0_15px_rgba(163,230,53,0.3)]"
                    >
                        Install
                    </button>
                </div>
            </div>
        </div>
    );
}
