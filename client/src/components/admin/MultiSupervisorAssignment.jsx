import { AlertCircle, CheckCircle, PlusCircle, Users } from "lucide-react";
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
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

const MultiSupervisorAssignment = () => {
  const [teams, setTeams] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    supervisorId: "",
    role: "primary",
  });
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [teamFilter, setTeamFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTeamsAndSupervisors();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [teams, teamFilter, searchTerm]);

  const fetchTeamsAndSupervisors = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required");
      }

      const [teamsResponse, supervisorsResponse] = await Promise.all([
        api.get("/api/admin/teams", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get("/api/admin/available-supervisors", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setTeams(teamsResponse.data?.data?.teams || []);
      setSupervisors(supervisorsResponse.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch teams or supervisors:", error);
      toast.error(
        "Could not load teams or supervisors. Please try again later."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...teams];

    // Apply filter by supervisor status
    if (teamFilter === "withSupervisor") {
      filtered = filtered.filter(
        (team) => team.supervisors && team.supervisors.length > 0
      );
    } else if (teamFilter === "withoutSupervisor") {
      filtered = filtered.filter(
        (team) => !team.supervisors || team.supervisors.length === 0
      );
    }

    // Apply search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (team) =>
          team.name.toLowerCase().includes(term) ||
          (team.teamId && team.teamId.toLowerCase().includes(term))
      );
    }

    setFilteredTeams(filtered);
  };

  const handleOpenAssignModal = (team) => {
    setSelectedTeam(team);
    setAssignmentForm({
      supervisorId: "",
      role: "primary",
    });
    setIsAssignModalOpen(true);
  };

  const handleAssignmentFormChange = (field, value) => {
    setAssignmentForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAssignSupervisor = async () => {
    if (!assignmentForm.supervisorId) {
      toast.error("Please select a supervisor");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const response = await api.post(
        `/api/admin/teams/${selectedTeam._id}/assign-supervisor`,
        {
          supervisorId: assignmentForm.supervisorId,
          role: assignmentForm.role,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Supervisor assigned successfully");

      // Update local state
      setTeams((prevTeams) => {
        return prevTeams.map((team) => {
          if (team._id === selectedTeam._id) {
            // Find the assigned supervisor
            const assignedSupervisor = supervisors.find(
              (s) => s._id === assignmentForm.supervisorId
            );

            // Create a new supervisors array or use the existing one
            const updatedSupervisors = [...(team.supervisors || [])];

            // Update the role of existing primary supervisor if needed
            if (assignmentForm.role === "primary") {
              const existingPrimaryIndex = updatedSupervisors.findIndex(
                (s) => s.role === "primary"
              );
              if (existingPrimaryIndex !== -1) {
                updatedSupervisors[existingPrimaryIndex].role = "co_supervisor";
              }
            }

            // Add the new supervisor
            updatedSupervisors.push({
              supervisor: assignedSupervisor,
              role: assignmentForm.role,
              assignedAt: new Date().toISOString(),
            });

            return {
              ...team,
              supervisors: updatedSupervisors,
            };
          }
          return team;
        });
      });

      // Close modal
      setIsAssignModalOpen(false);
    } catch (error) {
      console.error("Failed to assign supervisor:", error);
      toast.error("Failed to assign supervisor. Please try again.");
    }
  };

  // Helper function to get supervisor workload status
  const getSupervisorWorkloadStatus = (supervisor) => {
    const { teamsCount, maxTeams } = supervisor;
    const loadPercentage = (teamsCount / maxTeams) * 100;

    if (loadPercentage >= 90) {
      return { status: "high", color: "bg-red-500", text: "High" };
    } else if (loadPercentage >= 70) {
      return { status: "medium", color: "bg-yellow-500", text: "Medium" };
    } else {
      return { status: "low", color: "bg-green-500", text: "Low" };
    }
  };

  // Helper function to get supervisor role badge
  const getSupervisorRoleBadge = (role) => {
    if (role === "primary") {
      return <Badge className="bg-blue-500">Primary</Badge>;
    } else {
      return <Badge className="bg-purple-500">Co-supervisor</Badge>;
    }
  };

  // Helper to get initials
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
        <CardTitle>Multi-Supervisor Assignment</CardTitle>
        <CardDescription>
          Assign multiple supervisors to teams with specific roles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search teams..."
              className="w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                <SelectItem value="withSupervisor">With Supervisor</SelectItem>
                <SelectItem value="withoutSupervisor">
                  Without Supervisor
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-1">
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span>Low Load</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <span>Medium Load</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              <span>High Load</span>
            </Badge>
          </div>
        </div>

        {filteredTeams.length === 0 ? (
          <div className="py-6 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No teams found with the current filters</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Current Supervisors</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeams.map((team) => (
                <TableRow key={team._id}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{team.name}</div>
                      <div className="text-sm text-gray-500">{team.teamId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex -space-x-2">
                      {(team.members || []).slice(0, 3).map((member, idx) => (
                        <Avatar
                          key={idx}
                          className="h-8 w-8 border-2 border-white"
                        >
                          <AvatarImage
                            src={member.user?.profilePicture}
                            alt={member.user?.fullName}
                          />
                          <AvatarFallback>
                            {getInitials(member.user?.fullName)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {(team.members || []).length > 3 && (
                        <Avatar className="h-8 w-8 border-2 border-white bg-gray-200">
                          <AvatarFallback>
                            +{(team.members || []).length - 3}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {(team.members || []).length} members
                    </div>
                  </TableCell>
                  <TableCell>
                    {!team.supervisors || team.supervisors.length === 0 ? (
                      <div className="flex items-center text-amber-500">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>No supervisors assigned</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(team.supervisors || []).map(
                          (supervisorAssignment, idx) => {
                            const supervisor = supervisorAssignment.supervisor;
                            const workloadStatus =
                              getSupervisorWorkloadStatus(supervisor);

                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between"
                              >
                                <div className="flex items-center">
                                  <Avatar className="h-6 w-6 mr-2">
                                    <AvatarImage
                                      src={supervisor.user?.profilePicture}
                                      alt={supervisor.user?.fullName}
                                    />
                                    <AvatarFallback>
                                      {getInitials(supervisor.user?.fullName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{supervisor.user?.fullName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getSupervisorRoleBadge(
                                    supervisorAssignment.role
                                  )}
                                  <Badge
                                    variant="outline"
                                    className="flex items-center gap-1"
                                  >
                                    <div
                                      className={`h-2 w-2 rounded-full ${workloadStatus.color}`}
                                    ></div>
                                    <span>{workloadStatus.text}</span>
                                  </Badge>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAssignModal(team)}
                      className="flex items-center"
                    >
                      <PlusCircle className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Assign Supervisor Modal */}
        <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Assign Supervisor to Team</DialogTitle>
              <DialogDescription>
                {selectedTeam && `Assign a supervisor to ${selectedTeam.name}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {selectedTeam &&
                selectedTeam.supervisors &&
                selectedTeam.supervisors.length > 0 && (
                  <div className="space-y-2">
                    <Label>Current Supervisors</Label>
                    <div className="border rounded-md p-3 bg-gray-50 dark:bg-gray-900 space-y-2">
                      {selectedTeam.supervisors.map(
                        (supervisorAssignment, idx) => {
                          const supervisor = supervisorAssignment.supervisor;
                          return (
                            <div
                              key={idx}
                              className="flex justify-between items-center"
                            >
                              <div className="flex items-center">
                                <Avatar className="h-6 w-6 mr-2">
                                  <AvatarImage
                                    src={supervisor.user?.profilePicture}
                                    alt={supervisor.user?.fullName}
                                  />
                                  <AvatarFallback>
                                    {getInitials(supervisor.user?.fullName)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{supervisor.user?.fullName}</span>
                              </div>
                              {getSupervisorRoleBadge(
                                supervisorAssignment.role
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

              <div className="space-y-2">
                <Label htmlFor="supervisor">Select Supervisor</Label>
                <Select
                  value={assignmentForm.supervisorId}
                  onValueChange={(value) =>
                    handleAssignmentFormChange("supervisorId", value)
                  }
                >
                  <SelectTrigger id="supervisor">
                    <SelectValue placeholder="Select a supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Available Supervisors</SelectLabel>
                      {supervisors.map((supervisor) => {
                        const workloadStatus =
                          getSupervisorWorkloadStatus(supervisor);
                        return (
                          <SelectItem
                            key={supervisor._id}
                            value={supervisor._id}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{supervisor.fullName}</span>
                              <Badge
                                variant="outline"
                                className="flex items-center gap-1 ml-2"
                              >
                                <div
                                  className={`h-2 w-2 rounded-full ${workloadStatus.color}`}
                                ></div>
                                <span>
                                  {supervisor.teamsCount}/{supervisor.maxTeams}
                                </span>
                              </Badge>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Supervisor Role</Label>
                <Select
                  value={assignmentForm.role}
                  onValueChange={(value) =>
                    handleAssignmentFormChange("role", value)
                  }
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary Supervisor</SelectItem>
                    <SelectItem value="co_supervisor">Co-supervisor</SelectItem>
                  </SelectContent>
                </Select>

                {assignmentForm.role === "primary" &&
                  selectedTeam &&
                  selectedTeam.supervisors &&
                  selectedTeam.supervisors.some(
                    (s) => s.role === "primary"
                  ) && (
                    <div className="flex items-center text-amber-500 mt-2">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span className="text-xs">
                        This team already has a primary supervisor. The existing
                        primary supervisor will be changed to co-supervisor.
                      </span>
                    </div>
                  )}
              </div>

              {assignmentForm.supervisorId && (
                <div className="border rounded-md p-3 bg-gray-50 dark:bg-gray-900">
                  <h4 className="text-sm font-medium mb-2">
                    Supervisor Information
                  </h4>
                  {(() => {
                    const selectedSupervisor = supervisors.find(
                      (s) => s._id === assignmentForm.supervisorId
                    );
                    if (!selectedSupervisor) return null;

                    const workloadStatus =
                      getSupervisorWorkloadStatus(selectedSupervisor);

                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="text-sm">Department:</div>
                          <div className="text-sm font-medium">
                            {selectedSupervisor.department || "N/A"}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-sm">Specialization:</div>
                          <div className="text-sm font-medium">
                            {selectedSupervisor.specialization || "N/A"}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-sm">Current Workload:</div>
                          <div className="flex items-center">
                            <div
                              className={`h-2 w-2 rounded-full ${workloadStatus.color} mr-2`}
                            ></div>
                            <span className="text-sm font-medium">
                              {selectedSupervisor.teamsCount}/
                              {selectedSupervisor.maxTeams} teams
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setIsAssignModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignSupervisor}
                disabled={!assignmentForm.supervisorId}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Assign Supervisor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default MultiSupervisorAssignment;
