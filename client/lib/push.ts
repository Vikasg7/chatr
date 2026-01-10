import * as api from "./api";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
        try {
            const registration = await navigator.serviceWorker.register("/sw.js");
            return registration;
        } catch (error) {
            console.error("Service Worker registration failed:", error);
        }
    }
    return null;
}

export async function subscribeUserToPush() {
    const registration = await navigator.serviceWorker.ready;
    if (!registration) return null;

    try {
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        const subObj = subscription.toJSON();
        await api.post("/push/subscribe", subObj);
        return subscription;
    } catch (error) {
        console.error("Failed to subscribe user to push:", error);
        return null;
    }
}

export async function unsubscribeUserFromPush() {
    const registration = await navigator.serviceWorker.ready;
    if (!registration) return;

    try {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();
            await api.post("/push/unsubscribe", { endpoint: subscription.endpoint });
        }
    } catch (error) {
        console.error("Failed to unsubscribe user from push:", error);
    }
}
