import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StructuredResumeBuilder } from "@/components/resume/StructuredResumeBuilder";

export default function ResumePage() {
  return (
    <DashboardLayout role="student" title="Resume Builder">
      <div className="space-y-6">
        {/* Header */}
        <div className="glass-card rounded-xl p-6">
          <h1 className="text-headline text-foreground mb-2">
            AI-Powered Resume Builder
          </h1>
          <p className="text-body text-muted-foreground">
            Build your professional resume with guided forms. Let AI help you improve your content and create ATS-friendly resumes.
          </p>
        </div>

        {/* Structured Builder */}
        <StructuredResumeBuilder />
      </div>
    </DashboardLayout>
  );
}
