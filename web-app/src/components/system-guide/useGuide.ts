import { useEffect, useState } from "react";
// Emitted as a hashed static asset and fetched on demand: the guide is ~600 kB
// of JSON, too big to ride along in the page's JavaScript chunk.
import guideUrl from "@/data/guide.json?url";
import {
  buildGuideSearchIndex,
  groupGuidePages,
  type GuideNavGroup,
  type GuidePage,
  type GuideSearchEntry,
} from "./guide-model";

/** Everything the guide page needs, derived once per session. */
export interface GuideData {
  pages: GuidePage[];
  overview: GuidePage | undefined;
  groups: GuideNavGroup[];
  searchIndex: GuideSearchEntry[];
}

export type GuideState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; data: GuideData };

let loaded: GuideData | undefined;
let request: Promise<GuideData> | undefined;

/** Fetches guide.json once; a failed request is forgotten so a retry fetches again. */
function loadGuide(): Promise<GuideData> {
  request ??= fetch(guideUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`guide.json: HTTP ${response.status}`);
      return response.json() as Promise<GuidePage[]>;
    })
    .then((pages) => {
      loaded = { pages, ...groupGuidePages(pages), searchIndex: buildGuideSearchIndex(pages) };
      return loaded;
    })
    .catch((error: unknown) => {
      request = undefined;
      throw error;
    });
  return request;
}

/**
 * The generated system guide (src/data/guide.json from docs/kilavuz). Ready
 * at once after the first load; otherwise loading, then ready or error with
 * a retry.
 */
export function useGuide(): GuideState {
  const [data, setData] = useState(loaded);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (loaded) return;
    let active = true;
    loadGuide().then(
      (guide) => active && setData(guide),
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = () => {
    setFailed(false);
    setAttempt((count) => count + 1);
  };

  if (data) return { status: "ready", data };
  if (failed) return { status: "error", retry };
  return { status: "loading" };
}
