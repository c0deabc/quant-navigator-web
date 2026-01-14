import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireActive?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireActive = true,
}: ProtectedRouteProps) {
  const { user, isLoading, isAdmin, isActive, isPending, profile } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user is disabled
  if (profile?.status === 'disabled') {
    return <Navigate to="/disabled" replace />;
  }

  // Check if user is pending
  if (isPending && requireActive) {
    return <Navigate to="/pending" replace />;
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
