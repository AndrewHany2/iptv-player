/**
 * Back-compat shim. The poster card is now the single Aurora implementation in
 * presentation/components/PosterCard.web (explicit height, cyan focus/hover ring,
 * no Tamagui, no transform-scale). Kept so existing imports keep working.
 */
export { default } from "../presentation/components/PosterCard.web";
