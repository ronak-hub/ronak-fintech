export type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function getNotificationPermissionState(): PermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  const permission = await Notification.requestPermission();
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('vaultic-notification-permission', permission);
  }
  return permission;
}

export function getSavedNotificationPermission(): PermissionState {
  if (typeof window === 'undefined') {
    return 'unsupported';
  }

  const value = window.localStorage.getItem('vaultic-notification-permission');
  if (value === 'granted' || value === 'denied' || value === 'default') {
    return value;
  }
  return getNotificationPermissionState();
}

export function openGalleryPicker(): void {
  if (typeof document === 'undefined') return;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*,.pdf,.doc,.docx,.csv';
  input.multiple = true;
  input.style.display = 'none';
  document.body.appendChild(input);

  input.addEventListener('change', () => {
    if (input.files && input.files.length > 0) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('vaultic-gallery-access', 'enabled');
      }
    }
    input.remove();
  }, { once: true });

  input.click();
}

export function hasGalleryAccess(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.localStorage.getItem('vaultic-gallery-access') === 'enabled';
}

export function markSecurityCheck(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('vaultic-security-seal', 'enabled');
}

export function isSecuritySealEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('vaultic-security-seal') === 'enabled';
}
