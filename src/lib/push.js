// Subscribing this device to web push.
//
// Three separate things have to be true before a push can arrive, and they
// fail in different ways, so they are reported separately rather than as one
// "push is off":
//
//   1. the browser supports it (iOS only does when the app is installed to
//      the home screen - in a Safari tab the APIs are simply absent),
//   2. the user has granted notification permission,
//   3. the server has VAPID keys configured.
//
// The subscription itself belongs to the device, not the account: signing in
// on a second phone means subscribing again there.

import { dataService } from '../data/dataService';

export const pushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export const permissionState = () =>
  pushSupported() ? Notification.permission : 'unsupported';

// VAPID keys travel as base64url text; PushManager wants the raw bytes.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

// getRegistration, not `ready`: `ready` never resolves when no worker has
// been registered at all, which left the Settings control stuck on its
// loading state forever in development and after any failed registration.
async function currentRegistration() {
  if (!pushSupported()) return null;
  return (await navigator.serviceWorker.getRegistration()) || null;
}

async function currentSubscription() {
  const registration = await currentRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

/** What this device's push status is, without changing anything. */
export async function getPushStatus() {
  if (!pushSupported()) {
    return {
      supported: false,
      workerReady: false,
      permission: 'unsupported',
      subscribed: false,
      available: false,
    };
  }

  const registration = await currentRegistration();
  const subscription = registration ? await registration.pushManager.getSubscription() : null;
  let server = { available: false, subscribed: false, deviceCount: 0 };
  try {
    server = await dataService.getPushStatus(subscription?.endpoint);
  } catch {
    // Treated as "push unavailable" rather than an error: the page still
    // works, it just cannot offer this.
  }

  return {
    supported: true,
    // No service worker means nothing can receive a push yet - in
    // development it is never registered, and in production it needs HTTPS.
    workerReady: !!registration,
    permission: Notification.permission,
    // Subscribed means both halves agree - a subscription the server has
    // never heard of would never be pushed to.
    subscribed: !!subscription && !!server.subscribed,
    available: !!server.available,
    deviceCount: server.deviceCount || 0,
  };
}

/**
 * Asks for permission if needed, subscribes, and registers the subscription
 * with the server. Must be called from a user gesture - browsers refuse a
 * permission prompt that nobody asked for, and iOS is strictest about it.
 */
export async function enablePush() {
  if (!pushSupported()) throw new Error('This browser cannot receive push notifications.');

  const { available, publicKey } = await dataService.getPushStatus();
  if (!available || !publicKey) {
    throw new Error('Push notifications are not configured on the server yet.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notifications are blocked for this site. Allow them in your browser settings to turn this on.'
        : 'Notification permission was dismissed.'
    );
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      // Required by every browser: a push that cannot be shown to the user is
      // not allowed to be silent.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  await dataService.savePushSubscription(subscription.toJSON());
  return true;
}

/** Unsubscribes this device, both locally and on the server. */
export async function disablePush() {
  const subscription = await currentSubscription();
  if (!subscription) return true;

  const { endpoint } = subscription;
  await subscription.unsubscribe().catch(() => {});
  // Server last: a row left behind would push to a device that has already
  // stopped listening, and the send would fail forever.
  await dataService.deletePushSubscription(endpoint);
  return true;
}
