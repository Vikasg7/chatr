import ogs from "open-graph-scraper";

export interface Metadata {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
}

export async function fetchMetadata(text: string): Promise<Metadata | null> {
    // Simple regex to find the first URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);

    if (!match) return null;

    const firstUrl = match[0];

    try {
        const { result } = await ogs({ url: firstUrl });

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
