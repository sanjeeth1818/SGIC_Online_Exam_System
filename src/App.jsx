import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Admin Components
import AdminLayout from './components/admin/AdminLayout';
import ProtectedRoute from './components/admin/ProtectedRoute';
import Dashboard from './pages/admin/Dashboard';
import Categories from './pages/admin/Categories';
import QuestionBank from './pages/admin/QuestionBank';
import CreateTest from './pages/admin/CreateTest';
import Results from './pages/admin/Results';
import Settings from './pages/admin/Settings';
import GradingConfig from './pages/admin/GradingConfig';
import Login from './pages/admin/Login';
import Students from './pages/admin/Students';

// Student Components
import StudentLayout from './components/student/StudentLayout';
import TestStart from './pages/student/TestStart';
import ExamInterface from './pages/student/ExamInterface';
import TestCompletion from './pages/student/TestCompletion';
import StudentResult from './pages/student/StudentResult';

function App() {
  return (
    <Router>
      <Routes>
        {/* Student Routes now starting from root */}
        <Route path="/" element={<StudentLayout />}>
          <Route index element={<TestStart />} />
          <Route path="exam" element={<ExamInterface />} />
          <Route path="complete" element={<TestCompletion />} />
          <Route path="result" element={<StudentResult />} />
        </Route>

        {/* Admin Login — public */}
        <Route path="/admin/login" element={<Login />} />

        {/* Admin Protected Routes — requires authentication */}
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="categories" element={<Categories />} />
            <Route path="questions" element={<QuestionBank />} />
            <Route path="create-test" element={<CreateTest />} />
            <Route path="results" element={<Results />} />
            <Route path="students" element={<Students />} />
            <Route path="grading" element={<GradingConfig />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
