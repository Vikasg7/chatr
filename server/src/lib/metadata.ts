import ogs from "open-graph-scraper";
import { resolve } from "dns/promises";
import { isIP } from "net";

export interface Metadata {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
}

// ✅ SSRF Protection: Check if IP is private/internal
function isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length === 4) {
        // IPv4
        return (
            parts[0] === 127 ||
            parts[0] === 10 ||
            (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
            (parts[0] === 192 && parts[1] === 168) ||
            (parts[0] === 169 && parts[1] === 254)
        );
    }
    // IPv6 simple check (loopback and local)
    return ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:');
}

export async function fetchMetadata(text: string): Promise<Metadata | null> {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);

    if (!match) return null;

    const firstUrl = match[0];

    try {
        const parsedUrl = new URL(firstUrl);
        const host = parsedUrl.hostname;

        // ✅ Resolve IP and check for SSRF
        if (isIP(host)) {
            if (isPrivateIP(host)) return null;
        } else {
            const addresses = await resolve(host).catch(() => []);
            if (addresses.some(ip => isPrivateIP(ip))) {
                console.warn(`🚨 SSRF Blocked: ${firstUrl} resolved to internal IP`);
                return null;
            }
        }

        const { result } = await ogs({ url: firstUrl, timeout: 5000 });

        if (!result.success) return null;

        return {
            title: result.ogTitle,
            description: result.ogDescription,
            image: result.ogImage?.[0]?.url,
            url: firstUrl,
        };
    } catch (err) {
        console.error("Metadata fetch error", err);
        return null;
    }
}
