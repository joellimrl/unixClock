/** Convert decimal integer Unix seconds or milliseconds without local timezone offsets. */
export function convertTimestamp(input, unit = "seconds") {
  const value = String(input).trim();
  if (!/^-?\d+$/.test(value))
    throw new Error("Enter a whole-number Unix timestamp, such as 1234567890.");
  const number = Number(value);
  const milliseconds = unit === "milliseconds" ? number : number * 1000;
  if (!Number.isSafeInteger(number) || Math.abs(milliseconds) > 8.64e15) {
    throw new Error(
      "This timestamp is outside the supported date range. Check the value and unit.",
    );
  }
  const date = new Date(milliseconds);
  return { date, gmt: date.toUTCString(), iso: date.toISOString() };
}

const dateOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
};
const dateFormat = new Intl.DateTimeFormat("en-GB", dateOptions);
const bceDateFormat = new Intl.DateTimeFormat("en-GB", {
  ...dateOptions,
  era: "short",
});

/** Keep dates before 1 CE unambiguous without adding an era to modern dates. */
export function formatGMTDate(date) {
  return (date.getUTCFullYear() <= 0 ? bceDateFormat : dateFormat).format(date);
}
