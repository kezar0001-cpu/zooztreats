type AlertVariant = "success" | "error" | "info";

const styles: Record<AlertVariant, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

export function Alert({
  variant,
  children,
}: {
  variant: AlertVariant;
  children: React.ReactNode;
}) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-md border px-4 py-3 text-sm ${styles[variant]}`}
    >
      {children}
    </div>
  );
}
