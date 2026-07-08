import React, { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { Category } from "../types/workout";
import { CategoryIcon } from "./CategoryIcon";

interface Props {
  imageUrl: string | null;
  category: Category;
  size?: number;
}

/** Shows the AI-generated illustration for an exercise, falling back to a category icon if unavailable. */
export function ExerciseVisual({ imageUrl, category, size = 220 }: Props) {
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(Boolean(imageUrl));

  if (!imageUrl || failed) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <CategoryIcon category={category} size={size * 0.5} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: 16 }}
        resizeMode="cover"
        onError={() => setFailed(true)}
        onLoadEnd={() => setLoading(false)}
      />
      {loading && <ActivityIndicator style={StyleSheet.absoluteFill} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F1F1",
    borderRadius: 16,
    overflow: "hidden",
  },
});
