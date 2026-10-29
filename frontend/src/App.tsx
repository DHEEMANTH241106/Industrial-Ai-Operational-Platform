import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Overview from './components/Dashboard/Overview';
import LiveMonitoring from './components/Monitoring/LiveMonitoring';
import IncidentList from './components/Incidents/IncidentList';
import IncidentDetail from './components/Incidents/IncidentDetail';
import CameraManager from './components/Cameras/CameraManager';
import AnalyticsDashboard from './components/Analytics/AnalyticsDashboard';
import AdminPanel from './components/Admin/AdminPanel';
import LoginPage from './components/Auth/LoginPage';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

// Integrated Team Modules
import DefectVisionView from './components/DefectVision/DefectVisionView';
import CarFaultView from './components/CarFault/CarFaultView';
import AegisBurnView from './components/AegisBurn/AegisBurnView';
import PredictiveMaintenanceView from './components/PredictiveMaintenance/PredictiveMaintenanceView';
import AeroGuardView from './components/AeroGuard/AeroGuardView';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Authentication Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Dashboard & Monitoring Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Safety & Vision Routes */}
          <Route index element={<Overview />} />
          <Route path="monitoring" element={<LiveMonitoring />} />
          <Route path="incidents" element={<IncidentList />} />
          <Route path="incidents/:id" element={<IncidentDetail />} />
          <Route path="cameras" element={<CameraManager />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />

          {/* Integrated Industrial AI Suite Modules */}
          <Route path="defect-vision" element={<DefectVisionView />} />
          <Route path="car-fault" element={<CarFaultView />} />
          <Route path="aegis-burn" element={<AegisBurnView />} />
          <Route path="predictive-maintenance" element={<PredictiveMaintenanceView />} />
          <Route path="aeroguard" element={<AeroGuardView />} />

          {/* Admin */}
          <Route path="admin" element={<AdminPanel />} />
        </Route>

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
