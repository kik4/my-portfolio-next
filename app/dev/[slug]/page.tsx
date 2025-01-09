import Link from "next/link";

const f = async (keyword: string) => ({ keyword });

export default async function Page({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const slug = (await params).slug;
	const p = await f(slug);

	return (
		<div className="flex flex-col">
			<div>My Post: {p.keyword}</div>
			<div>
				<Link href="/dev/hoge">hoge</Link>
			</div>
			<div>
				<Link href="/dev/日本語">日本語</Link>
			</div>
		</div>
	);
}
