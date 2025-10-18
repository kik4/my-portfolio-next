import NextLink from "next/link";
import type { ComponentProps } from "react";

export const MyLink = ({
  children,
  opensNewTab,
  disabled,
  className,
  ...props
}: ComponentProps<typeof NextLink> & {
  opensNewTab?: boolean;
  disabled?: boolean;
}) => {
  if (disabled) return <span className={className}>{children}</span>;

  // 外部 url ならデフォルトで新しいタブで開く
  if (
    typeof props.href === "string"
      ? props.href.startsWith("http") || props.href.startsWith("//:")
      : props.href.hostname
  ) {
    opensNewTab ??= true;
  }

  return (
    <NextLink
      className={className}
      prefetch={false}
      {...(opensNewTab
        ? { target: "_blank", rel: "noopener noreferrer" }
        : null)}
      {...props}
    >
      {children}
    </NextLink>
  );
};
