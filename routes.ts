/**
 * An array of routes that are accessible to the public
 * These routes do not require authentication
 * @type {string[]}
 */
export const publicRoutes = [
  "/token-verification",
  "/api/[storeId]/products/[productId]/reviews",
  "/api/[storeId]/products/[productId]/reviews/[reviewId]",
  "/api/products/[productId]/reviews/[reviewId]",
  "/api/[storeId]/products",
  "/api/products",
];

/**
 * An array of routes that are used for authentication
 * These routes will redirect logged in users to /settings
 * @type {string[]}
 */

export const authRoutes = ["/login", "/sign-up", "/forget", "/new-password"];

/**
 * The prefix for API authentication routes
 * Routes that start with this prefix are used for API authentication purposes
 * @type {string}
 */

export const apiAuthPrefix = "/api";

/**
 * The default redirect path after logging in
 * @type {string}
 */
export const DEFAULT_LOGIN_REDIRECT = "/";
