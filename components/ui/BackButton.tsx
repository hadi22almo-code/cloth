"use client";

export function BackButton({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={[
        "pointer-events-auto flex items-center gap-2 rounded-full border border-border",
        "min-h-11 bg-surface/80 px-4 py-2.5 text-sm backdrop-blur transition",
        "hover:border-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
    >
      {/* السهم يشير إلى اليمين لأن الرجوع في واجهة عربية يتجه يميناً */}
      <span aria-hidden>→</span>
      {/* على الهاتف «رجوع» وحدها: النص الكامل كان يلتفّ على ثلاثة أسطر */}
      <span className="whitespace-nowrap">
        رجوع<span className="hidden sm:inline"> إلى القرص</span>
      </span>
      {/* اختصار لوحة المفاتيح بلا معنى على جهاز لمس */}
      <kbd className="hidden rounded border border-border px-1 text-[10px] text-muted sm:inline">
        Esc
      </kbd>
    </button>
  );
}
