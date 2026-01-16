import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Shield,
  ShieldOff,
  Ban,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logAuditEvent } from '@/lib/audit';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Database['public']['Tables']['user_roles']['Row'];
type UserStatus = Database['public']['Enums']['user_status'];
type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole extends Profile {
  roles: AppRole[];
}

const statusColors = {
  active: 'bg-success/10 text-success border-success/50',
  pending: 'bg-warning/10 text-warning border-warning/50',
  disabled: 'bg-destructive/10 text-destructive border-destructive/50',
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionDialog, setActionDialog] = useState<{
    type: 'approve' | 'disable' | 'enable' | 'makeAdmin' | 'removeAdmin' | null;
    user: UserWithRole | null;
  }>({ type: null, user: null });
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => ({
        ...profile,
        roles: (roles || [])
          .filter(r => r.user_id === profile.user_id)
          .map(r => r.role),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (user: UserWithRole) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' as UserStatus })
        .eq('user_id', user.user_id);

      if (error) throw error;

      await logAuditEvent({
        action: 'user_approved',
        entityType: 'profile',
        entityId: user.user_id,
        details: {
          target_user_id: user.user_id,
          target_email: user.email,
          target_display_name: user.display_name,
          new_status: 'active',
        },
      });

      toast.success(`${user.display_name || user.email} has been approved`);
      setActionDialog({ type: null, user: null });
      fetchUsers();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisable = async (user: UserWithRole) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'disabled' as UserStatus })
        .eq('user_id', user.user_id);

      if (error) throw error;

      await logAuditEvent({
        action: 'user_disabled',
        entityType: 'profile',
        entityId: user.user_id,
        details: {
          target_user_id: user.user_id,
          target_email: user.email,
          target_display_name: user.display_name,
          new_status: 'disabled',
        },
      });

      toast.success(`${user.display_name || user.email} has been disabled`);
      setActionDialog({ type: null, user: null });
      fetchUsers();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error disabling user:', error);
      toast.error('Failed to disable user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEnable = async (user: UserWithRole) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' as UserStatus })
        .eq('user_id', user.user_id);

      if (error) throw error;

      await logAuditEvent({
        action: 'user_enabled',
        entityType: 'profile',
        entityId: user.user_id,
        details: {
          target_user_id: user.user_id,
          target_email: user.email,
          target_display_name: user.display_name,
          new_status: 'active',
        },
      });

      toast.success(`${user.display_name || user.email} has been enabled`);
      setActionDialog({ type: null, user: null });
      fetchUsers();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error enabling user:', error);
      toast.error('Failed to enable user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMakeAdmin = async (user: UserWithRole) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: user.user_id, role: 'admin' as AppRole });

      if (error) throw error;

      await logAuditEvent({
        action: 'role_granted',
        entityType: 'user_roles',
        entityId: user.user_id,
        details: {
          target_user_id: user.user_id,
          target_email: user.email,
          role: 'admin',
        },
      });

      toast.success(`${user.display_name || user.email} is now an admin`);
      setActionDialog({ type: null, user: null });
      fetchUsers();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error making admin:', error);
      toast.error('Failed to grant admin role');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveAdmin = async (user: UserWithRole) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.user_id)
        .eq('role', 'admin');

      if (error) throw error;

      await logAuditEvent({
        action: 'role_revoked',
        entityType: 'user_roles',
        entityId: user.user_id,
        details: {
          target_user_id: user.user_id,
          target_email: user.email,
          role: 'admin',
        },
      });

      toast.success(`Admin role removed from ${user.display_name || user.email}`);
      setActionDialog({ type: null, user: null });
      fetchUsers();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error removing admin:', error);
      toast.error('Failed to remove admin role');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingUsers = filteredUsers.filter(u => u.status === 'pending');
  const activeUsers = filteredUsers.filter(u => u.status === 'active');
  const disabledUsers = filteredUsers.filter(u => u.status === 'disabled');

  const UserTable = ({ users: tableUsers }: { users: UserWithRole[] }) => (
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
        {tableUsers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              No users found
            </TableCell>
          </TableRow>
        ) : (
          tableUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{user.display_name || 'No name'}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {user.roles.includes('admin') && (
                    <Badge
                      variant="outline"
                      className="border-primary/50 text-primary bg-primary/10"
                    >
                      <Shield className="mr-1 h-3 w-3" />
                      admin
                    </Badge>
                  )}
                  {user.roles.includes('user') && !user.roles.includes('admin') && (
                    <Badge variant="outline">user</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={statusColors[user.status]}
                >
                  {user.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(user.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {user.status === 'pending' && (
                      <>
                        <DropdownMenuItem onClick={() => setActionDialog({ type: 'approve', user })}>
                          <CheckCircle className="mr-2 h-4 w-4 text-success" />
                          Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setActionDialog({ type: 'disable', user })}>
                          <XCircle className="mr-2 h-4 w-4 text-destructive" />
                          Reject
                        </DropdownMenuItem>
                      </>
                    )}
                    {user.status === 'active' && (
                      <>
                        {!user.roles.includes('admin') ? (
                          <DropdownMenuItem onClick={() => setActionDialog({ type: 'makeAdmin', user })}>
                            <Shield className="mr-2 h-4 w-4" />
                            Make Admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setActionDialog({ type: 'removeAdmin', user })}>
                            <ShieldOff className="mr-2 h-4 w-4" />
                            Remove Admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setActionDialog({ type: 'disable', user })}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Disable Account
                        </DropdownMenuItem>
                      </>
                    )}
                    {user.status === 'disabled' && (
                      <DropdownMenuItem onClick={() => setActionDialog({ type: 'enable', user })}>
                        <UserCheck className="mr-2 h-4 w-4 text-success" />
                        Enable Account
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              Manage user accounts, roles, and access permissions
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  {users.length} total users
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Tabs defaultValue="pending">
                <TabsList>
                  <TabsTrigger value="pending" className="gap-2">
                    Pending
                    {pendingUsers.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {pendingUsers.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="active">
                    Active ({activeUsers.length})
                  </TabsTrigger>
                  <TabsTrigger value="disabled">
                    Disabled ({disabledUsers.length})
                  </TabsTrigger>
                  <TabsTrigger value="all">
                    All ({filteredUsers.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-4">
                  <UserTable users={pendingUsers} />
                </TabsContent>
                <TabsContent value="active" className="mt-4">
                  <UserTable users={activeUsers} />
                </TabsContent>
                <TabsContent value="disabled" className="mt-4">
                  <UserTable users={disabledUsers} />
                </TabsContent>
                <TabsContent value="all" className="mt-4">
                  <UserTable users={filteredUsers} />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog
        open={actionDialog.type !== null}
        onOpenChange={(open) => !open && setActionDialog({ type: null, user: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'approve' && 'Approve User'}
              {actionDialog.type === 'disable' && 'Disable Account'}
              {actionDialog.type === 'enable' && 'Enable Account'}
              {actionDialog.type === 'makeAdmin' && 'Grant Admin Role'}
              {actionDialog.type === 'removeAdmin' && 'Remove Admin Role'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve' && (
                <>Are you sure you want to approve <strong>{actionDialog.user?.display_name || actionDialog.user?.email}</strong>? They will gain access to the platform.</>
              )}
              {actionDialog.type === 'disable' && (
                <>Are you sure you want to disable <strong>{actionDialog.user?.display_name || actionDialog.user?.email}</strong>? They will lose access to the platform.</>
              )}
              {actionDialog.type === 'enable' && (
                <>Are you sure you want to enable <strong>{actionDialog.user?.display_name || actionDialog.user?.email}</strong>? They will regain access to the platform.</>
              )}
              {actionDialog.type === 'makeAdmin' && (
                <>Are you sure you want to make <strong>{actionDialog.user?.display_name || actionDialog.user?.email}</strong> an admin? They will gain full administrative access.</>
              )}
              {actionDialog.type === 'removeAdmin' && (
                <>Are you sure you want to remove admin privileges from <strong>{actionDialog.user?.display_name || actionDialog.user?.email}</strong>?</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ type: null, user: null })}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.type === 'disable' ? 'destructive' : 'default'}
              onClick={() => {
                if (!actionDialog.user) return;
                switch (actionDialog.type) {
                  case 'approve':
                    handleApprove(actionDialog.user);
                    break;
                  case 'disable':
                    handleDisable(actionDialog.user);
                    break;
                  case 'enable':
                    handleEnable(actionDialog.user);
                    break;
                  case 'makeAdmin':
                    handleMakeAdmin(actionDialog.user);
                    break;
                  case 'removeAdmin':
                    handleRemoveAdmin(actionDialog.user);
                    break;
                }
              }}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
