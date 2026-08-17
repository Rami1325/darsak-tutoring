/**
 * The name of the marker cookie that authorises a password change.
 *
 * Its own module because three places need it and none of them can export it:
 * `lib/auth/actions.ts` is `"use server"`, where every export must be an async
 * function, and the other two are a Route Handler and a page.
 *
 * Set by `/api/auth/confirm` when an emailed link checks out, required by
 * `/reset-password`, and cleared once the password is saved. See the handler
 * for why the session alone is not enough.
 */
export const PASSWORD_RESET_COOKIE = "darsak-password-reset";
