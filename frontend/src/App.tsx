import { useEffect } from "react";
import api from "./api/client";
import { ServerWakingBanner } from "./components/ServerWakingBanner";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { FeedbackProvider } from "./context/FeedbackContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { NewLesson } from "./pages/NewLesson";
import { MyLessons } from "./pages/MyLessons";
import { Closing } from "./pages/Closing";
import { GeneralClosing } from "./pages/GeneralClosing";
import { Professores } from "./pages/Professores";
import { Historico } from "./pages/Historico";

export default function App() {
  useEffect(() => {
    api.get("/health/live").catch(() => undefined);
  }, []);

  return (
    <BrowserRouter>
      <ServerWakingBanner />
      <AuthProvider>
        <FeedbackProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/aulas"
            element={
              <ProtectedRoute>
                <MyLessons />
              </ProtectedRoute>
            }
          />
          <Route
            path="/aulas/nova"
            element={
              <ProtectedRoute>
                <NewLesson />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fechamento"
            element={
              <ProtectedRoute>
                <Closing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fechamento-geral"
            element={
              <ProtectedRoute requireRole="OWNER">
                <GeneralClosing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/professores"
            element={
              <ProtectedRoute requireRole="OWNER">
                <Professores />
              </ProtectedRoute>
            }
          />

          <Route
            path="/historico"
            element={
              <ProtectedRoute requireRole="OWNER">
                <Historico />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </FeedbackProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
