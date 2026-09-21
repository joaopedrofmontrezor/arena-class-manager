import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { NewLesson } from "./pages/NewLesson";
import { MyLessons } from "./pages/MyLessons";
import { Closing } from "./pages/Closing";
import { GeneralClosing } from "./pages/GeneralClosing";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
