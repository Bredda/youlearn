import { describe, expect, it } from "vitest";
import { sniffImageType } from "./image-type";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

describe("sniffImageType", () => {
	it("recognises PNG, JPEG, GIF and WebP from their signature", () => {
		expect(
			sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
		).toBe("image/png");
		expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
		expect(sniffImageType(bytes(...ascii("GIF89a")))).toBe("image/gif");
		expect(
			sniffImageType(
				bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP"), ...ascii("VP8 ")),
			),
		).toBe("image/webp");
	});

	it("does not accept other RIFF files such as WAV", () => {
		expect(
			sniffImageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WAVE"))),
		).toBeUndefined();
	});

	it("refuses SVG, text and empty or truncated input", () => {
		expect(
			sniffImageType(
				bytes(...ascii('<svg xmlns="http://www.w3.org/2000/svg">')),
			),
		).toBeUndefined();
		expect(sniffImageType(bytes(...ascii("hello")))).toBeUndefined();
		expect(sniffImageType(bytes())).toBeUndefined();
		expect(sniffImageType(bytes(0x89, 0x50))).toBeUndefined();
	});
});
