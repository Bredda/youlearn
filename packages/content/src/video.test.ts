import { describe, expect, it } from "vitest";
import { parseVideoUrl } from "./video";

describe("parseVideoUrl", () => {
	it("recognizes the usual YouTube links and embeds without cookies", () => {
		for (const url of [
			"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
			"https://youtu.be/dQw4w9WgXcQ?t=10",
			"https://www.youtube.com/embed/dQw4w9WgXcQ",
			"https://www.youtube.com/shorts/dQw4w9WgXcQ",
			"https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x",
		]) {
			expect(parseVideoUrl(url)).toEqual({
				provider: "youtube",
				id: "dQw4w9WgXcQ",
				embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
			});
		}
	});

	it("recognizes Vimeo links, keeping the hash of private videos", () => {
		expect(parseVideoUrl("https://vimeo.com/76979871")?.embedUrl).toBe(
			"https://player.vimeo.com/video/76979871",
		);
		expect(
			parseVideoUrl("https://vimeo.com/76979871/abcdef1234")?.embedUrl,
		).toBe("https://player.vimeo.com/video/76979871?h=abcdef1234");
		expect(
			parseVideoUrl("https://player.vimeo.com/video/76979871?h=abcdef1234")
				?.embedUrl,
		).toBe("https://player.vimeo.com/video/76979871?h=abcdef1234");
	});

	it("refuses other hosts, plain http, look-alike hosts and malformed ids", () => {
		for (const url of [
			"http://youtu.be/dQw4w9WgXcQ",
			"https://evil.example/watch?v=dQw4w9WgXcQ",
			"https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
			"https://www.youtube.com/watch?v=short",
			"https://www.youtube.com/watch",
			"https://vimeo.com/not-a-number",
			"https://vimeo.com/76979871/not-a-hash!",
			"javascript:alert(1)",
			"not a url",
			"",
		]) {
			expect(parseVideoUrl(url)).toBeNull();
		}
	});
});
