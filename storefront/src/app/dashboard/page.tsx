import Image from "next/image";
import Link from "next/link";
import { canEditSubmissions, getCurrentUser } from "@/lib/auth";
import { resolveImageUrl } from "@/lib/media";
import {
  organizations,
  submissionStatuses,
  submissionTiers,
  tierOptionsFor,
  type Organization,
  type SubmissionTier,
} from "@/lib/submission-options";
import {
  getSubmission,
  getSubmissions,
  submissionSortKeys,
  type Submission,
  type SubmissionQuery,
  type SubmissionSort,
} from "@/lib/submissions";
import { deleteSubmission, saveSubmission } from "./actions";
import { DeleteButton, ExpandableRow, Modal, NoteCell, OrganizationTierFields } from "./controls";

export const dynamic = "force-dynamic";

const inputClass =
  "rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50";
const labelClass = "flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400";

function SubmissionForm({ card, closeHref }: { card: Submission | null; closeHref: string }) {
  return (
    <form action={saveSubmission} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {card && <input type="hidden" name="id" value={card.id} />}
      <OrganizationTierFields
        defaultOrganization={card?.organization ?? ""}
        defaultTier={card?.submissionTier ?? ""}
        labelClass={labelClass}
        inputClass={inputClass}
      />
      <label className={labelClass}>
        Name
        <input name="name" required maxLength={200} defaultValue={card?.name} className={inputClass} />
      </label>
      <label className={labelClass}>
        Cert number
        <input name="cert_number" maxLength={100} defaultValue={card?.certNumber} className={inputClass} />
      </label>
      <label className={labelClass}>
        Submission number
        <input
          name="submission_number"
          maxLength={100}
          defaultValue={card?.submissionNumber}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Submission date
        <input
          type="date"
          name="submission_date"
          defaultValue={card?.submissionDate ?? ""}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Grade
        <input name="grade" maxLength={20} defaultValue={card?.grade} className={inputClass} />
      </label>
      <label className={labelClass}>
        Status
        <select name="submission_status" defaultValue={card?.status ?? "submission"} className={inputClass}>
          {Object.entries(submissionStatuses).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Image
        <input type="file" name="image" accept="image/*" className="text-sm" />
      </label>
      <label className={`${labelClass} col-span-full`}>
        Note
        <textarea
          name="note"
          rows={3}
          placeholder="Optional details about this submission"
          defaultValue={card?.note}
          className={inputClass}
        />
      </label>
      <div className="col-span-full flex items-center justify-end gap-4">
        <Link href={closeHref} className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          Cancel
        </Link>
        <button
          type="submit"
          className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {card ? "Save changes" : "Add card"}
        </button>
      </div>
    </form>
  );
}

type SearchParams = {
  add?: string;
  edit?: string;
  error?: string;
  q?: string;
  field?: string;
  org?: string;
  tier?: string;
  sort?: string;
  dir?: string;
  view?: string;
  page?: string;
  per?: string;
};

// list state (view/search/filter/sort/paging) that links should carry along
type ListParams = Pick<
  SearchParams,
  "view" | "q" | "field" | "org" | "tier" | "sort" | "dir" | "page" | "per"
>;

const PAGE_SIZES = [10, 25, 50];
const DEFAULT_PAGE_SIZE = 10;

function dashboardHref(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

function parseListParams(params: SearchParams): { filters: SubmissionQuery; list: ListParams } {
  const q = params.q?.trim() || undefined;
  const field = params.field === "submission_number" ? "submission_number" : undefined;
  const org = organizations.includes(params.org as Organization) ? params.org : undefined;
  const tierOptions = org ? tierOptionsFor(org) : submissionTiers;
  const tier = params.tier && params.tier in tierOptions ? (params.tier as SubmissionTier) : undefined;
  const sort = submissionSortKeys.includes(params.sort as SubmissionSort)
    ? (params.sort as SubmissionSort)
    : undefined;
  const dir = sort && params.dir === "desc" ? "desc" : sort ? "asc" : undefined;
  const view = params.view === "submissions" ? "submissions" : undefined;
  const pageNumber = Number(params.page);
  const page = Number.isInteger(pageNumber) && pageNumber > 1 ? String(pageNumber) : undefined;
  const perNumber = Number(params.per);
  const per = PAGE_SIZES.includes(perNumber) && perNumber !== DEFAULT_PAGE_SIZE ? String(perNumber) : undefined;

  return {
    filters: { search: q, searchField: field, organization: org, tier, sort, dir },
    list: { view, q, field, org, tier, sort, dir, page, per },
  };
}

// first, last, and neighbors of the current page; null marks a gap
function pageNumbers(current: number, total: number): (number | null)[] {
  const pages = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const result: (number | null)[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) result.push(null);
    result.push(p);
  });
  return result;
}

function Pagination({
  list,
  page,
  perPage,
  total,
  noun,
}: {
  list: ListParams;
  page: number;
  perPage: number;
  total: number;
  noun: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const hrefFor = (p: number) => dashboardHref({ ...list, page: p > 1 ? p : undefined });
  const linkClass = "rounded px-2.5 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800";
  const disabledClass = "rounded px-2.5 py-1 opacity-40";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm text-zinc-600 dark:text-zinc-400">
      <div className="flex items-center gap-1">
        <span className="mr-1">Rows per page:</span>
        {PAGE_SIZES.map((size) => (
          <Link
            key={size}
            href={dashboardHref({
              ...list,
              per: size === DEFAULT_PAGE_SIZE ? undefined : size,
              page: undefined,
            })}
            aria-current={size === perPage ? "true" : undefined}
            className={
              size === perPage
                ? "rounded bg-black px-2.5 py-1 text-white dark:bg-white dark:text-black"
                : linkClass
            }
          >
            {size}
          </Link>
        ))}
      </div>
      <span>
        Showing {start + 1}
        {"\u2013"}
        {Math.min(start + perPage, total)} of {total} {noun}
      </span>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={linkClass}>
            Previous
          </Link>
        ) : (
          <span className={disabledClass}>Previous</span>
        )}
        {pageNumbers(page, totalPages).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="px-1">
              {"\u2026"}
            </span>
          ) : (
            <Link
              key={p}
              href={hrefFor(p)}
              aria-current={p === page ? "page" : undefined}
              className={
                p === page
                  ? "rounded bg-black px-2.5 py-1 text-white dark:bg-white dark:text-black"
                  : linkClass
              }
            >
              {p}
            </Link>
          ),
        )}
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} className={linkClass}>
            Next
          </Link>
        ) : (
          <span className={disabledClass}>Next</span>
        )}
      </nav>
    </div>
  );
}

type SubmissionGroup = { submissionNumber: string; date: string | null; cards: Submission[] };

function groupBySubmission(cards: Submission[]): SubmissionGroup[] {
  const groups = new Map<string, Submission[]>();
  for (const card of cards) {
    const key = card.submissionNumber.trim();
    const group = groups.get(key);
    if (group) group.push(card);
    else groups.set(key, [card]);
  }
  return [...groups]
    .map(([submissionNumber, cards]) => ({
      submissionNumber,
      // first card by date; ISO dates sort correctly as strings
      date: cards.map((c) => c.submissionDate).filter((d) => d !== null).sort()[0] ?? null,
      cards,
    }))
    .sort(
      (a, b) =>
        (a.date === null ? 1 : 0) - (b.date === null ? 1 : 0) ||
        (a.date ?? "").localeCompare(b.date ?? "") ||
        (a.submissionNumber ? 0 : 1) - (b.submissionNumber ? 0 : 1) ||
        a.submissionNumber.localeCompare(b.submissionNumber, undefined, { numeric: true }),
    );
}

function uniqueValues(values: (string | null)[]) {
  return [...new Set(values.filter(Boolean))].join(", ") || "-";
}

function ViewToggle({ list }: { list: ListParams }) {
  const views = [
    { value: undefined, label: "Cards" },
    { value: "submissions", label: "Submissions" },
  ];
  return (
    <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      {views.map(({ value, label }) => {
        const active = list.view === value;
        return (
          <Link
            key={label}
            href={dashboardHref({ ...list, view: value, page: undefined })}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 ${
              active
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

function SubmissionGroups({
  groups,
  list,
  canEdit,
}: {
  groups: SubmissionGroup[];
  list: ListParams;
  canEdit: boolean;
}) {
  const headings = ["", "Submission #", "Organization", "Tier", "Date", "Cards"];
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
          <tr>
            {headings.map((heading) => (
              <th key={heading} className="px-4 py-3 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 text-black dark:divide-zinc-800 dark:text-zinc-50">
          {groups.map(({ submissionNumber, date, cards }) => (
            <ExpandableRow
              key={submissionNumber || "unassigned"}
              label={submissionNumber ? `submission ${submissionNumber}` : "cards without a submission number"}
              colSpan={headings.length}
              defaultOpen={Boolean(list.q)}
              cells={
                <>
                  <td className="px-4 py-3 font-medium">{submissionNumber || "No submission #"}</td>
                  <td className="px-4 py-3">{uniqueValues(cards.map((c) => c.organization))}</td>
                  <td className="px-4 py-3">
                    {uniqueValues(cards.map((c) => submissionTiers[c.submissionTier]))}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{date ?? "-"}</td>
                  <td className="px-4 py-3">{cards.length}</td>
                </>
              }
            >
              <SubmissionTable submissions={cards} list={list} canEdit={canEdit} />
            </ExpandableRow>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const columns: { label: string; sort?: SubmissionSort }[] = [
  { label: "Image" },
  { label: "Name", sort: "name" },
  { label: "Organization", sort: "organization" },
  { label: "Tier", sort: "tier" },
  { label: "Cert #", sort: "cert" },
  { label: "Submission #", sort: "submission" },
  { label: "Status" },
  { label: "Grade", sort: "grade" },
  { label: "Note" },
  { label: "" },
];

function SortHeader({ label, column, list }: { label: string; column: SubmissionSort; list: ListParams }) {
  const active = list.sort === column;
  // click cycle: ascending -> descending -> back to default (date)
  const next = !active
    ? { sort: column, dir: "asc" }
    : list.dir === "asc"
      ? { sort: column, dir: "desc" }
      : { sort: undefined, dir: undefined };

  return (
    <th
      className="px-4 py-3 font-medium"
      aria-sort={active ? (list.dir === "asc" ? "ascending" : "descending") : undefined}
    >
      <Link
        href={dashboardHref({ ...list, ...next, page: undefined })}
        className={`inline-flex items-center gap-1 whitespace-nowrap hover:text-black dark:hover:text-zinc-50 ${
          active ? "text-black dark:text-zinc-50" : ""
        }`}
      >
        {label}
        <span aria-hidden className={active ? "" : "opacity-30"}>
          {active ? (list.dir === "asc" ? "\u2191" : "\u2193") : "\u2195"}
        </span>
      </Link>
    </th>
  );
}

function FilterBar({ list }: { list: ListParams }) {
  const tierOptions = list.org ? tierOptionsFor(list.org) : submissionTiers;
  const hasFilters = list.q || list.org || list.tier;

  return (
    <form
      action="/dashboard"
      className="mb-4 flex flex-wrap items-end gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {list.view && <input type="hidden" name="view" value={list.view} />}
      {list.per && <input type="hidden" name="per" value={list.per} />}
      {list.sort && <input type="hidden" name="sort" value={list.sort} />}
      {list.dir && <input type="hidden" name="dir" value={list.dir} />}
      <label className={labelClass}>
        Search by
        <select name="field" defaultValue={list.field ?? "name"} className={inputClass}>
          <option value="name">Name</option>
          <option value="submission_number">Submission #</option>
        </select>
      </label>
      <label className={`${labelClass} min-w-[200px] flex-1`}>
        Search
        <input type="search" name="q" defaultValue={list.q ?? ""} placeholder="Search..." className={inputClass} />
      </label>
      <label className={labelClass}>
        Organization
        <select name="org" defaultValue={list.org ?? ""} className={inputClass}>
          <option value="">All</option>
          {organizations.map((org) => (
            <option key={org} value={org}>
              {org}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Tier
        <select name="tier" defaultValue={list.tier ?? ""} className={inputClass}>
          <option value="">All</option>
          {Object.entries(tierOptions).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        Apply
      </button>
      {hasFilters && (
        <Link
          href={dashboardHref({ view: list.view, sort: list.sort, dir: list.dir, per: list.per })}
          className="py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Clear filters
        </Link>
      )}
    </form>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  // anyone can view; only admin and grading_admin get add/edit/delete
  const canEdit = canEditSubmissions(user);
  const { filters, list } = parseListParams(params);
  const editId = canEdit ? Number(params.edit) : NaN;
  const [submissions, editing] = await Promise.all([
    getSubmissions(filters),
    Number.isInteger(editId) && editId > 0 ? getSubmission(editId) : null,
  ]);
  const hasFilters = Boolean(list.q || list.org || list.tier);
  const groups = list.view === "submissions" ? groupBySubmission(submissions) : null;
  const totalRows = groups ? groups.length : submissions.length;
  const perPage = Number(list.per ?? DEFAULT_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(totalRows / perPage));
  const page = Math.min(Number(list.page ?? 1), totalPages);
  const pageStart = (page - 1) * perPage;
  const modalOpen = canEdit && (Boolean(editing) || params.add === "1");
  const errorBanner = params.error && (
    <p className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      {params.error}
    </p>
  );

  return (
    <div className="flex-1 bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Submissions
        </h1>

        {!modalOpen && errorBanner}

        {modalOpen && (
          <Modal title={editing ? `Edit ${editing.name}` : "Add submission"} closeHref={dashboardHref(list)}>
            {errorBanner}
            {/* key resets uncontrolled inputs when switching between add/edit */}
            <SubmissionForm key={editing?.id ?? "new"} card={editing} closeHref={dashboardHref(list)} />
          </Modal>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <ViewToggle list={list} />
          {canEdit && (
            <Link
              href={dashboardHref({ ...list, add: 1 })}
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              + Add submission
            </Link>
          )}
        </div>

        {submissions.length === 0 && !hasFilters ? (
          <p className="text-zinc-600 dark:text-zinc-400">No graded cards are currently in submission.</p>
        ) : (
          <>
            <FilterBar list={list} />
            <p className="mb-2 text-sm text-zinc-500">
              {groups && `${groups.length} ${groups.length === 1 ? "submission" : "submissions"} \u00b7 `}
              {submissions.length} {submissions.length === 1 ? "card" : "cards"}
              {groups ? " \u00b7 sorted by date" : !list.sort && " \u00b7 sorted by submission date"}
            </p>
            {submissions.length === 0 ? (
              <p className="text-zinc-600 dark:text-zinc-400">No submissions match these filters.</p>
            ) : groups ? (
              <SubmissionGroups
                groups={groups.slice(pageStart, pageStart + perPage)}
                list={list}
                canEdit={canEdit}
              />
            ) : (
              <SubmissionTable
                submissions={submissions.slice(pageStart, pageStart + perPage)}
                list={list}
                canEdit={canEdit}
              />
            )}
            {totalRows > 0 && (
              <Pagination
                list={list}
                page={page}
                perPage={perPage}
                total={totalRows}
                noun={groups ? "submissions" : "cards"}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function SubmissionTable({
  submissions,
  list,
  canEdit,
}: {
  submissions: Submission[];
  list: ListParams;
  canEdit: boolean;
}) {
  const visibleColumns = canEdit ? columns : columns.filter(({ label }) => label !== "");
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
          <tr>
            {visibleColumns.map(({ label, sort }) =>
              sort ? (
                <SortHeader key={label} label={label} column={sort} list={list} />
              ) : (
                <th key={label} className="px-4 py-3 font-medium">
                  {label}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 text-black dark:divide-zinc-800 dark:text-zinc-50">
          {submissions.map((card) => (
            <tr key={card.id}>
              <td className="px-4 py-2">
                <div className="relative h-16 w-12 bg-zinc-100 dark:bg-zinc-800">
                  {card.primaryImage ? (
                    <Image
                      src={resolveImageUrl(card.primaryImage)}
                      alt={card.name}
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-zinc-400">-</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2 font-medium">{card.name}</td>
              <td className="px-4 py-2">{card.organization}</td>
              <td className="px-4 py-2 whitespace-nowrap">{submissionTiers[card.submissionTier]}</td>
              <td className="px-4 py-2">{card.certNumber}</td>
              <td className="px-4 py-2">{card.submissionNumber}</td>
              <td className="px-4 py-2 whitespace-nowrap">{submissionStatuses[card.status]}</td>
              <td className="px-4 py-2">{card.grade}</td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                <NoteCell note={card.note} />
              </td>
              {canEdit && (
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <Link
                      href={dashboardHref({ ...list, edit: card.id })}
                      className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
                    >
                      Edit
                    </Link>
                    <form action={deleteSubmission}>
                      <input type="hidden" name="id" value={card.id} />
                      <DeleteButton name={card.name} />
                    </form>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
