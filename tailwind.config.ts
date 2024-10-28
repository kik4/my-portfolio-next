import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: [
		"variant",
		[
			"@media (prefers-color-scheme: dark) { &:not(.light *) }",
			"&:is(.dark *)",
		],
	],
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			fontFamily: {
				default: ["var(--font-lato)", "var(--font-noto-sans-jp)"],
			},
			colors: {
				background: "var(--background)",
				foreground: "var(--foreground)",
			},
		},
	},
	plugins: [],
};
export default config;
