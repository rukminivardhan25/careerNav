import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Calendar } from "lucide-react";

// Static mock data for salary trends
const salaryData = [
  {
    industry: "Software Development",
    min: 6,
    median: 12,
    max: 25,
  },
  {
    industry: "Data Science",
    min: 8,
    median: 15,
    max: 30,
  },
  {
    industry: "Cloud Computing",
    min: 7,
    median: 14,
    max: 28,
  },
  {
    industry: "Cyber Security",
    min: 9,
    median: 16,
    max: 32,
  },
  {
    industry: "AI / ML",
    min: 10,
    median: 18,
    max: 35,
  },
];

const chartConfig = {
  min: {
    label: "Min Salary",
    color: "hsl(220 100% 59%)", // Primary blue - lighter shade
  },
  median: {
    label: "Median Salary",
    color: "hsl(220 100% 50%)", // Primary blue - medium shade
  },
  max: {
    label: "Max Salary",
    color: "hsl(220 100% 40%)", // Primary blue - darker shade
  },
};

export default function SalaryTrends() {
  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return `₹${value} LPA`;
  };

  return (
    <DashboardLayout role="student" title="Salary Trends">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="glass-card rounded-xl p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-display-sm mb-2">Salary Trends</h1>
              <p className="text-body-lg text-muted-foreground">
                Industry-wise salary ranges
              </p>
            </div>
            <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Last updated: December 15, 2024</span>
            </div>
          </div>
        </div>

        {/* Chart Card */}
        <div className="glass-card rounded-xl p-6 lg:p-8 bg-white dark:bg-card">
          <div className="mb-6">
            <h2 className="text-title text-foreground mb-1">
              Salary Distribution by Industry
            </h2>
            <p className="text-body-sm text-muted-foreground">
              Comparison of minimum, median, and maximum salary ranges (in LPA)
            </p>
          </div>

          {/* Chart Container */}
          <div className="w-full" style={{ height: "500px" }}>
            <ChartContainer config={chartConfig} className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salaryData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="industry"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    style={{
                      fontSize: "12px",
                    }}
                  />
                  <YAxis
                    label={{
                      value: "Salary (LPA / Thousands)",
                      angle: -90,
                      position: "insideLeft",
                      style: {
                        textAnchor: "middle",
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: "12px",
                      },
                    }}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(value) => `₹${value}L`}
                  />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) {
                        return null;
                      }

                      return (
                        <div className="rounded-lg border border-border bg-card p-4 shadow-lg">
                          <p className="font-semibold text-foreground mb-2">
                            {label}
                          </p>
                          {payload.map((entry, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between gap-4 py-1"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-body-sm text-muted-foreground">
                                  {chartConfig[entry.dataKey as keyof typeof chartConfig]?.label}
                                </span>
                              </div>
                              <span className="font-semibold text-foreground">
                                {formatCurrency(Number(entry.value))}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      paddingTop: "20px",
                    }}
                    content={({ payload }) => (
                      <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
                        {payload?.map((entry, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2"
                          >
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-body-sm text-foreground">
                              {entry.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                  <Bar
                    dataKey="min"
                    fill={chartConfig.min.color}
                    radius={[4, 4, 0, 0]}
                    name={chartConfig.min.label}
                  />
                  <Bar
                    dataKey="median"
                    fill={chartConfig.median.color}
                    radius={[4, 4, 0, 0]}
                    name={chartConfig.median.label}
                  />
                  <Bar
                    dataKey="max"
                    fill={chartConfig.max.color}
                    radius={[4, 4, 0, 0]}
                    name={chartConfig.max.label}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        {/* Additional Info Card */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-title text-foreground mb-4">About This Data</h3>
            <ul className="space-y-2 text-body-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>
                  Data reflects salary ranges across top tech companies in India
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>
                  Figures are based on entry to mid-level positions (0-5 years experience)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>
                  Salaries may vary based on location, company size, and individual skills
                </span>
              </li>
            </ul>
          </div>

          <div className="glass-card rounded-xl p-6">
            <h3 className="text-title text-foreground mb-4">Key Insights</h3>
            <ul className="space-y-2 text-body-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1">•</span>
                <span>
                  AI/ML and Cyber Security show the highest median salaries
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1">•</span>
                <span>
                  Software Development has the widest salary range
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1">•</span>
                <span>
                  Cloud Computing is showing steady growth in compensation
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

