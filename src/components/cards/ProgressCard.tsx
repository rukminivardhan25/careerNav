import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface ProgressCardProps {
  title: string;
  description?: string;
  progress: number;
  status?: "in-progress" | "completed" | "not-started";
  className?: string;
}

export function ProgressCard({
  title,
  description,
  progress,
  status = "in-progress",
  className,
}: ProgressCardProps) {
  return (
    <div
      className={cn(
        "glass-card p-5 rounded-xl transition-all duration-300 hover:shadow-card-hover",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1">
          <h3 className="text-body font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-body-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <span
          className={cn(
            "px-2.5 py-1 rounded-pill text-caption font-medium",
            status === "completed" && "bg-success/10 text-success",
            status === "in-progress" && "bg-primary/10 text-primary",
            status === "not-started" && "bg-muted text-muted-foreground"
          )}
        >
          {status === "completed"
            ? "Completed"
            : status === "in-progress"
            ? "In Progress"
            : "Not Started"}
        </span>
      </div>

      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <p className="text-caption text-muted-foreground text-right">
          {progress}% complete
        </p>
      </div>
    </div>
  );
}
