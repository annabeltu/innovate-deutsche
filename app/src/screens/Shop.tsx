import { KikoAvatar } from "../components/KikoAvatar";
import React, { useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen } from "../components/ui";
import { AccountHeader } from "../components/AccountHeader";
import { AppScenery } from "../components/AppScenery";
import { RoadmapNavigation } from "../components/RoadmapChrome";
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
  const [message, setMessage] = useState("");
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
    setMessage(
      t(bought ? "shopScreen.purchased" : "shopScreen.notEnough", {
        item: t(`shopScreen.items.${item.id}.title`),
      }),
    );
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
      <Text
        className={`text-center font-bold text-ink ${outfit ? "text-xs" : "text-lg"}`}
      >
        {t(`shopScreen.items.${item.id}.title`)}
      </Text>
      {!outfit && (
        <Text className="text-center text-sm leading-5 text-ink">
          {t(`shopScreen.items.${item.id}.description`)}
        </Text>
      )}
      <Text className="mt-auto w-full rounded-full bg-ice px-2 py-2 text-center text-sm font-bold text-brand">
        {equipped === item.id
          ? t("shopScreen.equipped")
          : owned(item)
            ? t(outfit ? "shopScreen.equip" : "shopScreen.owned")
            : `🪙 ${item.price}`}
      </Text>
    </Pressable>
  );
  return (
    <Screen
      compact
      dark
      background={<AppScenery dark />}
      footer={<RoadmapNavigation active="shop" />}
    >
      <AccountHeader dark showHearts={false} />
      <View className="flex-row items-center">
        <View className="flex-1 gap-2">
          <Text
            accessibilityRole="header"
            className="text-5xl font-bold text-white"
          >
            {t("shop")}
          </Text>
          <Text className="text-base leading-6 text-white">
            {t("shopScreen.intro")}
          </Text>
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
            <Text className="text-xs font-bold text-brand">
              {t("shopScreen.new")}
            </Text>
            <Text className="font-bold text-ink">
              {t("shopScreen.transferTitle")}
            </Text>
            <Text className="text-xs leading-4 text-ink">
              {t("shopScreen.transferSub")}
            </Text>
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
            <Text className="font-bold text-brand">
              {bonus.includes(TRANSFER_LESSON)
                ? t("shopScreen.open")
                : `🪙 ${TRANSFER_ITEM.price}`}
            </Text>
          </Pressable>
        </View>
        {!!message && (
          <Text
            accessibilityRole="alert"
            className="text-sm font-bold text-brand"
          >
            {message}
          </Text>
        )}
      </View>
    </Screen>
  );
}

function Section({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="gap-1">
      <Text accessibilityRole="header" className="text-2xl font-bold text-ink">
        {title}
      </Text>
      <Text className="text-sm text-ink">{subtitle}</Text>
    </View>
  );
}
