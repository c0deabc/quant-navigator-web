import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, RefreshCw, TrendingUp } from 'lucide-react';
import { useState } from 'react';

export default function Pending() {
  const { signOut, refreshProfile, profile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Brand */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">StatArb Terminal</h1>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-warning/10 w-fit">
              <Clock className="h-8 w-8 text-warning" />
            </div>
            <CardTitle>Pending Approval</CardTitle>
            <CardDescription>
              Your account is awaiting admin approval
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Thank you for signing up, <span className="font-medium text-foreground">{profile?.display_name || profile?.email}</span>!
              </p>
              <p className="text-sm text-muted-foreground">
                An administrator will review your request shortly. You'll be able to access the platform once approved.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Check Status
              </Button>
              <Button
                variant="ghost"
                onClick={signOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
