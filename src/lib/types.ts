export type Point = {
  lat: number;
  lng: number;
  /** epoch ms */
  t: number;
  /** horizontal accuracy in metres, if known */
  acc?: number;
};

export type Activity = {
  id: string;
  name: string;
  /** epoch ms */
  startedAt: number;
  /** moving time in seconds */
  durationSec: number;
  distanceM: number;
  points: Point[];
  source: "gps" | "manual" | "demo";
};
