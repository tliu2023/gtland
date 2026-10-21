import { query } from "./db";
import type { Game } from "./games";

// keep in sync with Product.Category in management-api/cards/models.py
export const categoryLabels = {
  single_card: "Singles",
  sealed: "Sealed",
  graded: "Graded",
  deck: "Decks",
} as const;

export type Product = {
  id: number;
  slug: string;
  title: string;
  description: string;
  // "" when no game has been set in the admin
  game: Game | "";
  category: keyof typeof categoryLabels;
  price: string;
  quantity: number;
  status: "available" | "sold" | "hidden";
  // card/graded fields (null for sealed products)
  set: string | null;
  playerOrCharacter: string | null;
  year: number | null;
  condition: string | null;
  gradingCompany: string | null;
  grade: string | null;
  // sealed fields (null for card/graded products)
  boxType: string | null;
  sealedCondition: string | null;
  // relative path (e.g. "products/foo.jpg"); resolve against MEDIA_BASE_URL to render
  primaryImage: string | null;
};

export type ProductDetail = Product & {
  // all image paths for this product, in display order
  images: string[];
};

type ProductRow = {
  id: number;
  slug: string;
  title: string;
  description: string;
  game: Product["game"];
  category: Product["category"];
  price: string;
  quantity: number;
  status: Product["status"];
  card_set: string | null;
  player_or_character: string | null;
  card_year: number | null;
  condition: string | null;
  grading_company: string | null;
  grade: string | null;
  sealed_set: string | null;
  sealed_year: number | null;
  box_type: string | null;
  sealed_condition: string | null;
  primary_image: string | null;
};

const PRODUCT_SELECT = `
  SELECT
    p.id, p.slug, p.title, p.description, p.game, p.category, p.price, p.quantity, p.status,
    cd.set AS card_set, cd.player_or_character, cd.year AS card_year,
    cd.condition, cd.grading_company, cd.grade,
    sd.set AS sealed_set, sd.year AS sealed_year,
    sd.box_type, sd.sealed_condition,
    (
      SELECT pi.image FROM cards_productimage pi
      WHERE pi.product_id = p.id
      ORDER BY pi.sort_order ASC
      LIMIT 1
    ) AS primary_image
  FROM cards_product p
  LEFT JOIN cards_carddetails cd ON cd.product_id = p.id
  LEFT JOIN cards_sealeddetails sd ON sd.product_id = p.id
`;

function mapRow(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    game: row.game,
    category: row.category,
    price: row.price,
    quantity: row.quantity,
    status: row.status,
    set: row.card_set ?? row.sealed_set,
    playerOrCharacter: row.player_or_character,
    year: row.card_year ?? row.sealed_year,
    condition: row.condition,
    gradingCompany: row.grading_company,
    grade: row.grade,
    boxType: row.box_type,
    sealedCondition: row.sealed_condition,
    primaryImage: row.primary_image,
  };
}

export type ProductFilters = {
  game?: Game;
  category?: Product["category"];
  set?: string;
  // free-text match against title, description, player/character, and set
  query?: string;
};

type Facet = "game" | "category" | "set";

const SET_EXPR = "COALESCE(cd.set, sd.set)";

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

// `skip` leaves one facet's own filter out, so its counts show what selecting another option would give
function buildWhere(filters: ProductFilters, skip?: Facet) {
  const conditions = [`p.status = 'available'`];
  const params: unknown[] = [];
  const add = (sql: (i: number) => string, value: unknown) => {
    params.push(value);
    conditions.push(sql(params.length));
  };

  if (filters.game && skip !== "game") add((i) => `p.game = $${i}`, filters.game);
  if (filters.category && skip !== "category") add((i) => `p.category = $${i}`, filters.category);
  if (filters.set && skip !== "set") add((i) => `${SET_EXPR} = $${i}`, filters.set);
  if (filters.query) {
    add(
      (i) =>
        `(p.title ILIKE $${i} OR p.description ILIKE $${i} OR cd.player_or_character ILIKE $${i} OR ${SET_EXPR} ILIKE $${i})`,
      `%${escapeLike(filters.query)}%`,
    );
  }
  return { where: conditions.join(" AND "), params };
}

export async function getAvailableProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const { where, params } = buildWhere(filters);
  let order = "p.created_at DESC";
  if (filters.query) {
    // best match: titles starting with the query, then titles containing it, then other field matches
    params.push(`${escapeLike(filters.query)}%`, `%${escapeLike(filters.query)}%`);
    order = `(p.title ILIKE $${params.length - 1}) DESC, (p.title ILIKE $${params.length}) DESC, p.created_at DESC`;
  }

  const rows = await query<ProductRow>(`${PRODUCT_SELECT} WHERE ${where} ORDER BY ${order}`, params);
  return rows.map(mapRow);
}

export type FacetOption = { value: string; count: number };
export type ProductFacets = Record<Facet, FacetOption[]>;

const FACET_EXPR: Record<Facet, string> = { game: "p.game", category: "p.category", set: SET_EXPR };

async function facetCounts(filters: ProductFilters, facet: Facet): Promise<FacetOption[]> {
  const { where, params } = buildWhere(filters, facet);
  const expr = FACET_EXPR[facet];
  return query<FacetOption>(
    `SELECT ${expr} AS value, COUNT(*)::int AS count
     FROM cards_product p
     LEFT JOIN cards_carddetails cd ON cd.product_id = p.id
     LEFT JOIN cards_sealeddetails sd ON sd.product_id = p.id
     WHERE ${where} AND ${expr} IS NOT NULL AND ${expr} <> ''
     GROUP BY 1 ORDER BY 1`,
    params,
  );
}

export async function getProductFacets(filters: ProductFilters): Promise<ProductFacets> {
  const [game, category, set] = await Promise.all([
    facetCounts(filters, "game"),
    facetCounts(filters, "category"),
    facetCounts(filters, "set"),
  ]);
  return { game, category, set };
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const rows = await query<ProductRow>(
    `${PRODUCT_SELECT} WHERE p.slug = $1 AND p.status != 'hidden'`,
    [slug],
  );
  if (rows.length === 0) return null;

  const images = await query<{ image: string }>(
    `SELECT image FROM cards_productimage WHERE product_id = $1 ORDER BY sort_order ASC`,
    [rows[0].id],
  );

  return { ...mapRow(rows[0]), images: images.map((row) => row.image) };
}

