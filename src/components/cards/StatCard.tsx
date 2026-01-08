import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  change?: number;
  changeLabel?: string;
  className?: string;
  iconColor?: "primary" | "accent" | "success" | "warning" | "destructive";
  changeIsPercentage?: boolean; // If false, shows count instead of percentage
}

export function StatCard({
  title,
  value,
  icon,
  change,
  changeLabel,
  className,
  iconColor = "primary",
  changeIsPercentage = true,
}: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  const iconColorClasses = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <div
      className={cn(
        "glass-card p-6 rounded-xl transition-all duration-300 hover:shadow-card-hover",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-body-sm text-muted-foreground">{title}</p>
          <p className="text-display-sm text-foreground">{value}</p>
        </div>
        {icon && (
          <div className={cn("p-3 rounded-xl flex-shrink-0", iconColorClasses[iconColor])}>
            {icon}
          </div>
        )}
      </div>

      {change !== undefined && (
        <div className="mt-4 flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1 text-body-sm font-medium",
              isPositive && "text-success",
              isNegative && "text-destructive",
              !isPositive && !isNegative && "text-muted-foreground"
            )}
          >
            {isPositive && <TrendingUp className="h-4 w-4" />}
            {isNegative && <TrendingDown className="h-4 w-4" />}
            <span>
              {isPositive && "+"}
              {change}
              {changeIsPercentage ? "%" : ""}
            </span>
          </div>
          {changeLabel && (
            <span className="text-caption text-muted-foreground">
              {changeLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
