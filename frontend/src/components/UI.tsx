import { useEffect, useRef, type ReactNode } from "react";
export function Icon({
  name,
  size = 22,
}: {
  name:
    | "discover"
    | "connections"
    | "filter"
    | "close"
    | "arrow"
    | "undo"
    | "pin"
    | "logout"
    | "check";
  size?: number;
}) {
  const paths = {
    discover: (
      <>
        <path d="m12 3 8 9-8 9-8-9z" />
        <path d="m4 12 8 3 8-3M12 3v12" />
      </>
    ),
    connections: (
      <>
        <rect x="3" y="4" width="18" height="14" rx="4" />
        <path d="m7 18-1 4 6-4M8 10h8M8 14h5" />
      </>
    ),
    filter: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
        <path d="M8 3v6m8 0v6m-6 0v6" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    undo: (
      <>
        <path d="m9 4-5 5 5 5M4 9h9a6 6 0 1 1 0 12" />
      </>
    ),
    pin: (
      <>
        <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" />
        <circle cx="12" cy="10" r="2" />
      </>
    ),
    logout: <path d="M9 4H4v16h5m6-4 4-4-4-4M8 12h11" />,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export function Brand() {
  return (
    <a href="#discover" className="brand">
      <span className="brand-symbol">
        <Icon name="discover" size={26} />
      </span>
      <span>
        goinsiders<span className="brand-sub">match</span>
      </span>
    </a>
  );
}
export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    const previous = document.activeElement as HTMLElement;
    d.showModal();
    return () => {
      d.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <button
        className="icon-button modal-close"
        aria-label="Fechar"
        disabled={busy}
        onClick={onClose}
      >
        <Icon name="close" />
      </button>
      <h2 id="modal-title">{title}</h2>
      {children}
    </dialog>
  );
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="error-box">
      {message}
    </p>
  ) : null;
}
