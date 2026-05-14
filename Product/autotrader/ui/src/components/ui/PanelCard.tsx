import { ReactNode } from "react";

interface PanelCardProps {
  title: string;
  accentColor?: "blue" | "green" | "red" | "gray";
  children: ReactNode;
  className?: string;
}

const accentMap = {
  blue: "border-t-blue-500",
  green: "border-t-green-500",
  red: "border-t-red-500",
  gray: "border-t-gray-500",
};

export default function PanelCard({ title, accentColor = "gray", children, className = "" }: PanelCardProps) {
  return (
    <div className={`bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-800/50 border-t-4 ${accentMap[accentColor]} ${className}`}>
      <div className="px-4 py-2 border-b border-gray-800/50 text-xs font-bold text-gray-400 uppercase tracking-wider">
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
