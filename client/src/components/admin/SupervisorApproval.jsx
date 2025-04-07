import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui';

export const SupervisorApproval = ({ pendingSupervisors }) => {
  const queryClient = useQueryClient();
  const [selectedSupervisor, setSelectedSupervisor] = React.useState(null);
  const [rejectReason, setRejectReason] = React.useState('');

  const approveMutation = useMutation({
    mutationFn: async (supervisorId) => {
      const response = await api.post(`/api/admin/supervisor/${supervisorId}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-supervisors']);
      toast.success('Supervisor approved successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to approve supervisor');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ supervisorId, reason }) => {
      const response = await api.post(`/api/admin/supervisor/${supervisorId}/reject`, {
        reason
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-supervisors']);
      toast.success('Supervisor application rejected');
      setSelectedSupervisor(null);
      setRejectReason('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to reject supervisor');
    }
  });

  const handleApprove = (supervisor) => {
    approveMutation.mutate(supervisor._id);
  };

  const handleReject = () => {
    if (!selectedSupervisor) return;
    rejectMutation.mutate({
      supervisorId: selectedSupervisor._id,
      reason: rejectReason
    });
  };

  if (!pendingSupervisors?.length) {
    return (
      <Card className="bg-white dark:bg-gray-800 p-6">
        <div className="text-center text-gray-500">
          No pending supervisor approvals
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Pending Supervisor Approvals</h2>
      {pendingSupervisors.map((supervisor) => (
        <Card key={supervisor._id} className="bg-white dark:bg-gray-800 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar
                src={supervisor.user.profilePicture}
                fallback={supervisor.user.fullName[0]}
                className="h-12 w-12"
              />
              <div>
                <h3 className="text-lg font-medium">{supervisor.user.fullName}</h3>
                <p className="text-sm text-gray-500">{supervisor.user.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline">{supervisor.user.department}</Badge>
                  <Badge variant="secondary">
                    Requested {new Date(supervisor.createdAt).toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="space-x-2">
              <Button
                variant="success"
                size="sm"
                onClick={() => handleApprove(supervisor)}
                disabled={approveMutation.isLoading}
              >
                {approveMutation.isLoading ? 'Approving...' : 'Approve'}
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setSelectedSupervisor(supervisor)}
                  >
                    Reject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reject Supervisor Application</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to reject this supervisor application? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Rejection Reason</label>
                      <textarea
                        className="w-full mt-1 p-2 border rounded-md"
                        rows={3}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Please provide a reason for rejection..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={rejectMutation.isLoading || !rejectReason.trim()}
                    >
                      {rejectMutation.isLoading ? 'Rejecting...' : 'Confirm Rejection'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          {supervisor.specialization && (
            <div className="mt-4">
              <h4 className="text-sm font-medium">Specialization</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {supervisor.specialization}
              </p>
            </div>
          )}
          {supervisor.researchInterests?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium">Research Interests</h4>
              <div className="flex flex-wrap gap-2 mt-1">
                {supervisor.researchInterests.map((interest, index) => (
                  <Badge key={index} variant="secondary">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};