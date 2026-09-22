import { ReactNode } from "react";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-20 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-page w-full sm:max-w-md sm:rounded-card rounded-t-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-teal text-white px-5 py-4 flex items-center justify-between">
          <p className="font-display font-semibold">{title}</p>
          <button
            onClick={onClose}
            className="text-white/80 text-xl leading-none px-2"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
