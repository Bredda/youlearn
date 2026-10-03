import type { Metadata } from "next";
import "./globals.css";
import {
	Source_Code_Pro,
	Source_Serif_4,
	Space_Grotesk,
} from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";

const fontSans = Space_Grotesk({
	subsets: ["latin"],
	variable: "--font-sans",
});

const fontSerif = Source_Serif_4({
	subsets: ["latin"],
	variable: "--font-serif",
});

const fontMono = Source_Code_Pro({
	subsets: ["latin"],
	variable: "--font-mono",
});

export const metadata: Metadata = {
	title: { default: "YouLearn", template: "%s · YouLearn" },
	description: "YouLearn",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="fr" suppressHydrationWarning>
			<body
				className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} antialiased`}
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<TooltipProvider>{children}</TooltipProvider>
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
