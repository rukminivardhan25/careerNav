import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
  style?: React.CSSProperties;
}

export function FeatureCard({
  icon,
  title,
  description,
  className,
  style,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        "group glass-card p-6 rounded-xl transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1",
        className
      )}
      style={style}
    >
      <div className="mb-4 p-3 w-fit rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-title text-foreground mb-2">{title}</h3>
      <p className="text-body-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
