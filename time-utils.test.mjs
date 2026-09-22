import test from "node:test";
import assert from "node:assert/strict";
import { convertTimestamp, formatGMTDate } from "./time-utils.mjs";

test("converts epoch zero and negative seconds in GMT", () => {
  assert.equal(convertTimestamp("0").gmt, "Thu, 01 Jan 1970 00:00:00 GMT");
  assert.equal(convertTimestamp("-1").iso, "1969-12-31T23:59:59.000Z");
});

test("converts significant timestamps past the 32-bit boundary", () => {
  assert.equal(convertTimestamp("1234567890").iso, "2009-02-13T23:31:30.000Z");
  assert.equal(convertTimestamp("2147483648").iso, "2038-01-19T03:14:08.000Z");
});

test("explicit millisecond mode preserves subsecond precision", () => {
  assert.equal(
    convertTimestamp("1234567890123", "milliseconds").iso,
    "2009-02-13T23:31:30.123Z",
  );
  assert.equal(
    convertTimestamp(" 1000 ", "milliseconds").iso,
    "1970-01-01T00:00:01.000Z",
  );
});

test("rejects empty, fractional, nondecimal and out-of-range input", () => {
  for (const input of [
    "",
    " ",
    "12.5",
    "1e9",
    "0x10",
    "hello",
    "Infinity",
    "8640000000001",
  ]) {
    assert.throws(() => convertTimestamp(input), /Enter|range/);
  }
  assert.throws(
    () => convertTimestamp("9007199254740992", "milliseconds"),
    /range/,
  );
});

test("GMT date labels distinguish BCE dates from CE dates", () => {
  assert.equal(formatGMTDate(convertTimestamp("0").date), "01 Jan 1970");
  assert.equal(formatGMTDate(convertTimestamp("-62167219200").date), "01 Jan 1 BC");
  assert.equal(formatGMTDate(convertTimestamp("-62135596800").date), "01 Jan 1");
});
