import type { Area } from "../domain/types";
import { SPORT } from "../sport";
import { CourtDiagram } from "./CourtDiagram";
import { RinkDiagram } from "./RinkDiagram";

/** Where a drill runs: the rink in the hockey app, the court in the floorball app. */
export function AreaDiagram(props: { area: Area; width?: number }) {
  return SPORT.id === "innebandy" ? <CourtDiagram {...props} /> : <RinkDiagram {...props} />;
}
