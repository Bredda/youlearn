import { parseVideoUrl } from "@youlearn/content";

/**
 * An embedded video. The stored URL is parsed again here (allowlist: YouTube and Vimeo), so a value that did
 * not pass validation never reaches an iframe.
 */
export function VideoEmbed({ url, title }: { url: string; title: string }) {
	const video = parseVideoUrl(url);
	if (!video) {
		return (
			<p className="rounded-md border border-dashed px-3 py-2 text-muted-foreground text-sm">
				Lien vidéo non reconnu (YouTube ou Vimeo attendu).
			</p>
		);
	}
	return (
		<div className="my-2 aspect-video overflow-hidden rounded-md border bg-muted">
			<iframe
				src={video.embedUrl}
				title={title || "Vidéo"}
				loading="lazy"
				className="size-full"
				referrerPolicy="strict-origin-when-cross-origin"
				allow="encrypted-media; picture-in-picture; fullscreen"
				allowFullScreen
				sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
			/>
		</div>
	);
}
