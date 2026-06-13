type BadgeColor = "green" | "gray" | "amber" | "blue" | "red";

const colors: Record<BadgeColor, string> = {
  green: "bg-green-100 text-green-800",
  gray: "bg-gray-100 text-gray-700",
  amber: "bg-amber-100 text-amber-800",
  blue: "bg-blue-100 text-blue-800",
  red: "bg-red-100 text-red-700",
};

export function Badge({
  color,
  children,
}: {
  color: BadgeColor;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}
    >
      {children}
    </span>
  );
}
