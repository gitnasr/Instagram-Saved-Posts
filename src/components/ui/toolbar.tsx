import { cn } from "@/lib/utils";

/** Flat sticky bar for page-level controls: no blur, no shadow, one hairline. */
export function Toolbar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="toolbar"
      className={cn(
        "sticky top-0 z-20 -mx-4 flex flex-col gap-2 border-b border-hairline bg-canvas px-4 py-2.5 sm:mx-0 sm:px-0",
        className
      )}
      {...props}
    />
  );
}
