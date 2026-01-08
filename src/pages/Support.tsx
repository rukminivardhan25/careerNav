import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getUserRole } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Support() {
  const navigate = useNavigate();
  const role = getUserRole();

  return (
    <DashboardLayout role={role || "student"} title="Support">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <div className="glass-card rounded-xl p-6 lg:p-8">
          <h1 className="text-headline text-foreground mb-2">Need Help?</h1>
          <p className="text-body text-muted-foreground">We're here to support you.</p>
        </div>

        {/* Content based on role */}
        {role === "student" ? (
          <div className="space-y-6">
            {/* Online Assessments */}
            <div className="glass-card rounded-xl p-6 lg:p-8">
              <h2 className="text-title text-foreground mb-4">Online Career Assessments</h2>
              <div className="space-y-4 text-body-sm text-muted-foreground">
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">What are Career Assessments?</h3>
                  <p>Our comprehensive assessments help you discover your strengths, personality traits, and ideal career paths. The assessment includes two parts:</p>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">1. Aptitude Assessment</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Tests your quantitative, logical reasoning, and verbal abilities</li>
                    <li>Takes approximately 10-15 minutes to complete</li>
                    <li>50 questions covering various problem-solving scenarios</li>
                    <li>Questions are personalized based on your education level and branch</li>
                    <li>Get instant scores and performance analysis</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">2. Personality Assessment</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Evaluates your work style, values, and career preferences</li>
                    <li>Uses Likert scale and choice-based questions</li>
                    <li>Reveals your strengths in teamwork, leadership, creativity, and analytical thinking</li>
                    <li>Helps identify careers that match your personality</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">After Completing Assessments</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Receive a detailed Career Report with personalized recommendations</li>
                    <li>Get 3-5 career options ranked by match percentage</li>
                    <li>View salary ranges, growth outlook, and required skills for each career</li>
                    <li>Select your preferred career path to unlock learning resources</li>
                    <li>Assessments are FREE and can be retaken anytime</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Career Options */}
            <div className="glass-card rounded-xl p-6 lg:p-8">
              <h2 className="text-title text-foreground mb-4">Career Options & Recommendations</h2>
              <div className="space-y-4 text-body-sm text-muted-foreground">
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">How Career Recommendations Work</h3>
                  <p>Based on your assessment results and profile, our AI generates personalized career recommendations that align with your strengths, interests, and educational background.</p>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">What You Get</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Match Percentage:</strong> See how well each career fits your profile (0-100%)</li>
                    <li><strong>Career Description:</strong> Detailed explanation of why this career suits you</li>
                    <li><strong>Salary Information:</strong> Entry-level to senior-level salary ranges in India (₹LPA)</li>
                    <li><strong>Growth Outlook:</strong> Industry growth potential (High/Medium/Low)</li>
                    <li><strong>Required Skills:</strong> Key skills needed to succeed in this career</li>
                    <li><strong>Career Readiness Score:</strong> Overall assessment of your career preparedness</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">Selecting Your Career</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Review all recommended careers and their match percentages</li>
                    <li>Select the career that interests you most</li>
                    <li>Once selected, a personalized Learning Path is generated for that career</li>
                    <li>You can change your selected career anytime</li>
                    <li>Your selection helps personalize mock interviews and mentor recommendations</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Learning Plans */}
            <div className="glass-card rounded-xl p-6 lg:p-8">
              <h2 className="text-title text-foreground mb-4">Learning Plans & Paths</h2>
              <div className="space-y-4 text-body-sm text-muted-foreground">
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">What is a Learning Path?</h3>
                  <p>A Learning Path is a structured, step-by-step roadmap to master the skills needed for your chosen career. It's automatically generated based on your selected career and current skill level.</p>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">Learning Path Structure</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>8-12 Skills:</strong> Organized in logical progression from foundational to advanced</li>
                    <li><strong>Skill Order:</strong> Each skill builds upon the previous one</li>
                    <li><strong>Estimated Duration:</strong> 1-3 weeks per skill, 10-16 weeks total</li>
                    <li><strong>Learning Resources:</strong> YouTube videos, documentation, courses, and tutorials</li>
                    <li><strong>Assignments:</strong> MCQs and practical tasks for each skill</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">How to Use Learning Paths</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Start with the first skill in your learning path</li>
                    <li>Watch recommended videos and read documentation</li>
                    <li>Complete MCQs to test your understanding</li>
                    <li>Work on practical assignments to build hands-on experience</li>
                    <li>Track your progress as you complete each skill</li>
                    <li>Move to the next skill only after completing the current one</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">Personalization</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Learning paths consider your existing skills and skip what you already know</li>
                    <li>Paths are adjusted based on your education level (year, branch)</li>
                    <li>Focus areas are prioritized based on your career choice</li>
                    <li>You can see your progress percentage and skills completed</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* How Platform Works */}
            <div className="glass-card rounded-xl p-6 lg:p-8">
              <h2 className="text-title text-foreground mb-4">How the Platform Works</h2>
              <div className="space-y-4 text-body-sm text-muted-foreground">
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">1. Complete Assessments & Select Career</h3>
                  <p>Take aptitude and personality assessments, review career recommendations, and select your preferred career path to unlock personalized learning resources.</p>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">2. Follow Your Learning Path</h3>
                  <p>Work through the structured learning path for your chosen career. Complete skills, assignments, and track your progress.</p>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">3. Find & Connect with Mentors</h3>
                  <p>Browse top mentors, view their profiles, expertise, and reviews. Connect with mentors who match your career goals and learning needs.</p>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">4. Request a Session</h3>
                  <p>Send a session request to your chosen mentor. Specify the skill/course you want to learn and add a message about your goals.</p>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">5. Mentor Approval & Payment</h3>
                  <p>Wait for mentor approval, then complete the payment via UPI or other payment methods. Payment is secure and handled through our payment gateway.</p>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">6. Schedule & Attend Sessions</h3>
                  <p>Once payment is confirmed, schedule your daily sessions. Attend live sessions, access learning materials, and complete assignments.</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6 lg:p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-title text-foreground mb-3">Assessments & Career</h3>
                    <ul className="space-y-2 text-body-sm text-muted-foreground">
                      <li>• Complete FREE aptitude and personality assessments.</li>
                      <li>• Get personalized career recommendations with match percentages.</li>
                      <li>• Select your preferred career to unlock learning paths.</li>
                      <li>• Assessments can be retaken anytime to update recommendations.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-title text-foreground mb-3">Learning Paths</h3>
                    <ul className="space-y-2 text-body-sm text-muted-foreground">
                      <li>• Get a structured learning path for your selected career.</li>
                      <li>• Follow skills in order from foundational to advanced.</li>
                      <li>• Access videos, documentation, and assignments for each skill.</li>
                      <li>• Track your progress and complete skills at your own pace.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-title text-foreground mb-3">Mock Interviews</h3>
                    <ul className="space-y-2 text-body-sm text-muted-foreground">
                      <li>• Mock interviews are FREE for students.</li>
                      <li>• Interviews are personalized based on your career assessment.</li>
                      <li>• You can choose interview type, skill, role, and difficulty.</li>
                      <li>• Practice with AI-generated questions tailored to your profile.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-title text-foreground mb-3">Sessions & Learning</h3>
                    <ul className="space-y-2 text-body-sm text-muted-foreground">
                      <li>• Only today's sessions appear under Ongoing.</li>
                      <li>• Sessions move to Completed after the session ends.</li>
                      <li>• Completed sessions auto-clear every day at 12:00 AM.</li>
                      <li>• Access course materials and assignments after payment.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-title text-foreground mb-3">Resume & Profile</h3>
                    <ul className="space-y-2 text-body-sm text-muted-foreground">
                      <li>• One resume can be reviewed by one mentor at a time.</li>
                      <li>• After review is completed, the resume cannot be reshared.</li>
                      <li>• Complete your profile to get better mentor recommendations.</li>
                    </ul>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-title text-foreground mb-3">Payments & Sessions</h3>
                    <ul className="space-y-2 text-body-sm text-muted-foreground">
                      <li>• Students pay for mentorship sessions with mentors.</li>
                      <li>• Payment is required after mentor approves your session request.</li>
                      <li>• Payments are secure and processed through payment gateway.</li>
                      <li>• Session access is unlocked only after successful payment.</li>
                      <li>• All payments are handled securely by the platform.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-title text-foreground mb-3">Contact Support</h3>
                    <div className="space-y-2 text-body-sm text-muted-foreground">
                      <p>• Email: <a href="mailto:support@careernav.com" className="text-primary hover:underline">support@careernav.com</a></p>
                      <p>• WhatsApp: <a href="https://wa.me/9190000000000" className="text-primary hover:underline">+91 90000 00000</a></p>
                      <p>• Support hours: 10 AM – 6 PM IST (Mon–Sat)</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-body-sm text-muted-foreground text-center">
                  For technical or learning-related issues, reach out anytime.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Payment System & How to Receive Payments */}
            <div className="glass-card rounded-xl p-6 lg:p-8 border-l-4 border-primary">
              <h2 className="text-title text-foreground mb-4">Payment System & Receiving Payments</h2>
              <div className="space-y-4 text-body-sm text-muted-foreground">
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">How Payments Work</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Students pay for sessions directly to the <strong>Admin</strong> (platform escrow account)</li>
                    <li>All payments are processed through the platform's payment gateway</li>
                    <li>Payment is held securely until the session is completed</li>
                    <li>After session completion, admin processes your payout</li>
                    <li>Platform fee is deducted before your payout is calculated</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">To Receive Your Payments</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Contact Admin Directly:</strong> All payment-related matters are handled by admin</li>
                    <li><strong>Provide Session Details:</strong> Always include Session ID when contacting admin</li>
                    <li><strong>Payment Information Required:</strong> Share your bank account or UPI details with admin</li>
                    <li><strong>Verification:</strong> Admin verifies session completion before processing payout</li>
                    <li><strong>Payout Timeline:</strong> Payments are processed after admin verification (typically within 3-5 business days)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">Important Payment Rules</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>DO NOT</strong> request payments directly from students</li>
                    <li><strong>DO NOT</strong> accept payments outside the platform</li>
                    <li>All payments must go through the platform's admin system</li>
                    <li>Contact admin for any payment-related queries or issues</li>
                    <li>Keep track of your completed sessions for payout requests</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* How Platform Works for Mentors */}
            <div className="glass-card rounded-xl p-6 lg:p-8">
              <h2 className="text-title text-foreground mb-4">How the Platform Works</h2>
              <div className="space-y-4 text-body-sm text-muted-foreground">
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">1. Complete Your Profile</h3>
                  <p>Set up your mentor profile with your expertise, skills, experience, and pricing. A complete profile helps students find you. Make sure to provide accurate payment information to admin.</p>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">2. Receive Session Requests</h3>
                  <p>Students browse mentors and send session requests for skills you teach. You'll see pending requests in your dashboard under "Pending Approval".</p>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">3. Approve or Reject Requests</h3>
                  <p>Review each request and approve if you can mentor the student, or reject if unavailable. Students are notified of your decision. Once approved, students proceed to payment.</p>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">4. Student Makes Payment to Admin</h3>
                  <p>After approval, students pay for the session through the platform. Payment goes to admin (escrow account), not directly to you. You'll see payment status in your dashboard.</p>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">5. Conduct Sessions</h3>
                  <p>Once payment is confirmed, schedule daily sessions, share Zoom links, upload learning materials, and provide assignments. Mark sessions as completed when done.</p>
                </div>
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">6. Contact Admin for Payout</h3>
                  <p>After session completion, contact admin with your Session ID to request payout. Admin verifies completion and processes your payment. Provide your bank/UPI details to admin for receiving payments.</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6 lg:p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-title text-foreground mb-3">Payment Setup & Receiving Payments</h3>
                    <ul className="space-y-2 text-body-sm text-muted-foreground">
                      <li>• Contact admin to set up your payment account details</li>
                      <li>• Provide bank account number, IFSC, or UPI ID to admin</li>
                      <li>• All payouts are processed by admin after session completion</li>
                      <li>• Platform fee is automatically deducted before payout</li>
                      <li>• Keep your payment information updated with admin</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-title text-foreground mb-3">Payment Support (CRITICAL)</h3>
                    <div className="space-y-2 text-body-sm text-muted-foreground">
                      <p className="font-semibold text-foreground">For ALL payment-related matters, contact:</p>
                      <p>• Admin WhatsApp: <a href="https://wa.me/9198888888888" className="text-primary hover:underline font-medium">+91 98888 88888</a></p>
                      <p>• Admin Email: <a href="mailto:admin@careernav.com" className="text-primary hover:underline font-medium">admin@careernav.com</a></p>
                      <p className="mt-2">• <strong>Always include:</strong> Session ID, Student Name, Session Date</p>
                      <p>• <strong>For payout requests:</strong> Mention completed session details</p>
                      <p>• <strong>For payment setup:</strong> Request payment account registration</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-title text-foreground mb-3">Session Management</h3>
                    <ul className="space-y-2 text-body-sm text-muted-foreground">
                      <li>• Mark sessions as completed after finishing</li>
                      <li>• Upload resources only to scheduled sessions</li>
                      <li>• Daily sessions auto-refresh at 12:00 AM</li>
                      <li>• Add Zoom links for scheduled sessions</li>
                      <li>• Review student assignments and provide feedback</li>
                      <li>• Track session completion status for payout requests</li>
                    </ul>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-title text-foreground mb-3">Platform Features</h3>
                    <ul className="space-y-2 text-body-sm text-muted-foreground">
                      <li>• Review student resumes and cover letters</li>
                      <li>• Provide ratings (1-5 stars) and feedback on submissions</li>
                      <li>• Track your students and session history</li>
                      <li>• View insights and analytics about your mentoring</li>
                      <li>• Manage multiple students and courses simultaneously</li>
                      <li>• See payment status for each session in dashboard</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-title text-foreground mb-3">Payment Process Flow</h3>
                    <ol className="list-decimal list-inside space-y-2 text-body-sm text-muted-foreground">
                      <li>Student pays to admin after session approval</li>
                      <li>Payment status shows as "SUCCESS" in your dashboard</li>
                      <li>Conduct and complete the scheduled sessions</li>
                      <li>Mark session as completed in the platform</li>
                      <li>Contact admin with Session ID to request payout</li>
                      <li>Admin verifies and processes your payment</li>
                      <li>Receive payout to your registered account</li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-title text-foreground mb-3">Technical Help</h3>
                    <ul className="space-y-2 text-body-sm text-muted-foreground">
                      <li>• For dashboard or session issues, contact support</li>
                      <li>• Report any technical problems immediately</li>
                      <li>• Payment issues should go to admin, not support</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-title text-foreground mb-3">Contact Support</h3>
                    <div className="space-y-2 text-body-sm text-muted-foreground">
                      <p>• Email: <a href="mailto:support@careernav.com" className="text-primary hover:underline">support@careernav.com</a></p>
                      <p>• WhatsApp: <a href="https://wa.me/9190000000000" className="text-primary hover:underline">+91 90000 00000</a></p>
                      <p>• Support hours: 10 AM – 6 PM IST (Mon–Sat)</p>
                      <p className="mt-2 text-destructive/80"><strong>Note:</strong> For payments, contact admin, not support</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-body-sm text-muted-foreground text-center">
                  <strong>Remember:</strong> All payments go through admin. Contact admin directly for payment setup, payout requests, and payment-related queries. Do NOT request payments from students.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
