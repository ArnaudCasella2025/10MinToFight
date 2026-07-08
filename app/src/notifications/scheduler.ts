import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const DAILY_WORKOUT_NOTIFICATION_ID = "daily-workout-7am";
const CHANNEL_ID = "daily-workout";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Entraînement du jour",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

/**
 * Requests notification permission and (re)schedules the single daily 7:00
 * reminder. Safe to call on every app launch: it clears any previous
 * scheduling for this notification before re-creating it, so it never
 * duplicates.
 */
export async function ensureDailyWorkoutNotification(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) return false;

  await ensureAndroidChannel();

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const alreadyScheduled = scheduled.some((notification) => notification.identifier === DAILY_WORKOUT_NOTIFICATION_ID);
  if (alreadyScheduled) return true;

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_WORKOUT_NOTIFICATION_ID,
    content: {
      title: "Ton entraînement du jour est prêt 💪",
      body: "10 minutes, 10 exercices, aucun équipement. On y va ?",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 7,
      minute: 0,
      channelId: CHANNEL_ID,
    },
  });
  return true;
}
