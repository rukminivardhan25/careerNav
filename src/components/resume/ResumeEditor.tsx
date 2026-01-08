import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Copy, Download, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResumeEditorProps {
  className?: string;
}

const sampleMarkdown = `# John Doe
**Software Engineer**

## Contact
- Email: john.doe@email.com
- Phone: (555) 123-4567
- LinkedIn: linkedin.com/in/johndoe
- GitHub: github.com/johndoe

## Summary
Passionate software engineer with 3+ years of experience building scalable web applications. Skilled in React, TypeScript, and Node.js.

## Experience

### Software Engineer | TechCorp Inc.
*Jan 2022 - Present*

- Developed and maintained React-based web applications serving 100k+ users
- Implemented CI/CD pipelines reducing deployment time by 40%
- Led code reviews and mentored junior developers

### Junior Developer | StartupXYZ
*Jun 2020 - Dec 2021*

- Built RESTful APIs using Node.js and Express
- Collaborated with design team to implement responsive UI components
- Wrote unit tests achieving 85% code coverage

## Education

### B.Tech in Computer Science
*University of Technology | 2016 - 2020*
- GPA: 3.8/4.0
- Relevant Coursework: Data Structures, Algorithms, Web Development

## Skills
- **Languages:** JavaScript, TypeScript, Python, Java
- **Frontend:** React, Next.js, Tailwind CSS
- **Backend:** Node.js, Express, PostgreSQL
- **Tools:** Git, Docker, AWS, Figma
`;

export function ResumeEditor({ className }: ResumeEditorProps) {
  const [content, setContent] = useState(sampleMarkdown);
  const [isImproving, setIsImproving] = useState(false);

  const handleImprove = async () => {
    setIsImproving(true);
    // Simulate AI improvement call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsImproving(false);
    // In production, this would call the AI endpoint
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  // Simple markdown to HTML conversion for preview
  const renderMarkdown = (md: string) => {
    return md
      .split("\n")
      .map((line, i) => {
        if (line.startsWith("# ")) {
          return (
            <h1 key={i} className="text-display-sm text-foreground mb-2">
              {line.slice(2)}
            </h1>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h2
              key={i}
              className="text-headline text-foreground mt-6 mb-3 border-b border-border pb-2"
            >
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3 key={i} className="text-title text-foreground mt-4 mb-2">
              {line.slice(4)}
            </h3>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <li key={i} className="text-body-sm text-foreground ml-4 list-disc">
              {line.slice(2)}
            </li>
          );
        }
        if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
          return (
            <p key={i} className="text-body-sm text-muted-foreground italic">
              {line.slice(1, -1)}
            </p>
          );
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <p key={i} className="text-body font-semibold text-primary">
              {line.slice(2, -2)}
            </p>
          );
        }
        if (line.trim() === "") {
          return <div key={i} className="h-2" />;
        }
        return (
          <p key={i} className="text-body-sm text-foreground">
            {line}
          </p>
        );
      });
  };

  return (
    <div className={cn("grid lg:grid-cols-2 gap-6", className)}>
      {/* Editor Panel */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-title text-foreground">Markdown Editor</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="gradient"
              size="sm"
              onClick={handleImprove}
              disabled={isImproving}
            >
              {isImproving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              AI Improve
            </Button>
          </div>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[600px] rounded-none border-0 resize-none font-mono text-body-sm focus-visible:ring-0"
          placeholder="Write your resume in markdown..."
        />
      </div>

      {/* Preview Panel */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-title text-foreground">Live Preview</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
        <div className="p-6 min-h-[600px] overflow-y-auto bg-card">
          {renderMarkdown(content)}
        </div>
      </div>
    </div>
  );
}
