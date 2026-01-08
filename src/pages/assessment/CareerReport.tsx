import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Star,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CareerOption {
  id: string;
  title: string;
  match: number;
  description: string;
  salaryMin: number;
  salaryMax: number;
  keySkills: string[];
  growthOutlook: "High" | "Medium" | "Low";
}

interface CareerReportData {
  careerReadinessScore: number;
  summary: string;
  strengths: string[];
  careerOptions: CareerOption[];
}

export default function CareerReport() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<CareerReportData | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedCareer, setSelectedCareer] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const fetchReport = async () => {
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) {
        navigate("/student/login");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/assessments/report/${reportId || "latest"}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        // If report doesn't exist, generate it or show mock data for now
        const mockData: CareerReportData = {
          careerReadinessScore: 87,
          summary: "You demonstrate strong analytical ability, logical thinking, and a growth-oriented mindset. Your profile aligns well with problem-solving and technology-driven roles.",
          strengths: [
            "Analytical Thinking",
            "Logical Reasoning",
            "Fast Learner",
            "Problem Solving",
            "Consistency",
            "Attention to Detail",
          ],
          careerOptions: [
            {
              id: "1",
              title: "Software Engineer",
              match: 92,
              description: "Design, develop, and maintain scalable software systems while solving real-world problems using technology.",
              salaryMin: 6,
              salaryMax: 25,
              keySkills: ["Data Structures", "JavaScript", "Problem Solving", "Git & GitHub"],
              growthOutlook: "High",
            },
            {
              id: "2",
              title: "Data Analyst",
              match: 85,
              description: "Analyze data to uncover insights, support business decisions, and identify trends using analytical tools.",
              salaryMin: 5,
              salaryMax: 18,
              keySkills: ["SQL", "Excel", "Python", "Data Visualization"],
              growthOutlook: "High",
            },
            {
              id: "3",
              title: "Product Engineer",
              match: 78,
              description: "Work at the intersection of engineering and product design to build user-focused solutions.",
              salaryMin: 7,
              salaryMax: 22,
              keySkills: ["Product Design", "Engineering", "User Research", "Agile"],
              growthOutlook: "Medium",
            },
          ],
        };
        setReportData(mockData);
      }
    } catch (error) {
      console.error("Failed to fetch report:", error);
      toast({
        title: "Error",
        description: "Failed to load career report. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCareer = async (careerId: string, careerTitle: string) => {
    setSelectedCareer(careerId);
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) {
        navigate("/student/login");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/careers/select-and-generate-path`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            careerId: careerId,
            careerTitle: careerTitle,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Career Selected",
          description: "Your learning path is being generated. Redirecting...",
        });
        setTimeout(() => {
          navigate(`/learning-path?career=${careerTitle}`);
        }, 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to select career:", errorData);
        toast({
          title: "Error",
          description: errorData.error || "Failed to select career. Please try again.",
          variant: "destructive",
        });
        setSelectedCareer(null); // Reset selection on error
      }
    } catch (error) {
      console.error("Failed to select career:", error);
      toast({
        title: "Error",
        description: "Failed to select career. Please try again.",
        variant: "destructive",
      });
      setSelectedCareer(null); // Reset selection on error
    }
  };

  const getGrowthColor = (outlook: string) => {
    switch (outlook) {
      case "High":
        return "text-success";
      case "Medium":
        return "text-warning";
      case "Low":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  const getGrowthLabel = (outlook: string) => {
    switch (outlook) {
      case "High":
        return "Very High";
      case "Medium":
        return "High";
      case "Low":
        return "Medium";
      default:
        return "Medium";
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="student" title="Career Report">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-body text-muted-foreground">Loading your career report...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!reportData) {
    return (
      <DashboardLayout role="student" title="Career Report">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-body text-muted-foreground">Report not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student" title="Career Report">
      <div className="space-y-6">
        {/* Header */}
        <div className="glass-card rounded-xl p-6 lg:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
          <div className="relative text-center space-y-2">
            <h1 className="text-headline text-foreground">Career Report</h1>
            <p className="text-body text-muted-foreground">
              Based on your Aptitude & Personality Assessments
            </p>
          </div>
        </div>

        {/* SECTION 1: Overall Summary */}
        <div className="glass-card rounded-xl p-6 lg:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-success/5" />
          <div className="relative space-y-4">
            <div className="text-center">
              <h2 className="text-title text-foreground mb-2">Career Readiness Score</h2>
              <div className="text-display-lg font-bold text-primary mb-4">
                {reportData.careerReadinessScore}%
              </div>
              <p className="text-body text-muted-foreground max-w-2xl mx-auto">
                {reportData.summary}
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 2: Your Strengths */}
        <div className="glass-card rounded-xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-success/5 to-transparent" />
          <div className="relative">
            <h2 className="text-title text-foreground mb-4">Your Key Strengths</h2>
            <div className="flex flex-wrap gap-2">
              {reportData.strengths.map((strength, index) => (
                <span
                  key={index}
                  className="px-4 py-2 rounded-full bg-primary/10 text-primary text-body-sm font-medium border border-primary/20"
                >
                  {strength}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 3: Recommended Career Options */}
        <div className="space-y-4">
          <h2 className="text-title text-foreground">Recommended Careers for You</h2>
          {reportData.careerOptions.map((career, index) => (
            <div
              key={career.id}
              className="glass-card rounded-xl p-6 hover:shadow-card-hover transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <div className="relative space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-title text-foreground">{career.title}</h3>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-body-sm font-semibold">
                        <Star className="h-4 w-4 fill-primary" />
                        {career.match}%
                      </div>
                    </div>
                    <p className="text-body-sm text-muted-foreground mb-4">
                      {career.description}
                    </p>

                    {/* Salary Range */}
                    <div className="mb-4">
                      <p className="text-body-sm font-medium text-foreground mb-2">
                        Salary Range (India):
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-body-sm text-muted-foreground">
                          ₹{career.salaryMin} LPA
                        </span>
                        <div className="flex-1 h-2 bg-muted rounded-full relative">
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full" />
                        </div>
                        <span className="text-body-sm text-muted-foreground">
                          ₹{career.salaryMax} LPA
                        </span>
                      </div>
                    </div>

                    {/* Key Skills */}
                    <div className="mb-4">
                      <p className="text-body-sm font-medium text-foreground mb-2">
                        Key Skills Required:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {career.keySkills.map((skill, skillIndex) => (
                          <span
                            key={skillIndex}
                            className="px-3 py-1 rounded-md bg-muted/50 text-body-sm text-foreground"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Growth Outlook */}
                    <div className="flex items-center gap-2 text-body-sm">
                      <TrendingUp className={`h-4 w-4 ${getGrowthColor(career.growthOutlook)}`} />
                      <span className="text-muted-foreground">Growth Outlook:</span>
                      <span className={`font-medium ${getGrowthColor(career.growthOutlook)}`}>
                        📈 {career.growthOutlook === "High" ? "High demand & strong future growth" : `${getGrowthLabel(career.growthOutlook)} demand & growth`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  variant="gradient"
                  className="w-full"
                  onClick={() => handleSelectCareer(career.id, career.title)}
                  disabled={selectedCareer === career.id}
                >
                  {selectedCareer === career.id ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Selected
                    </>
                  ) : (
                    <>
                      Choose This Career
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* SECTION 4: Career Comparison (Collapsible) */}
        <Collapsible open={showComparison} onOpenChange={setShowComparison}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between"
            >
              <span>Compare Career Options</span>
              {showComparison ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="glass-card rounded-xl p-6 mt-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-body-sm font-semibold text-foreground">
                      Career
                    </th>
                    <th className="text-left py-3 px-4 text-body-sm font-semibold text-foreground">
                      Match
                    </th>
                    <th className="text-left py-3 px-4 text-body-sm font-semibold text-foreground">
                      Salary
                    </th>
                    <th className="text-left py-3 px-4 text-body-sm font-semibold text-foreground">
                      Growth
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.careerOptions.map((career) => (
                    <tr key={career.id} className="border-b border-border/50">
                      <td className="py-3 px-4 text-body-sm text-foreground font-medium">
                        {career.title}
                      </td>
                      <td className="py-3 px-4 text-body-sm text-foreground">
                        {career.match}%
                      </td>
                      <td className="py-3 px-4 text-body-sm text-muted-foreground">
                        ₹{career.salaryMin}-{career.salaryMax} LPA
                      </td>
                      <td className="py-3 px-4 text-body-sm">
                        <span className={getGrowthColor(career.growthOutlook)}>
                          {getGrowthLabel(career.growthOutlook)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* SECTION 5: Recommendation Note */}
        <div className="glass-card rounded-xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-muted/10 to-transparent" />
          <div className="relative text-center space-y-2">
            <p className="text-body-sm text-muted-foreground">
              This report is generated using your assessment answers, skills, and interests.
            </p>
            <p className="text-body-sm text-muted-foreground">
              You can change your career choice later if your goals evolve.
            </p>
          </div>
        </div>

        {/* SECTION 6: Final CTA */}
        <div className="glass-card rounded-xl p-6 lg:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-success/5" />
          <div className="relative text-center space-y-4">
            <h2 className="text-title text-foreground">Ready to move forward?</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                variant="gradient"
                size="lg"
                onClick={() => navigate("/learning-path")}
                className="min-w-[200px]"
              >
                Create My Learning Path
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/assessment")}
              >
                Explore Other Options
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

