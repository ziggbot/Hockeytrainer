// Which sport this build is for. Set at build time (`VITE_SPORT=innebandy`);
// the hockey app is the default. No imports here, so any module can read it.

export type SportId = "hockey" | "innebandy";

export const SPORT_ID: SportId = import.meta.env.VITE_SPORT === "innebandy" ? "innebandy" : "hockey";
