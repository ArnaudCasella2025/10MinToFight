import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CATEGORY_LABELS, DISCIPLINE_LABELS, Workout } from "../types/workout";
import { CategoryIcon } from "../components/CategoryIcon";

interface Props {
  workout: Workout | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onStart: () => void;
}

export function HomeScreen({ workout, loading, refreshing, onRefresh, onStart }: Props) {
  if (loading && !workout) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E63946" />
        <Text style={styles.loadingText}>Préparation de ton entraînement du jour...</Text>
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Impossible de charger l'entraînement.</Text>
      </View>
    );
  }

  const totalMinutes = Math.round(
    workout.exercises.reduce((sum, ex) => sum + ex.workSeconds + ex.restSeconds, 0) / 60,
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>10 Min To Fight</Text>
      <Text style={styles.subtitle}>Entraînement du {workout.date} · ~{totalMinutes} min · sans équipement</Text>

      {workout.exercises.map((exercise, index) => (
        <View key={exercise.slug} style={styles.row}>
          <CategoryIcon category={exercise.category} size={44} />
          <View style={styles.rowText}>
            <Text style={styles.rowIndex}>
              {index + 1}. {exercise.name}
            </Text>
            <Text style={styles.rowCategory}>
              {CATEGORY_LABELS[exercise.category]}
              {exercise.discipline ? ` · ${DISCIPLINE_LABELS[exercise.discipline]}` : ""}
            </Text>
          </View>
        </View>
      ))}

      <Pressable style={styles.startButton} onPress={onStart}>
        <Text style={styles.startButtonText}>Démarrer l'entraînement</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#555",
    textAlign: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1D3557",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  rowText: {
    marginLeft: 14,
    flexShrink: 1,
  },
  rowIndex: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1D3557",
  },
  rowCategory: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  startButton: {
    marginTop: 16,
    backgroundColor: "#E63946",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
