import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { getPathToHome } from "../(home)/getPath";
import { getPathToAlgorithm } from "../algorithm/getPath";
import { DarkToggleButton } from "./DarkToggleButton";
import { MobileMenu } from "./MobileMenu";
import { MyLink } from "./MyLink";

export function Header({ isHome = false }: { isHome?: boolean }) {
  return (
    <header
      className={clsx("w-full bg-background/50", {
        "fixed top-0 z-10 shadow-md backdrop-blur-sm": isHome,
        "border-gray-200 border-b dark:border-gray-700 dark:bg-gray-900":
          !isHome,
      })}
    >
      <nav className="container mx-auto flex justify-between px-2 py-4 md:px-6">
        <div className="flex items-center gap-4 md:gap-8">
          {/* SP表示用のハンバーガーメニュー */}
          <MobileMenu />
          <h1 className="font-bold text-2xl">
            <MyLink href={getPathToHome()} className="font-bold text-2xl">
              kik4.work
            </MyLink>
          </h1>
          {/* PC表示用のメニュー */}
          <MyLink
            href={getPathToAlgorithm()}
            className="hidden font-medium text-foreground/80 transition hover:text-foreground hover:underline md:block"
          >
            Algorithm
          </MyLink>
        </div>
        <div className="flex items-center gap-4">
          {/* PC表示用のボタン */}
          <MyLink
            className="hidden gap-2 rounded-lg bg-gray-100 px-3 py-2 font-medium text-gray-700 transition hover:bg-gray-200 hover:text-black md:flex md:items-center dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:hover:text-white"
            href="https://github.com/kik4"
          >
            <FontAwesomeIcon icon={faGithub} size="lg" />
            <span>GitHub</span>
          </MyLink>
          <div className="hidden md:block">
            <DarkToggleButton />
          </div>
        </div>
      </nav>
    </header>
  );
}
