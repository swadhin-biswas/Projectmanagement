import { Briefcase, Building, CheckCircle, Mail, XCircle } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Textarea } from "../ui/textarea";

const SupervisorApprovalPanel = () => {
  const [pendingSupervisors, setPendingSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPendingSupervisors = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/admin/pending-supervisors");
      setPendingSupervisors(response.data || []);
    } catch (error) {
      console.error("Failed to fetch pending supervisors:", error);
      toast.error("Failed to load pending supervisor requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingSupervisors();
  }, []);

  const handleApprove = async (supervisor) => {
    setIsSubmitting(true);
    try {
      const response = await api.put(
        `/api/admin/approve-supervisor/${supervisor._id}`,
        {
          action: "approve",
        }
      );

      if (response.data.success) {
        toast.success(`Approved ${supervisor.user?.fullName || "supervisor"}`);
        setPendingSupervisors(
          pendingSupervisors.filter((s) => s._id !== supervisor._id)
        );
      }
    } catch (error) {
      console.error("Failed to approve supervisor:", error);
      toast.error(
        error.response?.data?.error || "Failed to approve supervisor"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSupervisor) return;

    setIsSubmitting(true);
    try {
      const response = await api.put(
        `/api/admin/approve-supervisor/${selectedSupervisor._id}`,
        {
          action: "reject",
          reason: rejectReason,
        }
      );

      if (response.data.success) {
        toast.success(
          `Rejected ${selectedSupervisor.user?.fullName || "supervisor"}`
        );
        setPendingSupervisors(
          pendingSupervisors.filter((s) => s._id !== selectedSupervisor._id)
        );
        setShowRejectDialog(false);
        setSelectedSupervisor(null);
        setRejectReason("");
      }
    } catch (error) {
      console.error("Failed to reject supervisor:", error);
      toast.error(error.response?.data?.error || "Failed to reject supervisor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRejectDialog = (supervisor) => {
    setSelectedSupervisor(supervisor);
    setShowRejectDialog(true);
  };

  const closeRejectDialog = () => {
    setShowRejectDialog(false);
    setSelectedSupervisor(null);
    setRejectReason("");
  };

  const filteredSupervisors = pendingSupervisors.filter(
    (supervisor) =>
      supervisor.user?.fullName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      supervisor.user?.email
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      supervisor.user?.department
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pending Supervisor Approvals</CardTitle>
          <CardDescription>
            {pendingSupervisors.length} supervisor
            {pendingSupervisors.length !== 1 ? "s" : ""} waiting for approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by name, email, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {filteredSupervisors.length === 0 ? (
            <div className="text-center p-4 border rounded-md bg-muted/50">
              <p>No pending supervisor approval requests found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSupervisors.map((supervisor) => (
                  <TableRow key={supervisor._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={supervisor.user?.profilePicture} />
                          <AvatarFallback>
                            {getInitials(supervisor.user?.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {supervisor.user?.fullName}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {supervisor.user?.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                        {supervisor.user?.department || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                        {supervisor.specialization || "Not specified"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(supervisor.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(supervisor)}
                          disabled={isSubmitting}
                        >
                          <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRejectDialog(supervisor)}
                          disabled={isSubmitting}
                        >
                          <XCircle className="h-4 w-4 mr-1 text-red-500" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showRejectDialog} onOpenChange={closeRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Supervisor Application</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 border rounded-md bg-muted/30">
              <div className="font-medium">
                {selectedSupervisor?.user?.fullName}
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedSupervisor?.user?.email}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {selectedSupervisor?.user?.department}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reason for Rejection
              </label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Provide a reason for rejection (optional)"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeRejectDialog}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupervisorApprovalPanel;
