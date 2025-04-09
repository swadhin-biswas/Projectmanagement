import {
  Building,
  Calendar,
  CheckCircle,
  Eye,
  Info,
  Mail,
  UserCog,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Textarea } from "../ui/textarea";

const SupervisorApprovalWorkflow = () => {
  const [pendingSupervisors, setPendingSupervisors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionOptions] = useState([
    "Incomplete profile information",
    "Invalid credentials",
    "Duplicate registration",
    "Not meeting department requirements",
    "Insufficient experience",
    "Other (please specify)",
  ]);

  useEffect(() => {
    fetchPendingSupervisors();
  }, []);

  const fetchPendingSupervisors = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await api.get("/api/admin/pending-supervisors", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPendingSupervisors(response.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch pending supervisors:", error);
      toast.error(
        "Could not load pending supervisors. Please try again later."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewSupervisor = (supervisor) => {
    setSelectedSupervisor(supervisor);
    setIsViewModalOpen(true);
  };

  const handleInitiateReject = (supervisor) => {
    setSelectedSupervisor(supervisor);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  };

  const handleApproveSupervisor = async (supervisorId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      await api.put(
        `/api/admin/approve-supervisor/${supervisorId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Supervisor approved successfully");

      // Remove from pending list
      setPendingSupervisors(
        pendingSupervisors.filter((s) => s._id !== supervisorId)
      );

      // Close modal if open
      if (selectedSupervisor && selectedSupervisor._id === supervisorId) {
        setIsViewModalOpen(false);
      }
    } catch (error) {
      console.error("Failed to approve supervisor:", error);
      toast.error("Failed to approve supervisor. Please try again.");
    }
  };

  const handleRejectSupervisor = async () => {
    if (!rejectionReason) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      await api.put(
        `/api/admin/reject-supervisor/${selectedSupervisor._id}`,
        { reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Supervisor application rejected");

      // Remove from pending list
      setPendingSupervisors(
        pendingSupervisors.filter((s) => s._id !== selectedSupervisor._id)
      );

      // Close modal
      setIsRejectModalOpen(false);
    } catch (error) {
      console.error("Failed to reject supervisor:", error);
      toast.error("Failed to reject supervisor. Please try again.");
    }
  };

  const setRejectionTemplate = (template) => {
    setRejectionReason(template);
  };

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper to create avatar fallback
  const getInitials = (name) => {
    if (!name) return "N/A";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Supervisor Approval Workflow</CardTitle>
        <CardDescription>
          Review and approve supervisor registrations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingSupervisors.length === 0 ? (
          <div className="py-6 text-center text-gray-500">
            <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No pending supervisor approvals</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supervisor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Registration Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingSupervisors.map((supervisor) => (
                <TableRow key={supervisor._id}>
                  <TableCell className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={supervisor.profilePicture}
                        alt={supervisor.fullName}
                      />
                      <AvatarFallback>
                        {getInitials(supervisor.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{supervisor.fullName}</span>
                  </TableCell>
                  <TableCell>{supervisor.email}</TableCell>
                  <TableCell>{supervisor.department || "N/A"}</TableCell>
                  <TableCell>{formatDate(supervisor.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewSupervisor(supervisor)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-green-600"
                        onClick={() => handleApproveSupervisor(supervisor._id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600"
                        onClick={() => handleInitiateReject(supervisor)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Supervisor Details Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Supervisor Application</DialogTitle>
              <DialogDescription>
                Review the details of this supervisor application
              </DialogDescription>
            </DialogHeader>

            {selectedSupervisor && (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={selectedSupervisor.profilePicture}
                      alt={selectedSupervisor.fullName}
                    />
                    <AvatarFallback>
                      {getInitials(selectedSupervisor.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedSupervisor.fullName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedSupervisor.department ||
                        "Department not specified"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Email</Label>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      <p>{selectedSupervisor.email}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">
                      Registration Date
                    </Label>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      <p>{formatDate(selectedSupervisor.createdAt)}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Department</Label>
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2 text-gray-400" />
                      <p>{selectedSupervisor.department || "Not specified"}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">
                      Specialization
                    </Label>
                    <div className="flex items-center">
                      <Info className="h-4 w-4 mr-2 text-gray-400" />
                      <p>
                        {selectedSupervisor.specialization || "Not specified"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">
                    Research Interests
                  </Label>
                  <p className="border rounded-md p-3 bg-gray-50 dark:bg-gray-900">
                    {selectedSupervisor.researchInterests ||
                      "No research interests specified"}
                  </p>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handleInitiateReject(selectedSupervisor)}
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() =>
                      handleApproveSupervisor(selectedSupervisor._id)
                    }
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Rejection Modal */}
        <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Reject Supervisor Application</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this application
              </DialogDescription>
            </DialogHeader>

            {selectedSupervisor && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={selectedSupervisor.profilePicture}
                      alt={selectedSupervisor.fullName}
                    />
                    <AvatarFallback>
                      {getInitials(selectedSupervisor.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedSupervisor.fullName}</p>
                    <p className="text-sm text-gray-500">
                      {selectedSupervisor.email}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rejection-reason">Rejection Reason</Label>
                  <Textarea
                    id="rejection-reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter detailed reason for rejection..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Common Rejection Reasons</Label>
                  <div className="flex flex-wrap gap-2">
                    {rejectionOptions.map((option) => (
                      <Badge
                        key={option}
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => setRejectionTemplate(option)}
                      >
                        {option}
                      </Badge>
                    ))}
                  </div>
                </div>

                <DialogFooter className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsRejectModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRejectSupervisor}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Confirm Rejection
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SupervisorApprovalWorkflow;
