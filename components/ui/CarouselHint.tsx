"use client";

export function CarouselHint({ visible }: { visible: boolean }) {
  return (
    <p
      aria-hidden={!visible}
      className={[
        "select-none rounded-full border border-border bg-surface/70 px-4 py-1.5",
        "text-xs text-muted backdrop-blur transition-opacity duration-500",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      اسحب لتدوير القرص، ثم انقر لاختيار اللون
    </p>
  );
}
