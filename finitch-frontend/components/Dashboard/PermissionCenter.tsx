"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, ImageIcon, Shield, UploadCloud } from "lucide-react";
import {
  hasGalleryAccess,
  isSecuritySealEnabled,
  markSecurityCheck,
  openGalleryPicker,
  requestNotificationPermission,
  getSavedNotificationPermission,
  type PermissionState,
} from "@/lib/permissions";

export function PermissionCenter() {
  const [notificationState, setNotificationState] = useState<PermissionState>("default");
  const [galleryAccess, setGalleryAccess] = useState(false);
  const [securityReady, setSecurityReady] = useState(false);

  useEffect(() => {
    setNotificationState(getSavedNotificationPermission());
    setGalleryAccess(hasGalleryAccess());
    setSecurityReady(isSecuritySealEnabled());
  }, []);

  const handleNotifications = async () => {
    const nextState = await requestNotificationPermission();
    setNotificationState(nextState);
  };

  const handleGallery = () => {
    openGalleryPicker();
    setGalleryAccess(true);
  };

  const handleSecurityCheck = () => {
    markSecurityCheck();
    setSecurityReady(true);
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

      <div className="grid gap-3 md:grid-cols-3">
        <button
          type="button"
          onClick={handleNotifications}
          className="rounded-2xl border border-vaultic-border bg-vaultic-black/30 p-4 text-left transition hover:border-vaultic-orange/50 hover:bg-vaultic-orange/5"
        >
          <div className="mb-3 flex items-center justify-between">
            <Bell className="h-5 w-5 text-vaultic-orange" />
            {notificationState === 'granted' ? <CheckCircle2 className="h-5 w-5 text-vaultic-mint" /> : null}
          </div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-vaultic-muted">Notifications</p>
          <p className="mt-2 text-sm font-semibold text-vaultic-cream">
            {notificationState === 'granted' ? 'Enabled' : 'Enable alerts'}
          </p>
        </button>

        <button
          type="button"
          onClick={handleGallery}
          className="rounded-2xl border border-vaultic-border bg-vaultic-black/30 p-4 text-left transition hover:border-vaultic-cyan/50 hover:bg-vaultic-cyan/5"
        >
          <div className="mb-3 flex items-center justify-between">
            <ImageIcon className="h-5 w-5 text-vaultic-cyan" />
            {galleryAccess ? <CheckCircle2 className="h-5 w-5 text-vaultic-mint" /> : null}
          </div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-vaultic-muted">Gallery</p>
          <p className="mt-2 text-sm font-semibold text-vaultic-cream">
            {galleryAccess ? 'Connected' : 'Connect files'}
          </p>
        </button>

        <button
          type="button"
          onClick={handleSecurityCheck}
          className="rounded-2xl border border-vaultic-border bg-vaultic-black/30 p-4 text-left transition hover:border-vaultic-mint/50 hover:bg-vaultic-mint/5"
        >
          <div className="mb-3 flex items-center justify-between">
            <UploadCloud className="h-5 w-5 text-vaultic-mint" />
            {securityReady ? <CheckCircle2 className="h-5 w-5 text-vaultic-mint" /> : null}
          </div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-vaultic-muted">Security</p>
          <p className="mt-2 text-sm font-semibold text-vaultic-cream">
            {securityReady ? 'Secure state active' : 'Run security check'}
          </p>
        </button>
      </div>
    </div>
  );
}
