// keep in sync with Product.Game in management-api/cards/models.py
export const games = {
  one_piece: "One Piece TCG",
  gundam: "Gundam TCG",
  riftbound: "Riftbound",
  union_arena: "Union Arena",
  naruto_mythos: "Naruto Mythos",
  naruto: "Naruto TCG",
} as const;

export type Game = keyof typeof games;

export function isGame(value: unknown): value is Game {
  return typeof value === "string" && value in games;
}
