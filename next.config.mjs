/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	async headers() {
		return [
			{
				source: "/:asset(jameyati_logo.png|System_Creator_Logo.png|icon-192.png|icon-512.png)",
				headers: [
					{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
				],
			},
		];
	},
};

export default nextConfig;
