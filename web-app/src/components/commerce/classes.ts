/**
 * Class strings shared by the commerce tables. Kept out of component files so those
 * export components only (fast refresh).
 */

/** Gives a Table inside a `panel` a 16px inset on its first and last columns (the primitive sets 0). */
export const panelTableClass =
  "[&_td:first-child]:pl-4 [&_th:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:last-child]:pr-4";
