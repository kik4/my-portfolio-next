import { redirect } from "next/navigation";
import { getPathToTypeScriptArticle } from "./getPath";

export default function Page() {
  redirect(getPathToTypeScriptArticle("getting-started"));
}
