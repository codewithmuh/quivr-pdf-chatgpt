import { UUID } from "crypto";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSubscriptionApi } from "@/lib/api/subscription/useSubscriptionApi";
import { useBrainContext } from "@/lib/context/BrainProvider/hooks/useBrainContext";
import { useToast } from "@/lib/hooks";
import { useEventTracking } from "@/services/analytics/june/useEventTracking";

import { BrainManagementTab } from "../types";
import { getBrainPermissions } from "../utils/getBrainPermissions";
import { getTargetedTab } from "../utils/getTargetedTab";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useBrainManagementTabs = (customBrainId?: UUID) => {
  const [selectedTab, setSelectedTab] =
    useState<BrainManagementTab>("settings");
  const { allBrains } = useBrainContext();
  const [
    isDeleteOrUnsubscribeRequestPending,
    setIsDeleteOrUnsubscribeRequestPending,
  ] = useState(false);

  useEffect(() => {
    const targetedTab = getTargetedTab();
    if (targetedTab !== undefined) {
      setSelectedTab(targetedTab);
    }
  }, []);

  const { track } = useEventTracking();
  const { publish } = useToast();

  const { unsubscribeFromBrain } = useSubscriptionApi();
  const { deleteBrain, setCurrentBrainId, fetchAllBrains } = useBrainContext();
  const [
    isDeleteOrUnsubscribeModalOpened,
    setIsDeleteOrUnsubscribeModalOpened,
  ] = useState(false);
  const router = useRouter();

  const params = useParams();
  const pathname = usePathname();
  const { t } = useTranslation(["delete_or_unsubscribe_from_brain"]);
  const brainId = customBrainId ?? (params?.brainId as UUID | undefined);

  const { hasEditRights, isOwnedByCurrentUser, isPublicBrain } =
    getBrainPermissions({
      brainId,
      userAccessibleBrains: allBrains,
    });

  const handleUnSubscription = async () => {
    if (brainId === undefined) {
      return;
    }
    await unsubscribeFromBrain(brainId);

    void track("UNSUBSCRIBE_FROM_BRAIN");
    publish({
      variant: "success",
      text: t("successfully_unsubscribed"),
    });
  };

  const handleUnsubscribeOrDeleteBrain = async () => {
    if (brainId === undefined) {
      return;
    }

    setIsDeleteOrUnsubscribeRequestPending(true);
    try {
      if (!isOwnedByCurrentUser) {
        await handleUnSubscription();
      } else {
        await deleteBrain(brainId);
      }
      setCurrentBrainId(null);
      setIsDeleteOrUnsubscribeModalOpened(false);
      void fetchAllBrains();
    } catch (error) {
      console.error("Error deleting brain: ", error);
    } finally {
      pathname === "/studio" ? void fetchAllBrains() : router.push("/studio");
      setIsDeleteOrUnsubscribeRequestPending(false);
    }
  };

  return {
    selectedTab,
    setSelectedTab,
    brainId,
    handleUnsubscribeOrDeleteBrain,
    isDeleteOrUnsubscribeModalOpened,
    setIsDeleteOrUnsubscribeModalOpened,
    hasEditRights,
    isOwnedByCurrentUser,
    isDeleteOrUnsubscribeRequestPending,
    isPublicBrain,
  };
};
