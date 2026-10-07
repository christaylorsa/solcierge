/**
 * The member's face: their X photo when connected, otherwise a serif monogram.
 * A hairline gold ring either way, so the two read as the same object.
 */
export function MemberAvatar({
  src,
  name,
  size = 96,
}: {
  src: string | null
  name: string | null
  size?: number
}) {
  const initial = (name ?? '').trim().charAt(0).toUpperCase() || 'S'
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full border border-accent/70 p-[3px]"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span
          className="display flex h-full w-full items-center justify-center rounded-full bg-raised text-accent-soft"
          style={{ fontSize: size * 0.46 }}
          aria-hidden="true"
        >
          {initial}
        </span>
      )}
    </span>
  )
}
