import { initials } from "@/features/teams/my-team";

// A person's photo (F1-07), or their initials without one. Decorative: the name is
// always beside it. Size and colours come from className, so it fits each card.
export function Avatar({
  name,
  url,
  className,
}: {
  name: string;
  url?: string | null;
  className: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- our API streams it with the session cookie; next/image would refetch it without one
      <img
        src={url}
        alt=""
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-bold ${className}`}
    >
      {initials(name)}
    </span>
  );
}
