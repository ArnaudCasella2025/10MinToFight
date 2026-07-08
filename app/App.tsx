import React, { useCallback, useEffect, useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { fetchTodayWorkout, todayIso } from "./src/api/workoutClient";
import { ensureDailyWorkoutNotification } from "./src/notifications/scheduler";
import { HomeScreen } from "./src/screens/HomeScreen";
import { SummaryScreen } from "./src/screens/SummaryScreen";
import { WorkoutPlayerScreen } from "./src/screens/WorkoutPlayerScreen";
import { Workout } from "./src/types/workout";

type Screen = "home" | "player" | "summary";

export default function App() {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");

  const loadWorkout = useCallback(async () => {
    const fresh = await fetchTodayWorkout(todayIso());
    setWorkout(fresh);
  }, []);

  useEffect(() => {
    ensureDailyWorkoutNotification();
    (async () => {
      setLoading(true);
      await loadWorkout();
      setLoading(false);
    })();
  }, [loadWorkout]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWorkout();
    setRefreshing(false);
  }, [loadWorkout]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {screen === "home" && (
        <HomeScreen
          workout={workout}
          loading={loading}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onStart={() => setScreen("player")}
        />
      )}
      {screen === "player" && workout && (
        <WorkoutPlayerScreen
          workout={workout}
          onFinish={() => setScreen("summary")}
          onExit={() => setScreen("home")}
        />
      )}
      {screen === "summary" && workout && (
        <SummaryScreen workout={workout} onDone={() => setScreen("home")} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
