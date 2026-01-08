import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Option {
  id?: string;
  text: string;
  value?: string; // Actual option value (for storing)
}

interface QuestionCardProps {
  questionNumber: number;
  question: string;
  options: Option[] | string[]; // Can be array of strings or Option objects
  selectedOption?: string; // Selected option value (not ID)
  onSelect: (optionValue: string) => void; // Pass actual value, not ID
  type?: "mcq" | "likert" | "numeric";
  className?: string;
  style?: React.CSSProperties;
}

export function QuestionCard({
  questionNumber,
  question,
  options,
  selectedOption,
  onSelect,
  type = "mcq",
  className,
  style,
}: QuestionCardProps) {
  // Normalize options: convert string array to Option objects, or use existing Option objects
  const normalizedOptions: Option[] = options.map((opt, index) => {
    if (typeof opt === "string") {
      // If it's a string, use it as both value and text
      return {
        id: `opt-${index}`,
        text: opt,
        value: opt,
      };
    } else {
      // If it's already an Option object, ensure value is set
      return {
        ...opt,
        value: opt.value || opt.text,
        id: opt.id || `opt-${index}`,
      };
    }
  });

  return (
    <div
      className={cn(
        "glass-card p-6 rounded-xl transition-all duration-300",
        className
      )}
      style={style}
    >
      <div className="flex items-start gap-3 mb-6">
        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary font-semibold text-body-sm flex items-center justify-center border border-primary/20">
          {questionNumber}
        </span>
        <p className="text-body text-foreground font-medium leading-relaxed flex-1">
          {question}
        </p>
      </div>

      <RadioGroup
        value={selectedOption}
        onValueChange={onSelect}
        className="space-y-3"
      >
        {normalizedOptions.map((option, index) => {
          const optionValue = option.value || option.text;
          const optionId = `q${questionNumber}-opt-${index}`;
          const isSelected = selectedOption === optionValue;
          
          return (
            <div
              key={optionId}
              className={cn(
                "flex items-center space-x-3 p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer",
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border hover:border-primary/30 hover:bg-muted/50"
              )}
              onClick={() => onSelect(optionValue)}
            >
              <RadioGroupItem value={optionValue} id={optionId} />
              <Label
                htmlFor={optionId}
                className="text-body-sm text-foreground cursor-pointer flex-1 font-medium"
              >
                {option.text}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
