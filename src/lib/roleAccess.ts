import type { UserRole } from "@/types";

const validRoles: UserRole[] = ["customer", "admin", "sales_rep"];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && validRoles.includes(value as UserRole);
}

export function roleHomePath(role: UserRole | undefined) {
  if (role === "admin") return "/admin";
  if (role === "sales_rep") return "/pos";
  return "/account";
}

export function postLoginPath(role: UserRole, requestedPath = "/account") {
  if (role !== "customer") return roleHomePath(role);

  const customerPaths = ["/account", "/cart", "/checkout", "/track/"];
  return customerPaths.some((path) => requestedPath === path || requestedPath.startsWith(path))
    ? requestedPath
    : "/account";
}
