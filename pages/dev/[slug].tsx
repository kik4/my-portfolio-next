import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";

export const getStaticPaths: GetStaticPaths = () => {
	return {
		paths: ["/dev/hoge", "/dev/日本語"],
		fallback: "blocking",
	};
};

export const getStaticProps: GetStaticProps = async (context) => {
	return {
		props: {
			params: context.params?.slug,
		},
	};
};

const Page = ({ params }: { params: string }) => {
	return (
		<div className="flex flex-col">
			<div>My Post: {params}</div>
			<div>
				<Link href="/dev/hoge">hoge</Link>
			</div>
			<div>
				<Link href="/dev/日本語">日本語</Link>
			</div>
		</div>
	);
};

export default Page;
