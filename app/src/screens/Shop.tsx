import { KikoAvatar } from "../components/KikoAvatar";
import { Txt } from "../components/Txt";
import React, { useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Nav, Screen } from "../components/ui";
import { AccountHeader } from "../components/AccountHeader";
import { AppScenery } from "../components/AppScenery";

import { ShopArt } from "../components/ShopArt";
import {
  shopCatalog,
  TRANSFER_LESSON,
  TRANSFER_ITEM,
  type OutfitId,
  type ShopItem,
} from "../shop/catalog";
import { useApp } from "../state/useApp";

/** Reference-based shop with atomic coin purchases and a real bonus-lesson unlock. */
export function Shop() {
  const coins = useApp((state) => state.coins);
  const purchases = useApp((state) => state.purchases);
  const bonus = useApp((state) => state.bonus);
  const equipped = useApp((state) => state.equippedOutfit);
  const { t } = useTranslation();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 350 || fontScale > 1.3;
  // Keep the key, not the text, so feedback follows a language change.
  const [message, setMessage] = useState<{
    key: "shopScreen.purchased" | "shopScreen.notEnough";
    itemId: ShopItem["id"];
  } | null>(null);
  const owned = (item: ShopItem) =>
    purchases.includes(item.id) ||
    (item.id === "transfer" && bonus.includes(TRANSFER_LESSON));
  const activate = (item: ShopItem) => {
    if (item.section === "outfits" && owned(item)) {
      useApp.getState().equipOutfit(item.id as OutfitId);
      return;
    }
    if (item.id === "transfer" && owned(item)) {
      router.replace("/roadmap");
      return;
    }
    const bought = useApp.getState().buy(item.id, item.price);
    setMessage({
      key: bought ? "shopScreen.purchased" : "shopScreen.notEnough",
      itemId: item.id,
    });
  };
  const card = (item: ShopItem, outfit = false) => (
    <Pressable
      key={item.id}
      accessibilityRole="button"
      accessibilityLabel={`${t(`shopScreen.items.${item.id}.title`)}. ${t(owned(item) ? "shopScreen.owned" : "shopScreen.price", { count: item.price })}`}
      accessibilityHint={t(
        owned(item) && outfit ? "shopScreen.equipHint" : "shopScreen.buyHint",
      )}
      accessibilityState={{
        disabled:
          (!owned(item) && coins < item.price) ||
          (owned(item) && item.section === "essentials"),
        selected: equipped === item.id,
      }}
      disabled={
        (!owned(item) && coins < item.price) ||
        (owned(item) && item.section === "essentials")
      }
      onPress={() => activate(item)}
      className={`flex-1 items-center gap-2 overflow-hidden rounded-2xl border-2 bg-white p-3 ${equipped === item.id ? "border-brand" : "border-transparent"}`}
    >
      <ShopArt
        kind={item.art}
        width={outfit ? (stacked ? 150 : Math.max(68, (width - 96) / 3)) : 110}
        height={outfit ? 90 : 85}
      />
      <Txt
        variant={outfit ? "caption" : "subheading"}
        weight="bold"
        className="text-center"
      >
        {t(`shopScreen.items.${item.id}.title`)}
      </Txt>
      {!outfit && (
        <Txt variant="small" className="text-center">
          {t(`shopScreen.items.${item.id}.description`)}
        </Txt>
      )}
      <Txt
        variant="small"
        tone="brand"
        weight="bold"
        className="mt-auto w-full rounded-full bg-ice px-2 py-2 text-center"
      >
        {equipped === item.id
          ? t("shopScreen.equipped")
          : owned(item)
            ? t(outfit ? "shopScreen.equip" : "shopScreen.owned")
            : `🪙 ${item.price}`}
      </Txt>
    </Pressable>
  );
  return (
    <Screen
      compact
      dark
      background={<AppScenery dark />}
      footer={<Nav active="shop" />}
    >
      <AccountHeader dark showHearts={false} />
      <View className="flex-row items-center">
        <View className="flex-1 gap-2">
          <Txt accessibilityRole="header" variant="title" light>
            {t("shop")}
          </Txt>
          <Txt light>{t("shopScreen.intro")}</Txt>
        </View>
        <KikoAvatar size={130} />
      </View>
      <View className="-mx-4 gap-5 rounded-t-3xl bg-ice px-4 pb-6 pt-5">
        <Section
          title={t("shopScreen.essentials")}
          subtitle={t("shopScreen.essentialsSub")}
        />
        <View className={`gap-3 ${stacked ? "flex-col" : "flex-row"}`}>
          {shopCatalog
            .filter((item) => item.section === "essentials")
            .map((item) => card(item))}
        </View>
        <Section
          title={t("shopScreen.outfits")}
          subtitle={t("shopScreen.outfitsSub")}
        />
        <View className={`gap-2 ${stacked ? "flex-col" : "flex-row"}`}>
          {shopCatalog
            .filter((item) => item.section === "outfits")
            .map((item) => card(item, true))}
        </View>
        <Section
          title={t("shopScreen.lessons")}
          subtitle={t("shopScreen.lessonsSub")}
        />
        <View className="flex-row items-center gap-3 rounded-2xl bg-white p-4">
          <ShopArt kind="globe" width={52} />
          <View className="flex-1 gap-1">
            <Txt variant="caption" tone="brand" weight="bold">
              {t("shopScreen.new")}
            </Txt>
            <Txt weight="bold">{t("shopScreen.transferTitle")}</Txt>
            <Txt variant="caption">{t("shopScreen.transferSub")}</Txt>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(
              bonus.includes(TRANSFER_LESSON)
                ? "shopScreen.openLesson"
                : "shopScreen.price",
              { count: TRANSFER_ITEM.price },
            )}
            accessibilityHint={t("shopScreen.buyHint")}
            disabled={
              !bonus.includes(TRANSFER_LESSON) && coins < TRANSFER_ITEM.price
            }
            onPress={() => activate(TRANSFER_ITEM)}
            className="min-h-12 rounded-2xl bg-ice p-3"
          >
            <Txt tone="brand" weight="bold">
              {bonus.includes(TRANSFER_LESSON)
                ? t("shopScreen.open")
                : `🪙 ${TRANSFER_ITEM.price}`}
            </Txt>
          </Pressable>
        </View>
        {message && (
          <Txt
            accessibilityRole="alert"
            variant="small"
            tone="brand"
            weight="bold"
          >
            {t(message.key, {
              item: t(`shopScreen.items.${message.itemId}.title`),
            })}
          </Txt>
        )}
      </View>
    </Screen>
  );
}

function Section({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="gap-1">
      <Txt accessibilityRole="header" variant="heading" weight="bold">
        {title}
      </Txt>
      <Txt variant="small">{subtitle}</Txt>
    </View>
  );
}
