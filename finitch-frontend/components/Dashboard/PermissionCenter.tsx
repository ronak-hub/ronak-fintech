"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, FileImage, Shield, Wifi } from "lucide-react";
import {
  getNotificationPermissionState,
  isSecureBrowserContext,
  openFilePicker,
  requestNotificationPermission,
  type PermissionState,
} from "@/lib/permissions";
import { hasFirebaseConfig } from "@/lib/firebase";

export function PermissionCenter() {
  const [notificationState, setNotificationState] = useState<PermissionState>("unsupported");
  const [secureContext, setSecureContext] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setNotificationState(getNotificationPermissionState());
      setSecureContext(isSecureBrowserContext());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleNotifications = async () => {
    try {
      setNotificationState(await requestNotificationPermission());
    } catch {
      setNotificationState("error");
    }
  };

  const handleFiles = async () => {
    const files = await openFilePicker();
    setSelectedFiles(files);
  };

  return (
    <div className="vaultic-panel rounded-[1.75rem] border border-vaultic-border/60 bg-vaultic-surface/80 p-5 shadow-lg shadow-black/10">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-vaultic-orange">Permissions</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-vaultic-cream">Connect & secure</h3>
        </div>
        <Shield className="h-8 w-8 text-vaultic-mint" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={handleNotifications}
          className="rounded-2xl border border-vaultic-border bg-vaultic-black/30 p-4 text-left transition hover:border-vaultic-orange/50 hover:bg-vaultic-orange/5"
        >
          <div className="mb-3 flex items-center justify-between">
            <Bell className="h-5 w-5 text-vaultic-orange" />
            {notificationState === "granted" ? <CheckCircle2 className="h-5 w-5 text-vaultic-mint" /> : null}
          </div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-vaultic-muted">Notifications</p>
          <p className="mt-2 text-sm font-semibold text-vaultic-cream">
            {notificationState === "granted" ? "Allowed by browser" : notificationState === "denied" ? "Blocked by browser" : notificationState === "unsupported" ? "Requires HTTPS and browser support" : notificationState === "error" ? "Request failed" : "Allow notifications"}
          </p>
        </button>

        <button
          type="button"
          onClick={handleFiles}
          className="rounded-2xl border border-vaultic-border bg-vaultic-black/30 p-4 text-left transition hover:border-vaultic-cyan/50 hover:bg-vaultic-cyan/5"
        >
          <div className="mb-3 flex items-center justify-between">
            <FileImage className="h-5 w-5 text-vaultic-cyan" />
            {selectedFiles.length > 0 ? <CheckCircle2 className="h-5 w-5 text-vaultic-mint" /> : null}
          </div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-vaultic-muted">Files</p>
          <p className="mt-2 text-sm font-semibold text-vaultic-cream">
            {selectedFiles.length > 0 ? `${selectedFiles.length} selected locally` : "Choose files"}
          </p>
          <p className="mt-1 text-xs text-vaultic-muted">No persistent gallery access or upload is enabled.</p>
        </button>

        <div className="rounded-2xl border border-vaultic-border bg-vaultic-black/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <Wifi className="h-5 w-5 text-vaultic-mint" />
            {secureContext ? <CheckCircle2 className="h-5 w-5 text-vaultic-mint" /> : null}
          </div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-vaultic-muted">Browser context</p>
          <p className="mt-2 text-sm font-semibold text-vaultic-cream">
            {secureContext ? "Secure context" : "Not a secure context"}
          </p>
          <p className="mt-1 text-xs text-vaultic-muted">This is not a security audit.</p>
        </div>

        <div className="rounded-2xl border border-vaultic-border bg-vaultic-black/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <Shield className="h-5 w-5 text-vaultic-violet" />
            {hasFirebaseConfig ? <CheckCircle2 className="h-5 w-5 text-vaultic-mint" /> : null}
          </div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-vaultic-muted">Firebase</p>
          <p className="mt-2 text-sm font-semibold text-vaultic-cream">
            {hasFirebaseConfig ? "Web config is present" : "Not configured"}
          </p>
          <p className="mt-1 text-xs text-vaultic-muted">Auth, push, and storage are not integrated.</p>
        </div>
      </div>
    </div>
  );
}
