import {
  ALERT_PRESET_CATALOG,
  AlertPresetId,
  createInitialAlertRules,
  createRulesFromPreset,
  defaultRuleThreshold
} from "@/lib/alertPresets";
import { AlertEvent, AlertRule, PreviousStockSnapshot } from "@/types/alert";

import { readJSON, readString, writeJSON, writeString } from "./persistence";

export const ALERT_RULES_KEY = "stock-monitor-alert-rules-v1";
export const ALERT_EVENTS_KEY = "stock-monitor-alert-events-v1";
export const ALERT_SNAPSHOTS_KEY = "stock-monitor-alert-snapshots-v1";
export const ALERT_CONDITION_STATE_KEY = "stock-monitor-alert-condition-state-v1";
export const ALERT_NOTIFICATIONS_KEY = "stock-monitor-alert-notifications-v1";
export const ALERT_SCHEMA_VERSION_KEY = "stock-monitor-alert-schema-version";
export const ALERT_SCHEMA_VERSION = "phase3-v1";

export function normalizeAlertRules(rules: AlertRule[]): AlertRule[] {
  return rules.map((rule) => ({
    ...rule,
    priority: rule.priority ?? "medium",
    dueDate: typeof rule.dueDate === "string" ? rule.dueDate : null
  }));
}

export function normalizeAlertEvents(events: AlertEvent[]): AlertEvent[] {
  return [...events]
    .sort((a, b) => Date.parse(b.triggeredAt) - Date.parse(a.triggeredAt))
    .slice(0, 200);
}

export type NotificationPermissionState = NotificationPermission | "unsupported";

export function readNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }
  return Notification.permission;
}

export function isNotificationAvailable(permission: NotificationPermissionState): boolean {
  return permission === "granted";
}

export function maybeSendBrowserNotification(events: AlertEvent[], notificationsEnabled: boolean): void {
  if (!notificationsEnabled || events.length === 0) {
    return;
  }
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return;
  }
  if (Notification.permission !== "granted") {
    return;
  }
  for (const event of events) {
    new Notification(event.title, {
      body: event.message,
      tag: event.dedupeKey ?? event.id
    });
  }
}

export function initializeAlertStorage(): {
  alertRules: AlertRule[];
  alertEvents: AlertEvent[];
  previousSnapshots: Record<string, PreviousStockSnapshot>;
  alertConditionState: Record<string, boolean>;
  notificationsEnabled: boolean;
  notificationsAvailable: boolean;
  notificationPermission: NotificationPermissionState;
} {
  const permission = readNotificationPermission();
  const currentVersion = readString(ALERT_SCHEMA_VERSION_KEY, "");

  if (currentVersion !== ALERT_SCHEMA_VERSION) {
    const now = new Date().toISOString();
    const initialRules = normalizeAlertRules(createInitialAlertRules(now));
    writeJSON(ALERT_RULES_KEY, initialRules);
    writeJSON(ALERT_EVENTS_KEY, []);
    writeJSON(ALERT_SNAPSHOTS_KEY, {});
    writeJSON(ALERT_CONDITION_STATE_KEY, {});
    writeJSON(ALERT_NOTIFICATIONS_KEY, false);
    writeString(ALERT_SCHEMA_VERSION_KEY, ALERT_SCHEMA_VERSION);
    return {
      alertRules: initialRules,
      alertEvents: [],
      previousSnapshots: {},
      alertConditionState: {},
      notificationsEnabled: false,
      notificationsAvailable: isNotificationAvailable(permission),
      notificationPermission: permission
    };
  }

  const alertRules = normalizeAlertRules(readJSON<AlertRule[]>(ALERT_RULES_KEY, []));
  const alertEvents = normalizeAlertEvents(readJSON<AlertEvent[]>(ALERT_EVENTS_KEY, []));
  const previousSnapshots = readJSON<Record<string, PreviousStockSnapshot>>(ALERT_SNAPSHOTS_KEY, {});
  const alertConditionState = readJSON<Record<string, boolean>>(ALERT_CONDITION_STATE_KEY, {});
  const notificationsEnabledStored = readJSON<boolean>(ALERT_NOTIFICATIONS_KEY, false);
  const notificationsAvailable = isNotificationAvailable(permission);
  const notificationsEnabled = notificationsAvailable && notificationsEnabledStored;
  if (notificationsEnabled !== notificationsEnabledStored) {
    writeJSON(ALERT_NOTIFICATIONS_KEY, notificationsEnabled);
  }

  return {
    alertRules:
      alertRules.length > 0
        ? alertRules
        : normalizeAlertRules(createInitialAlertRules(new Date().toISOString())),
    alertEvents,
    previousSnapshots,
    alertConditionState,
    notificationsEnabled,
    notificationsAvailable,
    notificationPermission: permission
  };
}

export {
  ALERT_PRESET_CATALOG,
  createInitialAlertRules,
  createRulesFromPreset,
  defaultRuleThreshold
};
export type { AlertPresetId };
