import { swipeDirection } from "./swipe-card";

// A 400px card commits at 120px.
test.each([
  [120, 0, "right"],
  [-120, 0, "left"],
  [119, 0, null],
  [0, 0, null],
  // A fling: over 600 px/s with at least 40px of movement, the same way.
  [40, 700, "right"],
  [-40, -700, "left"],
  [39, 700, null],
  [40, 500, null],
  [-50, 700, null],
])("offset %i at %i px/s goes %s", (offset, velocity, expected) => {
  expect(swipeDirection(offset, velocity, 400)).toBe(expected);
});
