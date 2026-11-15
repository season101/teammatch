import { render } from "@testing-library/react";
import { Avatar } from "./avatar";

test("shows the photo when there is one, hidden from screen readers", () => {
  const { container } = render(
    <Avatar name="Sam Rivera" url="/api/v1/profiles/7/avatar/?v=1" className="size-9" />,
  );
  const img = container.querySelector("img");
  expect(img).toHaveAttribute("src", "/api/v1/profiles/7/avatar/?v=1");
  expect(img).toHaveAttribute("alt", "");
});

test("falls back to initials", () => {
  const { container } = render(<Avatar name="Sam Rivera" url={null} className="size-9" />);
  expect(container.querySelector("img")).toBeNull();
  expect(container).toHaveTextContent("SR");
});
