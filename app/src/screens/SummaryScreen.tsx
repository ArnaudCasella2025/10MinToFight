import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Workout } from "../types/workout";

interface Props {
  workout: Workout;
  onDone: () => void;
}

export function SummaryScreen({ workout, onDone }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🥇</Text>
      <Text style={styles.title}>Entraînement terminé !</Text>
      <Text style={styles.subtitle}>
        {workout.exercises.length} exercices réalisés · bravo, à demain 7h pour le prochain !
      </Text>

      <View style={styles.list}>
        {workout.exercises.map((exercise, index) => (
          <Text key={exercise.slug} style={styles.listItem}>
            ✓ {index + 1}. {exercise.name}
          </Text>
        ))}
      </View>

      <Pressable style={styles.button} onPress={onDone}>
        <Text style={styles.buttonText}>Retour à l'accueil</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1D3557",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  list: {
    marginTop: 24,
    alignSelf: "stretch",
  },
  listItem: {
    fontSize: 15,
    color: "#333",
    marginBottom: 6,
  },
  button: {
    marginTop: 32,
    backgroundColor: "#1D3557",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
