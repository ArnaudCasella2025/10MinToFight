import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { playExerciseStartCue, playExerciseStopCue, playWorkoutCompleteCue } from "../audio/cues";
import { exerciseImageUrl } from "../api/workoutClient";
import { ExerciseVisual } from "../components/ExerciseVisual";
import { Timer } from "../components/Timer";
import { CATEGORY_LABELS, DISCIPLINE_LABELS, Workout } from "../types/workout";

type Phase = "work" | "rest";

interface Props {
  workout: Workout;
  onFinish: () => void;
  onExit: () => void;
}

export function WorkoutPlayerScreen({ workout, onFinish, onExit }: Props) {
  useKeepAwake();

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("work");
  const exercise = workout.exercises[index];
  const [secondsLeft, setSecondsLeft] = useState(exercise.workSeconds);
  const finishedRef = useRef(false);

  useEffect(() => {
    playExerciseStartCue();
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timeout = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timeout);
  }, [secondsLeft]);

  useEffect(() => {
    if (secondsLeft > 0) return;

    if (phase === "work") {
      const isLastExercise = index === workout.exercises.length - 1;
      if (isLastExercise) {
        finishedRef.current = true;
        playWorkoutCompleteCue();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onFinish();
        return;
      }
      playExerciseStopCue();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPhase("rest");
      setSecondsLeft(exercise.restSeconds);
    } else {
      const nextIndex = index + 1;
      const nextExercise = workout.exercises[nextIndex];
      playExerciseStartCue();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIndex(nextIndex);
      setPhase("work");
      setSecondsLeft(nextExercise.workSeconds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const totalSeconds = phase === "work" ? exercise.workSeconds : exercise.restSeconds;

  return (
    <View style={styles.container}>
      <Pressable style={styles.exitButton} onPress={onExit}>
        <Text style={styles.exitButtonText}>Quitter</Text>
      </Pressable>

      <Text style={styles.progress}>
        Exercice {index + 1} / {workout.exercises.length}
      </Text>

      <ExerciseVisual imageUrl={exerciseImageUrl(exercise.imageUrl)} category={exercise.category} />

      <Text style={styles.name}>{exercise.name}</Text>
      <Text style={styles.category}>
        {CATEGORY_LABELS[exercise.category]}
        {exercise.discipline ? ` · ${DISCIPLINE_LABELS[exercise.discipline]}` : ""}
      </Text>

      <View style={styles.timerWrapper}>
        <Timer secondsLeft={secondsLeft} totalSeconds={totalSeconds} phase={phase} />
      </View>

      <Text style={styles.description}>{exercise.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 20,
    alignItems: "center",
  },
  exitButton: {
    alignSelf: "flex-end",
    padding: 8,
  },
  exitButtonText: {
    color: "#999",
    fontSize: 14,
  },
  progress: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888",
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1D3557",
    marginTop: 16,
    textAlign: "center",
  },
  category: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
  },
  timerWrapper: {
    marginVertical: 24,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
    textAlign: "center",
  },
});
