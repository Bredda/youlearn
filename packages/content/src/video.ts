export type VideoProvider = "youtube" | "vimeo";

export type ParsedVideo = {
	provider: VideoProvider;
	id: string;
	/** What the iframe loads: derived from the stored URL, never stored. */
	embedUrl: string;
};

const YOUTUBE_HOSTS = new Set([
	"youtube.com",
	"www.youtube.com",
	"m.youtube.com",
	"youtu.be",
	"www.youtu.be",
]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

const YOUTUBE_ID = /^[\w-]{11}$/;
const VIMEO_ID = /^\d{1,12}$/;
/** Private Vimeo videos carry a hash (`vimeo.com/<id>/<hash>`) the embed needs as `?h=`. */
const VIMEO_HASH = /^[a-f0-9]{6,32}$/i;

function parseYoutube(url: URL): ParsedVideo | null {
	const parts = url.pathname.split("/").filter(Boolean);
	let id: string | undefined;
	if (url.hostname.endsWith("youtu.be")) {
		id = parts[0];
	} else if (url.pathname === "/watch") {
		id = url.searchParams.get("v") ?? undefined;
	} else if (["embed", "shorts", "live"].includes(parts[0] ?? "")) {
		id = parts[1];
	}
	if (!id || !YOUTUBE_ID.test(id)) return null;
	return {
		provider: "youtube",
		id,
		embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
	};
}

function parseVimeo(url: URL): ParsedVideo | null {
	const parts = url.pathname.split("/").filter(Boolean);
	if (url.hostname === "player.vimeo.com") {
		if (parts[0] !== "video") return null;
		parts.shift();
	}
	const id = parts[0];
	if (!id || !VIMEO_ID.test(id)) return null;
	const hash = parts[1] ?? url.searchParams.get("h") ?? undefined;
	if (hash && !VIMEO_HASH.test(hash)) return null;
	return {
		provider: "vimeo",
		id,
		embedUrl: `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ""}`,
	};
}

/**
 * Recognizes the video hosts a course may embed (allowlist: YouTube and Vimeo, https only) and derives the
 * iframe URL. Anything else is refused, so a lesson cannot point an iframe at an arbitrary site.
 */
export function parseVideoUrl(raw: string): ParsedVideo | null {
	let url: URL;
	try {
		url = new URL(raw.trim());
	} catch {
		return null;
	}
	if (url.protocol !== "https:") return null;
	if (YOUTUBE_HOSTS.has(url.hostname)) return parseYoutube(url);
	if (VIMEO_HOSTS.has(url.hostname)) return parseVimeo(url);
	return null;
}
