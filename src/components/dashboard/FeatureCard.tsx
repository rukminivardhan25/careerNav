import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  title: string;
  icon: ReactNode;
  href: string;
  className?: string;
}

export function FeatureCard({ title, icon, href, className }: FeatureCardProps) {
  return (
    <Link
      to={href}
      className={cn(
        "glass-card p-6 rounded-xl transition-all duration-300 hover:shadow-card-hover flex flex-col items-center justify-center aspect-square text-center group cursor-pointer",
        className
      )}
    >
      <div className="p-4 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 mb-4 transform group-hover:scale-110">
        {icon}
      </div>
      <h3 className="text-body font-semibold text-foreground group-hover:text-primary transition-colors">
        {title}
      </h3>
    </Link>
  );
}

