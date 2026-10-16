import { query } from "./db";

export type Product = {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: "single_card" | "sealed" | "graded";
  price: string;
  quantity: number;
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

export async function getAvailableProducts(): Promise<Product[]> {
  const rows = await query<{
    id: number;
    slug: string;
    title: string;
    description: string;
    category: Product["category"];
    price: string;
    quantity: number;
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
  }>(
    `SELECT
       p.id, p.slug, p.title, p.description, p.category, p.price, p.quantity,
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
     WHERE p.status = 'available'
     ORDER BY p.created_at DESC`,
  );

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category,
    price: row.price,
    quantity: row.quantity,
    set: row.card_set ?? row.sealed_set,
    playerOrCharacter: row.player_or_character,
    year: row.card_year ?? row.sealed_year,
    condition: row.condition,
    gradingCompany: row.grading_company,
    grade: row.grade,
    boxType: row.box_type,
    sealedCondition: row.sealed_condition,
    primaryImage: row.primary_image,
  }));
}
