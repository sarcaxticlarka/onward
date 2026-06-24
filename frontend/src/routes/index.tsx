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
import LandingPage from '../pages/LandingPage'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
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
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
