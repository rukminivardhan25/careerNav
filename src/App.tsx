import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import StudentLogin from "./pages/auth/StudentLogin";
import MentorLogin from "./pages/auth/MentorLogin";
import StudentSignUp from "./pages/auth/StudentSignUp";
import MentorSignUp from "./pages/auth/MentorSignUp";
import StudentDashboard from "./pages/student/Dashboard";
import TopMentors from "./pages/student/TopMentors";
import MentorConnect from "./pages/student/MentorConnect";
import SessionsList from "./pages/student/SessionsList";
import SessionDetail from "./pages/student/SessionDetail";
import MentorDashboard from "./pages/mentor/Dashboard";
import MentorStudents from "./pages/mentor/Students";
import StudentSessions from "./pages/mentor/StudentSessions";
import StudentSessionDetail from "./pages/mentor/StudentSessionDetail";
import MentorSessionDetail from "./pages/mentor/SessionDetail";
import MentorReviews from "./pages/mentor/Reviews";
import MentorInsights from "./pages/mentor/Insights";
import MentorMessages from "./pages/mentor/Messages";
import MentorProfile from "./pages/mentor/MentorProfile";
import SkillTest from "./pages/mentor/SkillTest";
import Assessment from "./pages/assessment/Assessment";
import AptitudeAssessment from "./pages/assessment/Aptitude";
import PersonalityAssessment from "./pages/assessment/Personality";
import CareerReport from "./pages/assessment/CareerReport";
import ResumePage from "./pages/resume/ResumePage";
import MockInterviewHub from "./pages/interview/MockInterviewHub";
import InterviewSetup from "./pages/interview/InterviewSetup";
import InterviewSession from "./pages/interview/InterviewSession";
import Profile from "./pages/profile/Profile";
import EducationForm from "./pages/profile/EducationForm";
import LearningPath from "./pages/learning/LearningPath";
import SkillDetail from "./pages/learning/SkillDetail";
import CoverLetter from "./pages/cover-letter/CoverLetter";
import IndustryInsights from "./pages/industry/IndustryInsights";
import Support from "./pages/Support";
import { ProfileGuard } from "./components/auth/ProfileGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/signup" element={<StudentSignUp />} />
          <Route path="/mentor/login" element={<MentorLogin />} />
          <Route path="/mentor/signup" element={<MentorSignUp />} />
          <Route path="/student/dashboard" element={<ProfileGuard><StudentDashboard /></ProfileGuard>} />
          <Route path="/student/top-mentors" element={<TopMentors />} />
          <Route path="/student/mentor/:mentorId" element={<ProfileGuard><MentorConnect /></ProfileGuard>} />
          <Route path="/student/sessions" element={<ProfileGuard><SessionsList /></ProfileGuard>} />
          <Route path="/student/sessions/:sessionId" element={<ProfileGuard><SessionDetail /></ProfileGuard>} />
          <Route path="/mentor/dashboard" element={<MentorDashboard />} />
          <Route path="/mentor/students" element={<MentorStudents />} />
          <Route path="/mentor/students/:studentId/sessions" element={<StudentSessions />} />
          <Route path="/mentor/students/:studentId/sessions/:sessionId" element={<StudentSessionDetail />} />
          <Route path="/mentor/sessions/:sessionId" element={<MentorSessionDetail />} />
          <Route path="/mentor/reviews" element={<MentorReviews />} />
          <Route path="/mentor/insights" element={<MentorInsights />} />
          <Route path="/mentor/messages" element={<MentorMessages />} />
          <Route path="/mentor/skill-test" element={<SkillTest />} />
          <Route path="/mentor/profile" element={<MentorProfile />} />
          <Route path="/assessment" element={<ProfileGuard><Assessment /></ProfileGuard>} />
          <Route path="/assessment/aptitude" element={<ProfileGuard><AptitudeAssessment /></ProfileGuard>} />
          <Route path="/assessment/personality" element={<ProfileGuard><PersonalityAssessment /></ProfileGuard>} />
          <Route path="/assessment/report/:reportId" element={<ProfileGuard><CareerReport /></ProfileGuard>} />
          <Route path="/resume" element={<ProfileGuard><ResumePage /></ProfileGuard>} />
          <Route path="/interview/mock" element={<ProfileGuard><MockInterviewHub /></ProfileGuard>} />
          <Route path="/interview/setup" element={<ProfileGuard><InterviewSetup /></ProfileGuard>} />
          <Route path="/interview/session" element={<ProfileGuard><InterviewSession /></ProfileGuard>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/education" element={<EducationForm />} />
          <Route path="/learning-path" element={<ProfileGuard><LearningPath /></ProfileGuard>} />
          <Route path="/learning-path/skill/:skillId" element={<ProfileGuard><SkillDetail /></ProfileGuard>} />
          <Route path="/cover-letter" element={<ProfileGuard><CoverLetter /></ProfileGuard>} />
          <Route path="/industry/salary-trends" element={<ProfileGuard><IndustryInsights /></ProfileGuard>} />
          <Route path="/support" element={<Support />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

