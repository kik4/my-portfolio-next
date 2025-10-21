import { faHome, faSearch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { MyLink } from "./_components/MyLink";
import { getPathToHome } from "./(home)/getPath";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 text-center">
        <div className="mx-auto max-w-2xl">
          {/* 404 Large Text with Animation */}
          <div className="relative mb-8">
            <h1 className="animate-pulse font-bold text-[150px] text-gray-200 leading-none sm:text-[200px] dark:text-gray-700">
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full bg-blue-100 p-8 shadow-lg dark:bg-blue-900/30">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="text-5xl text-blue-600 dark:text-blue-400"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          <h2 className="mb-4 font-bold text-3xl text-gray-800 sm:text-4xl dark:text-gray-200">
            ページが見つかりません
          </h2>
          <p className="mb-8 text-gray-600 text-lg dark:text-gray-400">
            お探しのページは存在しないか、移動または削除された可能性があります。
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <MyLink
              href={getPathToHome()}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faHome} />
              ホームに戻る
            </MyLink>
          </div>
        </div>
      </div>
    </main>
  );
}
