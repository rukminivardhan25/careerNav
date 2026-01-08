import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Calendar, TrendingUp, Briefcase, Lightbulb, DollarSign, Building2, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_BASE_URL } from "@/lib/api";

interface IndustryInsights {
  branch: string;
  content: {
    trends: Array<{
      title: string;
      description: string;
      impact: string;
    }>;
    opportunities: Array<{
      title: string;
      description: string;
      skills_needed: string[];
      growth_potential: string;
    }>;
    skills_in_demand: Array<{
      skill: string;
      importance: string;
      learning_resources: string;
    }>;
    salary_trends: {
      entry_level: string;
      mid_level: string;
      senior_level: string;
      growth_rate: string;
    };
    top_companies: Array<{
      name: string;
      why_relevant: string;
    }>;
    emerging_technologies: Array<{
      technology: string;
      relevance: string;
      career_impact: string;
    }>;
  };
  summary: string;
  last_updated: string;
}

export default function IndustryInsights() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<IndustryInsights | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) {
        setError("Please login to view industry insights");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/industry/insights`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.error) {
        setError(data.message || "Failed to load industry insights");
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      } else {
        setInsights(data.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch insights:", err);
      setError(err.message || "Failed to load industry insights");
      toast({
        title: "Error",
        description: "Failed to load industry insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <DashboardLayout role="student" title="Industry Insights">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading industry insights...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !insights) {
    return (
      <DashboardLayout role="student" title="Industry Insights">
        <div className="glass-card rounded-xl p-6 lg:p-8">
          <div className="text-center">
            <p className="text-body-lg text-muted-foreground mb-4">
              {error || "No insights available"}
            </p>
            <button
              onClick={fetchInsights}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student" title="Industry Insights">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="glass-card rounded-xl p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-display-sm mb-2">Industry Insights</h1>
              <p className="text-body-lg text-muted-foreground">
                Weekly insights tailored for {insights.branch} engineering students
              </p>
              {insights.summary && (
                <p className="text-body-sm text-muted-foreground mt-2">{insights.summary}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Last Updated: {formatDate(insights.last_updated)}</span>
            </div>
          </div>
        </div>

        {/* Salary Trends */}
        {insights.content.salary_trends && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Salary Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-body-sm text-muted-foreground mb-1">Entry Level</p>
                  <p className="text-title font-semibold text-foreground">
                    {insights.content.salary_trends.entry_level}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-body-sm text-muted-foreground mb-1">Mid Level</p>
                  <p className="text-title font-semibold text-foreground">
                    {insights.content.salary_trends.mid_level}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-body-sm text-muted-foreground mb-1">Senior Level</p>
                  <p className="text-title font-semibold text-foreground">
                    {insights.content.salary_trends.senior_level}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                  <p className="text-body-sm text-muted-foreground mb-1">Growth Rate</p>
                  <p className="text-title font-semibold text-foreground">
                    {insights.content.salary_trends.growth_rate}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trends */}
        {insights.content.trends && insights.content.trends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Industry Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.content.trends.map((trend, index) => (
                  <div key={index} className="p-4 rounded-lg border border-border hover:border-primary/30 transition-colors">
                    <h3 className="text-title font-semibold text-foreground mb-2">{trend.title}</h3>
                    <p className="text-body-sm text-muted-foreground mb-2">{trend.description}</p>
                    <p className="text-body-sm text-primary">
                      <strong>Impact:</strong> {trend.impact}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Opportunities & Skills */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Career Opportunities */}
          {insights.content.opportunities && insights.content.opportunities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Career Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.content.opportunities.map((opp, index) => (
                    <div key={index} className="p-4 rounded-lg border border-border">
                      <h3 className="text-title font-semibold text-foreground mb-2">{opp.title}</h3>
                      <p className="text-body-sm text-muted-foreground mb-3">{opp.description}</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {opp.skills_needed?.map((skill, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                      <p className="text-body-sm">
                        <strong className="text-foreground">Growth Potential:</strong>{" "}
                        <span className="text-accent">{opp.growth_potential}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skills in Demand */}
          {insights.content.skills_in_demand && insights.content.skills_in_demand.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Skills in Demand
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.content.skills_in_demand.map((skill, index) => (
                    <div key={index} className="p-4 rounded-lg border border-border">
                      <h3 className="text-title font-semibold text-foreground mb-2">{skill.skill}</h3>
                      <p className="text-body-sm text-muted-foreground mb-2">{skill.importance}</p>
                      <p className="text-body-sm text-primary">
                        <strong>Learn:</strong> {skill.learning_resources}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Top Companies & Emerging Technologies */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Companies */}
          {insights.content.top_companies && insights.content.top_companies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Top Companies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.content.top_companies.map((company, index) => (
                    <div key={index} className="p-3 rounded-lg border border-border">
                      <h3 className="text-title font-semibold text-foreground mb-1">{company.name}</h3>
                      <p className="text-body-sm text-muted-foreground">{company.why_relevant}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Emerging Technologies */}
          {insights.content.emerging_technologies && insights.content.emerging_technologies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Emerging Technologies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.content.emerging_technologies.map((tech, index) => (
                    <div key={index} className="p-3 rounded-lg border border-border">
                      <h3 className="text-title font-semibold text-foreground mb-1">{tech.technology}</h3>
                      <p className="text-body-sm text-muted-foreground mb-1">{tech.relevance}</p>
                      <p className="text-body-sm text-primary">{tech.career_impact}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}




