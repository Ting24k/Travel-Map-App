import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export default function Modal({
  children,
  onClose,
  label,
  closeLabel,
  className = "",
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
  closeLabel: string;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const d = ref.current!;
    const before = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    d.showModal();
    return () => {
      document.body.style.overflow = overflow;
      d.close();
      before?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        close.current();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            close.current();
        }
      }}
    >
      <button
        className="icon-button modal-close"
        onClick={onClose}
        aria-label={closeLabel}
      >
        <X size={21} />
      </button>
      {children}
    </dialog>
  );
}
