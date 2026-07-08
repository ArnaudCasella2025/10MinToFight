import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CATEGORY_COLORS, Category } from "../types/workout";

const CATEGORY_EMOJI: Record<Category, string> = {
  cardio: "🏃",
  strength_upper: "💪",
  stretch: "🧘",
  martial_arts: "🥊",
};

interface Props {
  category: Category;
  size?: number;
}

/** Fallback illustration shown whenever no AI-generated image is available yet for an exercise. */
export function CategoryIcon({ category, size = 96 }: Props) {
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${CATEGORY_COLORS[category]}22`,
          borderColor: CATEGORY_COLORS[category],
        },
      ]}
    >
      <Text style={{ fontSize: size * 0.45 }}>{CATEGORY_EMOJI[category]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
});
