import { createScenarioFromPack } from "../incidents/create-scenario";
import { CANONICAL_PACK } from "../incidents";

export const createScenarioA = () => createScenarioFromPack(CANONICAL_PACK);
