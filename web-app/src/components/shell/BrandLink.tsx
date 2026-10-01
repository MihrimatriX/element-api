import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Mark + "ElementAPI" wordmark linking home. Uses the light mark so it reads on dark surfaces. */
export function BrandLink({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className={cn("flex shrink-0 items-center gap-2.5 rounded-md", className)}
    >
      <img
        src="/brand/mark-light.svg"
        alt=""
        width={24}
        height={24}
        className="size-6"
      />
      <span className="font-display text-[17px] font-semibold tracking-tight text-ink">
        ElementAPI
      </span>
    </Link>
  );
}
