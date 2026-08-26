import type { IncidentPack } from "../domain/types";
import {
  BUNDLED_INCIDENT_PACKS,
  canonicalIncidentPack,
  catalogCacheIncidentPack,
  paymentQueueIncidentPack,
} from "./bundled-packs";
import { validateIncidentPack } from "./validation";

export const BUNDLED_PACKS: IncidentPack[] =
  BUNDLED_INCIDENT_PACKS.map(validateIncidentPack);

export const CANONICAL_PACK = validateIncidentPack(canonicalIncidentPack);
export const PAYMENT_QUEUE_PACK = validateIncidentPack(
  paymentQueueIncidentPack,
);
export const CATALOG_CACHE_PACK = validateIncidentPack(
  catalogCacheIncidentPack,
);

export const findBundledPack = (packId: string): IncidentPack | undefined =>
  BUNDLED_PACKS.find((pack) => pack.packId === packId);
