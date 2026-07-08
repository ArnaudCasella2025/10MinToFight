import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  secondsLeft: number;
  totalSeconds: number;
  phase: "work" | "rest";
}

const WORK_COLOR = "#E63946";
const REST_COLOR = "#2A9D8F";

export function Timer({ secondsLeft, totalSeconds, phase }: Props) {
  const color = phase === "work" ? WORK_COLOR : REST_COLOR;
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;

  return (
    <View style={[styles.ring, { borderColor: color, opacity: 0.4 + progress * 0.6 }]}>
      <Text style={[styles.seconds, { color }]}>{secondsLeft}</Text>
      <Text style={[styles.label, { color }]}>{phase === "work" ? "GO !" : "Récupération"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  seconds: {
    fontSize: 56,
    fontWeight: "700",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
    textTransform: "uppercase",
  },
});
