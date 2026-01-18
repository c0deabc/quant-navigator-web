import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  Settings,
  Database,
  Activity,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logAuditEvent } from '@/lib/audit';
import type { Database as DB } from '@/integrations/supabase/types';

type Profile = DB['public']['Tables']['profiles']['Row'];
type UserRole = DB['public']['Tables']['user_roles']['Row'];
type GlobalScanConfig = DB['public']['Tables']['global_scan_config']['Row'];

interface ProfileWithRole extends Profile {
  role: string;
}

const statusColors = {
  active: 'bg-success/10 text-success border-success/50',
  pending: 'bg-warning/10 text-warning border-warning/50',
  disabled: 'bg-destructive/10 text-destructive border-destructive/50',
};

function formatTimeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1m ago';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1h ago';
  return `${hours}h ago`;
}

export default function AdminDashboard() {
  const [profiles, setProfiles] = useState<ProfileWithRole[]>([]);
  const [scanConfig, setScanConfig] = useState<GlobalScanConfig | null>(null);
  const [signalCount, setSignalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [profilesRes, rolesRes, configRes, signalsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('*'),
        supabase.from('global_scan_config').select('*').limit(1).maybeSingle(),
        supabase.from('signals').select('id', { count: 'exact', head: true }).gte('expires_at', new Date().toISOString()),
      ]);

      if (!profilesRes.error && profilesRes.data) {
        const roles = rolesRes.data || [];
        const profilesWithRoles: ProfileWithRole[] = profilesRes.data.map(p => {
          const userRole = roles.find(r => r.user_id === p.user_id);
          return { ...p, role: userRole?.role || 'user' };
        });
        setProfiles(profilesWithRoles);
      }
      if (!configRes.error && configRes.data) setScanConfig(configRes.data);
      if (!signalsRes.error) setSignalCount(signalsRes.count || 0);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const pendingProfiles = profiles.filter(p => p.status === 'pending');
  const activeProfiles = profiles.filter(p => p.status === 'active');

  const handleApprove = async (profile: ProfileWithRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', profile.id);

      if (error) throw error;

      await logAuditEvent({
        action: 'user_approved',
        entityType: 'profile',
        entityId: profile.id,
        details: { email: profile.email },
      });

      toast.success('User approved successfully');
      fetchData();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    }
  };

  const handleReject = async (profile: ProfileWithRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'disabled' })
        .eq('id', profile.id);

      if (error) throw error;

      await logAuditEvent({
        action: 'user_rejected',
        entityType: 'profile',
        entityId: profile.id,
        details: { email: profile.email },
      });

      toast.success('User rejected');
      fetchData();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error rejecting user:', error);
      toast.error('Failed to reject user');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, scan configuration, and monitor system health
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Approvals
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingProfiles.length}</div>
              <p className="text-xs text-muted-foreground">
                Waiting for review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Users
              </CardTitle>
              <Users className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProfiles.length}</div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Signals
              </CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{signalCount}</div>
              <p className="text-xs text-muted-foreground">
                Above threshold
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last Scan
              </CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {scanConfig?.last_scan_at 
                  ? formatTimeAgo(new Date(scanConfig.last_scan_at))
                  : 'Never'}
              </div>
              <p className="text-xs text-muted-foreground">
                {scanConfig?.next_scan_at 
                  ? `Next in ${Math.max(0, Math.ceil((new Date(scanConfig.next_scan_at).getTime() - Date.now()) / 60000))} minutes`
                  : 'Not scheduled'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Quick Links */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/admin/users">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Approve pending users, manage roles and access
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/admin/scan-config">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Scan Configuration
                </CardTitle>
                <CardDescription>
                  Global scan parameters and scheduling
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/admin/data">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Data Management
                </CardTitle>
                <CardDescription>
                  Manage pair metrics and signal data
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Pending Approvals */}
        {pendingProfiles.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-warning" />
                    Pending User Approvals
                  </CardTitle>
                  <CardDescription>
                    Users waiting for account activation
                  </CardDescription>
                </div>
                <Link to="/admin/users">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingProfiles.slice(0, 5).map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{profile.display_name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{profile.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success border-success/50 hover:bg-success/10"
                            onClick={() => handleApprove(profile)}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/50 hover:bg-destructive/10"
                            onClick={() => handleReject(profile)}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* All Users Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  Overview of all registered users
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
                  <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                  Refresh
                </Button>
                <Link to="/admin/users">
                  <Button variant="outline" size="sm">
                    Manage Users
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.slice(0, 10).map((profile) => {
                    const role = profile.role;
                    return (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{profile.display_name || 'No name'}</p>
                            <p className="text-sm text-muted-foreground">{profile.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              role === 'admin'
                                ? 'border-primary/50 text-primary bg-primary/10'
                                : ''
                            )}
                          >
                            {role === 'admin' && <Shield className="mr-1 h-3 w-3" />}
                            {role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusColors[profile.status as keyof typeof statusColors]}
                          >
                            {profile.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit Role</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                Disable Account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
