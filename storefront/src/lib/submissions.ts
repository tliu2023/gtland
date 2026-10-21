import { query } from "./db";
import { submissionStatuses, type SubmissionTier } from "./submission-options";

export type Submission = {
  id: number;
  name: string;
  certNumber: string;
  submissionNumber: string;
  // ISO date (YYYY-MM-DD) or null
  submissionDate: string | null;
  submissionTier: SubmissionTier;
  organization: string;
  grade: string;
  status: keyof typeof submissionStatuses;
  note: string;
  primaryImage: string | null;
};

const SUBMISSION_SELECT = `
  SELECT
    cd.id, p.title AS name, cd.cert_number AS "certNumber",
    cd.submission_number AS "submissionNumber",
    cd.submission_date::text AS "submissionDate",
    cd.submission_tier AS "submissionTier",
    cd.grading_company AS organization, cd.grade,
    cd.submission_status AS status, cd.note,
    (
      SELECT pi.image FROM cards_productimage pi
      WHERE pi.product_id = p.id
      ORDER BY pi.sort_order ASC
      LIMIT 1
    ) AS "primaryImage"
  FROM cards_carddetails cd
  JOIN cards_product p ON p.id = cd.product_id
  WHERE p.category = 'graded'
`;

// numeric-looking values sort as numbers (so "124" < "1235"), then text; blanks go last
const numericText = (col: string) => [
  `CASE WHEN ${col} ~ '^[0-9]+(\\.[0-9]+)?$' THEN ${col}::numeric END`,
  `NULLIF(${col}, '')`,
];

const SORT_EXPRESSIONS = {
  name: ["LOWER(p.title)"],
  organization: ["NULLIF(cd.grading_company, '')"],
  tier: ["cd.submission_tier"],
  cert: numericText("cd.cert_number"),
  submission: numericText("cd.submission_number"),
  date: ["cd.submission_date"],
  grade: numericText("cd.grade"),
} as const;

export type SubmissionSort = keyof typeof SORT_EXPRESSIONS;

export const submissionSortKeys = Object.keys(SORT_EXPRESSIONS) as SubmissionSort[];

export type SubmissionQuery = {
  search?: string;
  searchField?: "name" | "submission_number";
  organization?: string;
  tier?: SubmissionTier;
  sort?: SubmissionSort;
  dir?: "asc" | "desc";
};

export async function getSubmissions(filters: SubmissionQuery = {}): Promise<Submission[]> {
  const conditions = [`cd.submission_status = 'submission'`];
  const params: unknown[] = [];

  if (filters.search) {
    params.push(`%${filters.search.replace(/[\\%_]/g, "\\$&")}%`);
    const column = filters.searchField === "submission_number" ? "cd.submission_number" : "p.title";
    conditions.push(`${column} ILIKE $${params.length}`);
  }
  if (filters.organization) {
    params.push(filters.organization);
    conditions.push(`cd.grading_company = $${params.length}`);
  }
  if (filters.tier) {
    params.push(filters.tier);
    conditions.push(`cd.submission_tier = $${params.length}`);
  }

  const dir = filters.dir === "desc" ? "DESC" : "ASC";
  const order = (filters.sort ? SORT_EXPRESSIONS[filters.sort] : SORT_EXPRESSIONS.date)
    .map((expr) => `${expr} ${dir} NULLS LAST`)
    .join(", ");

  return query<Submission>(
    `${SUBMISSION_SELECT} AND ${conditions.join(" AND ")}
     ORDER BY ${order}, LOWER(p.title) ASC, cd.id ASC`,
    params,
  );
}

export async function getSubmission(id: number): Promise<Submission | null> {
  const rows = await query<Submission>(`${SUBMISSION_SELECT} AND cd.id = $1`, [id]);
  return rows[0] ?? null;
}
