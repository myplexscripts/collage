export interface PlexUser {
  id: number;
  uuid: string;
  username: string;
  title: string;
  email: string;
  thumb: string;
}

export interface PlexConnection {
  protocol: string;
  address: string;
  port: number;
  uri: string;
  local: boolean;
  relay: boolean;
}

export interface PlexServer {
  name: string;
  clientIdentifier: string;
  accessToken: string;
  owned: boolean;
  platform?: string;
  productVersion?: string;
  connections: PlexConnection[];
  /** Best reachable connection, resolved at pick time */
  baseUri?: string;
}

export interface PlexLibrary {
  key: string;
  title: string;
  type: "movie" | "show";
  count?: number;
}

export interface PlexItem {
  ratingKey: string;
  title: string;
  year?: number;
  thumb?: string;
  art?: string;
  addedAt?: number;
  lastViewedAt?: number;
  viewCount?: number;
  leafCount?: number;
  viewedLeafCount?: number;
  rating?: number;
  audienceRating?: number;
  userRating?: number;
  contentRating?: string;
  type: "movie" | "show";
  libraryKey: string;
  genres: string[];
}

export type LayoutId =
  | "grid"
  | "mosaic"
  | "masonry"
  | "polaroid"
  | "hex"
  | "filmstrip";

export type EffectId =
  | "none"
  | "vivid"
  | "faded"
  | "vintage"
  | "sepia"
  | "grayscale"
  | "noir";

export type SortId =
  | "added"
  | "lastViewed"
  | "rating"
  | "year"
  | "title"
  | "random";

export type BackgroundMode = "solid" | "gradient" | "posterBlur";
export type TitlePosition = "top" | "center" | "bottom";

export interface CollageSettings {
  layout: LayoutId;
  canvasPreset: string;
  canvasWidth: number;
  canvasHeight: number;
  columns: number;
  /** All size-ish values are in "per-mille of canvas width" units */
  gap: number;
  padding: number;
  fullBleed: boolean;
  cornerRadius: number;
  borderEnabled: boolean;
  borderColor: string;
  borderWidth: number;
  shadow: boolean;
  effect: EffectId;
  bgMode: BackgroundMode;
  bgColor: string;
  bgColor2: string;
  bgAngle: number;
  titleEnabled: boolean;
  titleText: string;
  titleFont: string;
  titleSize: number;
  titleColor: string;
  titlePosition: TitlePosition;
  titleUppercase: boolean;
  titleLetterSpacing: number;
  titleScrim: boolean;
  polaroidCaptions: boolean;
  sort: SortId;
  seed: number;
  limit: number;
  genreFilter: string[];
  yearMin: number | null;
  yearMax: number | null;
  unwatchedOnly: boolean;
  minRating: number;
}
