import { Route, Routes } from "react-router-dom";
import CandidateLayout from "@/layouts/CandidateLayout";
import PublicLayout from "@/layouts/PublicLayout";
import RecruiterLayout from "@/layouts/RecruiterLayout";
import ProtectedRoute from "@/routes/ProtectedRoute";
import Forgot from "@/pages/auth/Forgot";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import Reset from "@/pages/auth/Reset";
import CandidateOverview from "@/pages/candidate/Overview";
import CandidateProfile from "@/pages/candidate/Profile";
import MyCVs from "@/pages/candidate/MyCVs";
import MyApplications from "@/pages/candidate/Applications";
import Landing from "@/pages/public/Landing";
import Jobs from "@/pages/public/Jobs";
import JobDetails from "@/pages/public/JobDetails";
import RecruiterOverview from "@/pages/recruiter/Overview";
import CompanyProfile from "@/pages/recruiter/Company";
import JobManagement from "@/pages/recruiter/JobManagement";
import JobForm from "@/pages/recruiter/JobForm";
import Upload from "@/pages/recruiter/Upload";
import Rankings from "@/pages/recruiter/Rankings";
import MatchDetail from "@/pages/recruiter/MatchDetail";
import RecruiterApplications from "@/pages/recruiter/Applications";
import Analytics from "@/pages/recruiter/Analytics";
import Notifications from "@/pages/shared/Notifications";
import Settings from "@/pages/shared/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<PublicLayout />}>
        <Route path="/forgot-password" element={<Forgot />} />
        <Route path="/reset-password" element={<Reset />} />
        <Route path="/jobs" element={<Jobs base="/jobs" />} />
        <Route path="/jobs/:id" element={<JobDetails />} />
      </Route>
      <Route path="/candidate" element={<ProtectedRoute role="candidate" />}>
        <Route element={<CandidateLayout />}>
          <Route index element={<CandidateOverview />} />
          <Route path="profile" element={<CandidateProfile />} />
          <Route path="cvs" element={<MyCVs />} />
          <Route path="jobs" element={<Jobs base="/candidate/jobs" />} />
          <Route path="jobs/:id" element={<JobDetails />} />
          <Route path="applications" element={<MyApplications />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="/recruiter" element={<ProtectedRoute role="recruiter" />}>
        <Route element={<RecruiterLayout />}>
          <Route index element={<RecruiterOverview />} />
          <Route path="company" element={<CompanyProfile />} />
          <Route path="jobs" element={<JobManagement />} />
          <Route path="jobs/new" element={<JobForm />} />
          <Route path="jobs/:id/edit" element={<JobForm />} />
          <Route path="upload" element={<Upload />} />
          <Route path="rankings" element={<Rankings />} />
          <Route path="rankings/:jobId" element={<Rankings />} />
          <Route path="matches/:matchId" element={<MatchDetail />} />
          <Route path="applications" element={<RecruiterApplications />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<div className="p-16 text-center text-muted">Page not found.</div>} />
    </Routes>);
}
