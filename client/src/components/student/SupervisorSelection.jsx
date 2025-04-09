import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, UserCheck, UserCog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import { Textarea } from "../ui/textarea";

const SupervisorSelection = ({ projectId, teamId }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [supervisorRole, setSupervisorRole] = useState("primary");

  // Fetch available supervisors
  const { data: supervisors, isLoading } = useQuery({
    queryKey: ["available-supervisors", projectId],
    queryFn: async () => {
      const response = await api.get(
        `/api/supervisors/available?projectId=${projectId}`
      );
      return response.data.data;
    },
  });

  // Fetch project details to show already assigned supervisors
  const { data: projectDetails } = useQuery({
    queryKey: ["project-details", projectId],
    queryFn: async () => {
      const response = await api.get(`/api/projects/${projectId}`);
      return response.data.data;
    },
    enabled: !!projectId,
  });

  // Request supervisor mutation
  const requestSupervisor = useMutation({
    mutationFn: async (data) => {
      const response = await api.post(
        `/api/projects/${projectId}/request-supervisor`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Supervisor request sent successfully");
      setRequestDialogOpen(false);
      setSelectedSupervisor(null);
      setRequestNote("");
      setSupervisorRole("primary");
      queryClient.invalidateQueries({
        queryKey: ["project-details", projectId],
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.error || "Failed to send supervisor request"
      );
    },
  });

  const handleRequestSupervisor = () => {
    if (!selectedSupervisor) return;

    requestSupervisor.mutate({
      supervisorId: selectedSupervisor._id,
      role: supervisorRole,
      note: requestNote,
      isMainSupervisor: supervisorRole === "primary",
    });
  };

  const handleSelectSupervisor = (supervisor) => {
    setSelectedSupervisor(supervisor);
    setRequestDialogOpen(true);
  };

  const filteredSupervisors = supervisors?.filter((supervisor) => {
    // Filter out already requested/assigned supervisors
    const isAlreadyRequested = projectDetails?.supervisors?.some(
      (s) => s.supervisor._id === supervisor._id
    );

    if (isAlreadyRequested) return false;

    // Filter by search query
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      supervisor.fullName.toLowerCase().includes(query) ||
      supervisor.department.toLowerCase().includes(query) ||
      (supervisor.specialization &&
        supervisor.specialization.toLowerCase().includes(query))
    );
  });

  // Check if we've reached the maximum number of supervisors allowed
  const hasMaxSupervisors =
    projectDetails?.supervisors?.length >=
    (projectDetails?.session?.maxSupervisorsPerProject || 3);

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-8 w-48" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-full" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          Select Supervisor
        </CardTitle>
        <CardDescription>
          Choose a supervisor for your project from the list of available
          faculty
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current supervisors section */}
        {projectDetails?.supervisors &&
          projectDetails.supervisors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Current Supervisors</h3>
              <div className="space-y-3">
                {projectDetails.supervisors.map((sup) => (
                  <div
                    key={sup.supervisor._id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback
                        className={
                          sup.isMainSupervisor
                            ? "bg-blue-100 text-blue-700"
                            : ""
                        }
                      >
                        {getInitials(sup.supervisor.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {sup.supervisor.fullName}
                        {sup.isMainSupervisor && (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200"
                          >
                            Primary
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {sup.supervisor.department}
                      </div>
                    </div>
                    <Badge
                      className={
                        sup.status === "accepted"
                          ? "bg-green-100 text-green-700"
                          : sup.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }
                    >
                      {sup.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search by name, department, or specialization..."
            className="w-full pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Available supervisors list */}
        {filteredSupervisors?.length > 0 ? (
          <div className="grid gap-4">
            {filteredSupervisors.map((supervisor) => (
              <div
                key={supervisor._id}
                className="flex items-center justify-between p-3 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {getInitials(supervisor.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{supervisor.fullName}</div>
                    <div className="text-sm text-gray-500">
                      {supervisor.department}
                      {supervisor.specialization &&
                        ` • ${supervisor.specialization}`}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSelectSupervisor(supervisor)}
                  disabled={hasMaxSupervisors}
                >
                  Request
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <UserCheck className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium">No available supervisors</h3>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery
                ? "Try adjusting your search"
                : "All supervisors are already assigned"}
            </p>
          </div>
        )}
      </CardContent>

      {hasMaxSupervisors && (
        <CardFooter className="bg-yellow-50 text-yellow-700 text-sm px-6 py-3">
          You have reached the maximum number of supervisors allowed per project
        </CardFooter>
      )}

      {/* Request dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Supervisor</DialogTitle>
            <DialogDescription>
              Send a request to {selectedSupervisor?.fullName} to supervise your
              project
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Supervisor Role</Label>
              <Select value={supervisorRole} onValueChange={setSupervisorRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary Supervisor</SelectItem>
                  <SelectItem value="co_supervisor">Co-Supervisor</SelectItem>
                  <SelectItem value="advisor">Advisor</SelectItem>
                  <SelectItem value="industry_mentor">
                    Industry Mentor
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Request Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Add a note to your supervisor request..."
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRequestDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestSupervisor}
              disabled={requestSupervisor.isPending}
            >
              {requestSupervisor.isPending
                ? "Sending Request..."
                : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SupervisorSelection;
