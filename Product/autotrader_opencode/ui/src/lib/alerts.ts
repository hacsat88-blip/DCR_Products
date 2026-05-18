/**
 * サウンドアラート — WebAudio API でビープ音を生成
 * 外部素材不要、autoplay policy 対策込み
 */

let audioCtx: AudioContext | null = null;
let unlocked = false;

export function unlockAudio(): void {
  if (unlocked) return;
  try {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    unlocked = true;
  } catch (e) {
    console.warn("AudioContext unlock failed", e);
  }
}

function beep(freq: number, durationMs: number, gain = 0.15): void {
  if (!audioCtx || !unlocked) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start();
  setTimeout(() => {
    osc.stop();
    osc.disconnect();
    g.disconnect();
  }, durationMs);
}

export const Alerts = {
  // 損切り — 低い警告音 2連
  stopLoss(): void {
    beep(220, 150);
    setTimeout(() => beep(180, 200), 180);
  },
  // 利益目標達成 — 上昇する明るい音
  profitTarget(): void {
    beep(523, 120);
    setTimeout(() => beep(659, 120), 130);
    setTimeout(() => beep(784, 200), 260);
  },
  // 緊急停止 — 速い連続警告
  emergencyStop(): void {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => beep(880, 100, 0.2), i * 130);
    }
  },
  // 14:50 アラート — 中音
  endOfDay(): void {
    beep(440, 200);
    setTimeout(() => beep(440, 200), 250);
  },
  // 約定通知 — 短い1音
  trade(): void {
    beep(660, 80, 0.1);
  },
};

interface BroadcastEvent {
  action?: string;
  reason?: string;
  trading_stopped?: boolean;
  stop_reason?: string;
  daily_pnl?: number;
  timestamp?: string;
}

/**
 * WebSocket イベントを解析して適切なアラートを鳴らす
 */
export function handleEvent(event: BroadcastEvent, prev: { stopped: boolean; pnl: number }): void {
  if (event.reason && event.reason.includes("損切り")) {
    Alerts.stopLoss();
  } else if (event.trading_stopped && !prev.stopped) {
    if (event.stop_reason?.includes("目標")) {
      Alerts.profitTarget();
    } else {
      Alerts.emergencyStop();
    }
  } else if (event.action === "buy" || event.action === "sell") {
    Alerts.trade();
  }
}
