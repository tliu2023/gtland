"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { organizations, tierOptionsFor } from "@/lib/submission-options";

export function Modal({ title, closeHref, children }: { title: string; closeHref: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => router.replace(closeHref, { scroll: false })}
      // clicks on the dialog element itself (not its content) land on the backdrop
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-3xl rounded-lg bg-white p-0 text-black shadow-xl backdrop:bg-black/50 dark:bg-zinc-900 dark:text-zinc-50"
    >
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => ref.current?.close()}
            className="text-2xl leading-none text-zinc-400 hover:text-black dark:hover:text-zinc-50"
          >
            {"\u00d7"}
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function ExpandableRow({
  label,
  cells,
  colSpan,
  defaultOpen = false,
  children,
}: {
  label: string;
  cells: ReactNode;
  colSpan: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <tr
        onClick={() => setOpen(!open)}
        className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <td className="w-10 px-4 py-3">
          <button
            type="button"
            aria-expanded={open}
            aria-label={`${open ? "Hide" : "Show"} ${label}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
            className="text-xs text-zinc-400 hover:text-black dark:hover:text-zinc-50"
          >
            <span aria-hidden className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>
              {"\u25B6"}
            </span>
          </button>
        </td>
        {cells}
      </tr>
      {open && (
        <tr>
          <td colSpan={colSpan} className="bg-zinc-50 px-4 py-4 dark:bg-zinc-950">
            {children}
          </td>
        </tr>
      )}
    </>
  );
}

export function NoteCell({ note }: { note: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  function show() {
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const rect = el.getBoundingClientRect();
    setPosition({ top: rect.bottom + 4, left: rect.left });
  }

  if (!note) return null;
  return (
    <>
      <p
        ref={ref}
        tabIndex={0}
        onMouseEnter={show}
        onMouseLeave={() => setPosition(null)}
        onFocus={show}
        onBlur={() => setPosition(null)}
        className="max-w-xs truncate"
      >
        {note}
      </p>
      {position && (
        // fixed so the table's overflow container doesn't clip it
        <div
          role="tooltip"
          style={{ top: position.top, left: position.left }}
          className="fixed z-50 max-w-sm whitespace-pre-line rounded-md border border-zinc-200 bg-white p-3 text-sm text-black shadow-lg dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        >
          {note}
        </div>
      )}
    </>
  );
}

export function OrganizationTierFields({
  defaultOrganization,
  defaultTier,
  labelClass,
  inputClass,
}: {
  defaultOrganization: string;
  defaultTier: string;
  labelClass: string;
  inputClass: string;
}) {
  const [organization, setOrganization] = useState(defaultOrganization);
  const [tier, setTier] = useState(defaultTier);
  const tierOptions = tierOptionsFor(organization);

  return (
    <>
      <label className={labelClass}>
        Organization
        <select
          name="grading_company"
          required
          value={organization}
          onChange={(e) => {
            const next = e.target.value;
            setOrganization(next);
            if (!(tier in tierOptionsFor(next))) setTier("");
          }}
          className={inputClass}
        >
          <option value="" disabled>
            Select organization
          </option>
          {organizations.map((org) => (
            <option key={org} value={org}>
              {org}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Submission tier
        <select
          name="submission_tier"
          required
          disabled={!organization}
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <option value="" disabled>
            {organization ? "Select tier" : "Select organization first"}
          </option>
          {Object.entries(tierOptions).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

export function DeleteButton({ name }: { name: string }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm(`Delete "${name}"? This also removes its product and images.`)) {
          e.preventDefault();
        }
      }}
      className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
    >
      Delete
    </button>
  );
}
