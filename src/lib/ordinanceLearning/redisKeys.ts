export const ORDINANCE_INDEX_KEY = "ordinance-learning:index";
export const ORDINANCE_QUEUE_KEY = "ordinance-learning:queue";

export const ordinanceRecordKey = (slug: string) => `ordinance-learning:record:${slug}`;
export const ordinanceLabelKey = (label: string) =>
  `ordinance-learning:label:${label.replace(/\s+/g, "_")}`;
