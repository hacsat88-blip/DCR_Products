"use client";

import { StateCreator } from "zustand";

import {
  ALERT_PRESET_CATALOG,
  AlertPresetId,
  createRulesFromPreset,
  defaultRuleThreshold
} from "@/lib/alertPresets";
import { buildAlertConditionBaseline, evaluateAlerts } from "@/lib/alertEngine";
import { AlertEvent, AlertRule, PreviousStockSnapshot } from "@/types/alert";

import type { StoreState } from "./types";
import {
  ALERT_CONDITION_STATE_KEY,
  ALERT_EVENTS_KEY,
  ALERT_NOTIFICATIONS_KEY,
  ALERT_RULES_KEY,
  ALERT_SNAPSHOTS_KEY,
  isNotificationAvailable,
  maybeSendBrowserNotification,
  normalizeAlertEvents,
  normalizeAlertRules,
  NotificationPermissionState,
  readNotificationPermission
} from "./helpers/alert";
import { createId } from "./helpers/core";
import { notifyStorageFailure, writeJSON } from "./helpers/persistence";

export interface AlertSlice {
  alertRules: AlertRule[];
  alertEvents: AlertEvent[];
  previousSnapshots: Record<string, PreviousStockSnapshot>;
  alertConditionState: Record<string, boolean>;
  lastEvaluationAt: string | null;
  notificationsEnabled: boolean;
  notificationsAvailable: boolean;
  notificationPermission: NotificationPermissionState;
  addRule: (rule: Partial<Omit<AlertRule, "id" | "createdAt" | "updatedAt">>) => void;
  updateRule: (ruleId: string, patch: Partial<AlertRule>) => void;
  deleteRule: (ruleId: string) => void;
  addPresetRules: (presetId: AlertPresetId) => void;
  runAlertEvaluation: () => void;
  markAlertRead: (eventId: string) => void;
  dismissAlert: (eventId: string) => void;
  clearAlerts: () => void;
  toggleNotifications: () => void;
}

function normalizePriority(priority: AlertRule["priority"] | undefined): AlertRule["priority"] {
  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }
  return "medium";
}

function normalizeDueDate(dueDate: string | null | undefined): string | null {
  if (typeof dueDate !== "string") {
    return null;
  }
  const trimmed = dueDate.trim();
  return trimmed ? trimmed : null;
}

function rebuildConditionBaseline(state: StoreState, alertRules: AlertRule[]): Record<string, boolean> {
  const checkedAt = state.lastUpdatedAt ?? new Date().toISOString();
  return buildAlertConditionBaseline({
    stocks: state.stocks,
    rules: alertRules,
    dataMode: state.dataMode,
    health: state.health,
    checkedAt,
    previousSnapshots: state.previousSnapshots
  });
}

export const createAlertSlice: StateCreator<StoreState, [], [], AlertSlice> = (set, get) => ({
  alertRules: [],
  alertEvents: [],
  previousSnapshots: {},
  alertConditionState: {},
  lastEvaluationAt: null,
  notificationsEnabled: false,
  notificationsAvailable: false,
  notificationPermission: "unsupported",

  addRule: (ruleInput) => {
    if (ruleInput.scope === "stock" && !ruleInput.stockCode) {
      return;
    }
    const now = new Date().toISOString();
    const type = ruleInput.type ?? "score_delta";
    const next: AlertRule = {
      id: createId("rule"),
      stockCode: ruleInput.stockCode,
      scope: ruleInput.scope ?? "global",
      type,
      enabled: ruleInput.enabled ?? true,
      threshold:
        typeof ruleInput.threshold === "number"
          ? ruleInput.threshold
          : defaultRuleThreshold(type),
      messageTemplate: ruleInput.messageTemplate,
      cooldownMinutes: ruleInput.cooldownMinutes ?? 30,
      priority: normalizePriority(ruleInput.priority),
      dueDate: normalizeDueDate(ruleInput.dueDate),
      createdAt: now,
      updatedAt: now
    };
    set((state) => {
      const alertRules = normalizeAlertRules([next, ...state.alertRules]);
      const alertConditionState = rebuildConditionBaseline(state, alertRules);
      writeJSON(ALERT_RULES_KEY, alertRules);
      writeJSON(ALERT_CONDITION_STATE_KEY, alertConditionState);
      return { alertRules, alertConditionState };
    });
  },

  updateRule: (ruleId, patch) => {
    set((state) => {
      const normalizedPatch: Partial<AlertRule> = { ...patch };
      if ("priority" in patch) {
        normalizedPatch.priority = normalizePriority(patch.priority);
      }
      if ("dueDate" in patch) {
        normalizedPatch.dueDate = normalizeDueDate(patch.dueDate);
      }
      const alertRules = normalizeAlertRules(state.alertRules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...normalizedPatch, updatedAt: new Date().toISOString() } : rule
      ));
      const alertConditionState = rebuildConditionBaseline(state, alertRules);
      writeJSON(ALERT_RULES_KEY, alertRules);
      writeJSON(ALERT_CONDITION_STATE_KEY, alertConditionState);
      return { alertRules, alertConditionState };
    });
  },

  deleteRule: (ruleId) => {
    set((state) => {
      const alertRules = state.alertRules.filter((rule) => rule.id !== ruleId);
      const alertConditionState = rebuildConditionBaseline(state, alertRules);
      writeJSON(ALERT_RULES_KEY, alertRules);
      writeJSON(ALERT_CONDITION_STATE_KEY, alertConditionState);
      return { alertRules, alertConditionState };
    });
  },

  addPresetRules: (presetId) => {
    if (!ALERT_PRESET_CATALOG[presetId]) {
      return;
    }
    set((state) => {
      const now = new Date().toISOString();
      const created = createRulesFromPreset(presetId, now);
      const existingFingerprints = new Set(
        state.alertRules.map(
          (rule) => `${rule.scope}|${rule.type}|${rule.stockCode ?? ""}|${rule.threshold ?? ""}`
        )
      );
      const deduped = created.filter((rule) => {
        const key = `${rule.scope}|${rule.type}|${rule.stockCode ?? ""}|${rule.threshold ?? ""}`;
        if (existingFingerprints.has(key)) {
          return false;
        }
        existingFingerprints.add(key);
        return true;
      });
      const alertRules = normalizeAlertRules([...deduped, ...state.alertRules]);
      const alertConditionState = rebuildConditionBaseline(state, alertRules);
      writeJSON(ALERT_RULES_KEY, alertRules);
      writeJSON(ALERT_CONDITION_STATE_KEY, alertConditionState);
      return { alertRules, alertConditionState };
    });
  },

  runAlertEvaluation: () => {
    const state = get();
    if (state.stocks.length === 0 || state.alertRules.length === 0) {
      return;
    }
    const checkedAt = new Date().toISOString();
    const result = evaluateAlerts({
      stocks: state.stocks,
      rules: state.alertRules,
      existingEvents: state.alertEvents,
      previousSnapshots: state.previousSnapshots,
      conditionState: state.alertConditionState,
      dataMode: state.dataMode,
      health: state.health,
      checkedAt
    });

    const alertEvents = normalizeAlertEvents(result.events);
    set({
      alertEvents,
      previousSnapshots: result.snapshots,
      alertConditionState: result.conditionState,
      lastEvaluationAt: result.lastEvaluationAt
    });

    writeJSON(ALERT_EVENTS_KEY, alertEvents);
    writeJSON(ALERT_SNAPSHOTS_KEY, result.snapshots);
    writeJSON(ALERT_CONDITION_STATE_KEY, result.conditionState);

    maybeSendBrowserNotification(result.triggeredEvents, state.notificationsEnabled);
  },

  markAlertRead: (eventId) => {
    set((state) => {
      const alertEvents = state.alertEvents.map((event) =>
        event.id === eventId ? { ...event, read: true } : event
      );
      writeJSON(ALERT_EVENTS_KEY, alertEvents);
      return { alertEvents };
    });
  },

  dismissAlert: (eventId) => {
    set((state) => {
      const alertEvents = state.alertEvents.map((event) =>
        event.id === eventId ? { ...event, dismissed: true, read: true } : event
      );
      writeJSON(ALERT_EVENTS_KEY, alertEvents);
      return { alertEvents };
    });
  },

  clearAlerts: () => {
    set(() => {
      const eventsPersisted = writeJSON(ALERT_EVENTS_KEY, []);
      const snapshotsPersisted = writeJSON(ALERT_SNAPSHOTS_KEY, {});
      const statePersisted = writeJSON(ALERT_CONDITION_STATE_KEY, {});
      if (!eventsPersisted || !snapshotsPersisted || !statePersisted) {
        notifyStorageFailure("clearAlerts");
      }
      return {
        alertEvents: [],
        previousSnapshots: {},
        alertConditionState: {},
        lastEvaluationAt: null
      };
    });
  },

  toggleNotifications: () => {
    set((state) => {
      const permission = readNotificationPermission();
      const notificationsAvailable = isNotificationAvailable(permission);
      if (state.notificationsEnabled) {
        writeJSON(ALERT_NOTIFICATIONS_KEY, false);
        return {
          notificationsEnabled: false,
          notificationsAvailable,
          notificationPermission: permission
        };
      }

      if (permission === "granted") {
        writeJSON(ALERT_NOTIFICATIONS_KEY, true);
        return {
          notificationsEnabled: true,
          notificationsAvailable: true,
          notificationPermission: permission
        };
      }

      if (
        typeof window !== "undefined" &&
        typeof Notification !== "undefined" &&
        Notification.permission === "default"
      ) {
        void Notification.requestPermission().then((requestedPermission) => {
          const granted = requestedPermission === "granted";
          writeJSON(ALERT_NOTIFICATIONS_KEY, granted);
          set({
            notificationsEnabled: granted,
            notificationsAvailable: isNotificationAvailable(requestedPermission),
            notificationPermission: requestedPermission
          });
        });
      } else {
        writeJSON(ALERT_NOTIFICATIONS_KEY, false);
      }

      return {
        notificationsEnabled: false,
        notificationsAvailable,
        notificationPermission: permission
      };
    });
  }
});
