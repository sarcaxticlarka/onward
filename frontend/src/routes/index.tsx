import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { DashboardPage } from '../pages/DashboardPage'
import { TasksPage } from '../pages/TasksPage'
import { AgentPage } from '../pages/AgentPage'
import { AnalyticsPage } from '../pages/AnalyticsPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { GoogleCallbackPage } from '../pages/GoogleCallbackPage'
import { CalendarConnectedPage } from '../pages/CalendarConnectedPage'
import LandingPage from '../pages/LandingPage'
import { CrisisPage } from '../pages/CrisisPage'
import { RoomsPage } from '../pages/RoomsPage'
import { WeeklyReportPage } from '../pages/WeeklyReportPage'
import { ProfilePage } from '../pages/ProfilePage'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/auth/google/success', element: <GoogleCallbackPage /> },
  { path: '/calendar/connected', element: <CalendarConnectedPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/tasks', element: <TasksPage /> },
          { path: '/agent', element: <AgentPage /> },
          { path: '/analytics', element: <AnalyticsPage /> },
          { path: '/crisis', element: <CrisisPage /> },
          { path: '/rooms', element: <RoomsPage /> },
          { path: '/report', element: <WeeklyReportPage /> },
          { path: '/profile', element: <ProfilePage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
