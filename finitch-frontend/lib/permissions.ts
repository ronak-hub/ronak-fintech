export type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported' | 'error';

export function getNotificationPermissionState(): PermissionState {
  if (
    typeof window === 'undefined' ||
    !window.isSecureContext ||
    !('Notification' in window)
  ) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (
    typeof window === 'undefined' ||
    !window.isSecureContext ||
    !('Notification' in window)
  ) {
    return 'unsupported';
  }

  return Notification.requestPermission();
}

export async function openFilePicker(): Promise<File[]> {
  if (typeof document === 'undefined') {
    return [];
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    let finished = false;
    input.type = 'file';
    input.accept = 'image/*,.pdf,.csv';
    input.multiple = true;
    input.hidden = true;

    const finish = (files: File[]) => {
      if (finished) return;
      finished = true;
      input.remove();
      resolve(files);
    };

    input.addEventListener('change', () => {
      finish(Array.from(input.files ?? []));
    }, { once: true });
    input.addEventListener('cancel', () => finish([]), { once: true });
    document.body.appendChild(input);
    input.click();
  });
}

export function isSecureBrowserContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext;
}
