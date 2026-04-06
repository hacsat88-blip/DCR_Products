interface HeaderProps {
  unreadAlerts?: number;
  notificationsEnabled?: boolean;
  notificationsAvailable?: boolean;
  notificationPermission?: NotificationPermission | "unsupported";
}

function notificationBadgeText(
  notificationsEnabled: boolean,
  notificationsAvailable: boolean,
  notificationPermission: NotificationPermission | "unsupported"
): string {
  if (!notificationsEnabled) {
    return "ブラウザ通知: OFF";
  }
  if (notificationsAvailable) {
    return "ブラウザ通知: ON";
  }
  if (notificationPermission === "denied") {
    return "ブラウザ通知: 権限未許可";
  }
  if (notificationPermission === "default") {
    return "ブラウザ通知: 許可待ち";
  }
  return "ブラウザ通知: 無効";
}

export function Header({
  unreadAlerts = 0,
  notificationsEnabled = false,
  notificationsAvailable = false,
  notificationPermission = "unsupported"
}: HeaderProps): JSX.Element {
  return (
    <header className="relative rounded-xl border border-border-subtle bg-panel px-6 py-6 shadow-card">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-canvas-deep/60 px-3 py-1 text-text-secondary">
            <span className={unreadAlerts > 0 ? "h-1.5 w-1.5 rounded-full bg-amber" : "h-1.5 w-1.5 rounded-full bg-text-muted"} />
            未読アラート: <span className="text-text-primary font-medium">{unreadAlerts}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-canvas-deep/60 px-3 py-1 text-text-secondary">
            <span className={notificationsAvailable ? "h-1.5 w-1.5 rounded-full bg-positive" : "h-1.5 w-1.5 rounded-full bg-text-muted"} />
            {notificationBadgeText(notificationsEnabled, notificationsAvailable, notificationPermission)}
          </span>
        </div>
      </div>
      <h1 className="text-3xl font-extrabold leading-tight tracking-heading text-text-primary md:text-5xl">
        株式監視・銘柄選定ダッシュボード
      </h1>
      <p className="mt-4 text-sm font-normal leading-7 tracking-wide text-text-secondary md:text-base">安い株を探すのではなく、利益の質と成長の壊れにくさを比較するための画面です。探す、比べる、監視する、崩れを見抜くまでを一画面でつなげます。</p>
    </header>
  );
}
