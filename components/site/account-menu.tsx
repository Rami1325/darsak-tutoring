import { getTranslations } from "next-intl/server";

import { AccountControls } from "@/components/site/account-controls";
import { getAuthUser } from "@/lib/auth/session";
import { countInboxAttention } from "@/lib/messaging/queries";

/**
 * Rendered into `SiteHeader`'s `account` slot by the dynamic pages — dashboard,
 * onboarding, messages, inquiry, schedule. Keeping it out of the header itself
 * is what lets the rest of the site stay statically generated; those pages get
 * the same controls in the browser from `ViewerControls` instead.
 */
export async function AccountMenu({
  showDashboard = true,
}: {
  showDashboard?: boolean;
}) {
  const t = await getTranslations("nav");
  const auth = await getTranslations("auth");

  const user = await getAuthUser();
  const inbox = user ? (await countInboxAttention(user.id)).total : 0;

  return (
    <AccountControls
      showDashboard={showDashboard}
      inbox={inbox}
      labels={{
        dashboard: t("dashboard"),
        schedule: t("schedule"),
        messages: t("messages"),
        signOut: auth("signOut"),
      }}
    />
  );
}
