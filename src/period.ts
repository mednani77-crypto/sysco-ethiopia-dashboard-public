import { date, START, type Period } from "./model";

export type DateRange = Pick<Period, "from" | "to">;
export type PeriodSelection = {
  dates: DateRange | null;
  branch: string;
  currency: string;
};
type PeriodAction =
  | { type: "date"; field: keyof DateRange; value: string; range: DateRange }
  | { type: "branch"; value: string }
  | { type: "currency"; value: string }
  | { type: "full" };

export function initialPeriodSelection(): PeriodSelection {
  return { dates: null, branch: "", currency: "ETB" };
}

// Use business dates, never snapshot capture time or the current clock. Keep the
// existing June ledger boundary, including when the first available row is later.
export function masterDateRange(values: Iterable<unknown>): DateRange {
  let first = "",
    last = "";
  for (const value of values) {
    let d = "";
    try {
      d = date(value);
    } catch {
      continue;
    }
    if (!d || d < START) continue;
    if (!first || d < first) first = d;
    if (!last || d > last) last = d;
  }
  if (!first) return { from: START, to: START };
  const year = Number(first.slice(0, 4));
  const june = `${year}-06-01`;
  const from = first < june ? `${year - 1}-06-01` : june;
  return { from: from < START ? START : from, to: last };
}

export function selectedPeriod(
  selection: PeriodSelection,
  range: DateRange,
): Period {
  return {
    ...(selection.dates ?? range),
    branch: selection.branch,
    currency: selection.currency,
  };
}

export function periodReducer(
  state: PeriodSelection,
  action: PeriodAction,
): PeriodSelection {
  if (action.type === "full") return { ...state, dates: null };
  if (action.type === "branch" || action.type === "currency")
    return { ...state, [action.type]: action.value };
  const dates = {
    ...(state.dates ?? action.range),
    [action.field]: action.value,
  };
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(action.value) ||
    date(action.value) !== action.value ||
    dates.from < START ||
    dates.from > dates.to
  )
    return state;
  return { ...state, dates };
}
