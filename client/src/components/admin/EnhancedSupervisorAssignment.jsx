import {
  AlertCircle,
  Check,
  Search,
  Star,
  UserPlus,
  Users,
  X,
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
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
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

const EnhancedSupervisorAssignment = () => {
  const [teams, setTeams] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState([]);
  const [supervisorSearch, setSupervisorSearch] = useState("");
  const [filteredSupervisors, setFilteredSupervisors] = useState([]);
  const [showWorkloadWarning, setShowWorkloadWarning] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchTeamsAndSupervisors();
    }
  }, [selectedSession]);

  useEffect(() => {
    // Filter teams based on search query
    const filtered = teams.filter(
      (team) =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.members.some((member) =>
          member.user?.fullName
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())
        )
    );
    setFilteredTeams(filtered);
  }, [searchQuery, teams]);

  useEffect(() => {
    // Filter supervisors based on search query
    const filtered = supervisors.filter(
      (supervisor) =>
        supervisor.fullName
          ?.toLowerCase()
          .includes(supervisorSearch.toLowerCase()) ||
        supervisor.department
          ?.toLowerCase()
          .includes(supervisorSearch.toLowerCase()) ||
        supervisor.specialization
          ?.toLowerCase()
          .includes(supervisorSearch.toLowerCase())
    );
    setFilteredSupervisors(filtered);
  }, [supervisorSearch, supervisors]);

  const fetchSessions = async () => {
    try {
      const response = await api.get("/api/sessions");
      const sessionsData = response.data.data || [];
      setSessions(sessionsData);

      // Select active session by default
      const activeSession = sessionsData.find(
        (session) => session.status === "active"
      );
      if (activeSession) {
        setSelectedSession(activeSession._id);
      } else if (sessionsData.length > 0) {
        setSelectedSession(sessionsData[0]._id);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      toast.error("Failed to load sessions");
    }
  };

  const fetchTeamsAndSupervisors = async () => {
    setIsLoading(true);
    try {
      // Fetch teams for the selected session
      const teamsResponse = await api.get("/api/teams", {
        params: { sessionId: selectedSession },
      });

      // Fetch supervisors with workload information
      const supervisorsResponse = await api.get(`/api/supervisors/available`, {
        params: { sessionId: selectedSession },
      });

      setTeams(teamsResponse.data.data || []);
      setSupervisors(supervisorsResponse.data.data || []);
      setFilteredTeams(teamsResponse.data.data || []);
      setFilteredSupervisors(supervisorsResponse.data.data || []);
    } catch (error) {
      console.error("Failed to fetch teams or supervisors:", error);
      toast.error("Could not load teams or supervisors");
    } finally {
      setIsLoading(false);
    }
  };

  const openAssignModal = (team) => {
    setSelectedTeam(team);

    // Pre-select any existing supervisors
    const existingSupervisors =
      team.supervisors?.map((sup) => ({
        id: sup.supervisor?._id || sup.supervisor,
        role: sup.role || "co-supervisor",
      })) || [];

    setSelectedSupervisors(existingSupervisors);

    setShowAssignModal(true);
  };

  const handleSupervisorSelection = (supervisorId, role = "co-supervisor") => {
    setSelectedSupervisors((prevSelected) => {
      // Check if this supervisor is already selected
      const exists = prevSelected.find((s) => s.id === supervisorId);

      if (exists) {
        // Remove if already selected
        return prevSelected.filter((s) => s.id !== supervisorId);
      } else {
        // If there's already a primary supervisor and trying to add another as primary
        if (
          role === "primary" &&
          prevSelected.some((s) => s.role === "primary")
        ) {
          toast.warning(
            "Only one primary supervisor allowed. The other will be assigned as co-supervisor."
          );

          // Convert the existing primary to co-supervisor
          const updated = prevSelected.map((s) =>
            s.role === "primary" ? { ...s, role: "co-supervisor" } : s
          );

          return [...updated, { id: supervisorId, role }];
        }

        // Add new supervisor
        return [...prevSelected, { id: supervisorId, role }];
      }
    });

    // Check workload warning
    const supervisor = supervisors.find((s) => s._id === supervisorId);
    if (supervisor && supervisor.availableSlots <= 0) {
      setShowWorkloadWarning(true);
    }
  };

  const handleRoleChange = (supervisorId, newRole) => {
    setSelectedSupervisors((prevSelected) => {
      // If changing to primary and there's already a primary supervisor
      if (
        newRole === "primary" &&
        prevSelected.some((s) => s.role === "primary" && s.id !== supervisorId)
      ) {
        toast.warning(
          "Only one primary supervisor allowed. The other will be changed to co-supervisor."
        );

        // Convert all others to co-supervisor
        return prevSelected.map((s) =>
          s.id === supervisorId
            ? { ...s, role: newRole }
            : s.role === "primary"
            ? { ...s, role: "co-supervisor" }
            : s
        );
      }

      // Normal role change
      return prevSelected.map((s) =>
        s.id === supervisorId ? { ...s, role: newRole } : s
      );
    });
  };

  const assignSupervisorsToTeam = async () => {
    if (!selectedTeam || selectedSupervisors.length === 0) {
      toast.error("Please select at least one supervisor");
      return;
    }

    try {
      await api.post(`/api/teams/${selectedTeam._id}/assign-supervisors`, {
        supervisors: selectedSupervisors,
      });

      toast.success("Supervisors assigned successfully");

      // Refresh data
      fetchTeamsAndSupervisors();

      // Close modal
      setShowAssignModal(false);
    } catch (error) {
      console.error("Failed to assign supervisors:", error);
      toast.error("Failed to assign supervisors. Please try again.");
    }
  };

  // Helper to get supervisor name or "Unknown" if not found
  const getSupervisorName = (supervisorId) => {
    const supervisor = supervisors.find((s) => s._id === supervisorId);
    return supervisor?.fullName || "Unknown";
  };

  // Helper to format workload display
  const formatWorkload = (current, max) => {
    const percentage = (current / max) * 100;
    let colorClass = "text-green-600";

    if (percentage >= 90) {
      colorClass = "text-red-600";
    } else if (percentage >= 70) {
      colorClass = "text-amber-600";
    }

    return (
      <span className={colorClass}>
        {current}/{max} ({percentage.toFixed(0)}%)
      </span>
    );
  };

  // Helper to get initials for avatar
  const getInitials = (name) => {
    if (!name) return "NN";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>Multi-Supervisor Assignment</CardTitle>
              <CardDescription>
                Assign multiple supervisors to teams with specific roles
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                value={selectedSession}
                onValueChange={setSelectedSession}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session._id} value={session._id}>
                      {session.name}{" "}
                      {session.status === "active" ? "(Active)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={fetchTeamsAndSupervisors}
              >
                <Users className="h-4 w-4" />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-6">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search teams by name, department, or member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No teams found for this session</p>
              <p className="text-sm">
                Try selecting a different session or adjusting your search
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Current Supervisors</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.map((team) => (
                    <TableRow key={team._id}>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell>
                        <div className="flex -space-x-2 overflow-hidden">
                          {team.members.slice(0, 3).map((member, index) => (
                            <Avatar
                              key={index}
                              className="h-8 w-8 border-2 border-background"
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
                          {team.members.length > 3 && (
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 text-gray-600 text-xs border-2 border-background">
                              +{team.members.length - 3}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{team.department || "N/A"}</TableCell>
                      <TableCell>
                        {team.supervisors && team.supervisors.length > 0 ? (
                          <div className="space-y-1">
                            {team.supervisors.map((sup, index) => (
                              <div key={index} className="flex items-center">
                                <span className="text-sm">
                                  {sup.supervisor?.fullName ||
                                    getSupervisorName(sup.supervisor)}
                                </span>
                                {sup.role === "primary" && (
                                  <Badge className="ml-2 bg-amber-100 text-amber-800 hover:bg-amber-100">
                                    Primary
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">
                            No supervisors assigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssignModal(team)}
                          className="flex items-center gap-1"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Assign</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Supervisors Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Assign Supervisors to Team</DialogTitle>
            <DialogDescription>
              {selectedTeam
                ? `Assign supervisors to ${selectedTeam.name}`
                : "Assign supervisors to this team"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Selected supervisors section */}
            <div className="space-y-2">
              <Label>Selected Supervisors</Label>
              {selectedSupervisors.length === 0 ? (
                <div className="p-4 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-md">
                  No supervisors selected
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedSupervisors.map((selected) => {
                    const supervisor = supervisors.find(
                      (s) => s._id === selected.id
                    );
                    return (
                      <div
                        key={selected.id}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={supervisor?.profilePicture}
                              alt={supervisor?.fullName}
                            />
                            <AvatarFallback>
                              {getInitials(supervisor?.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {supervisor?.fullName || "Unknown"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {supervisor?.department || "Unknown department"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={selected.role}
                            onValueChange={(value) =>
                              handleRoleChange(selected.id, value)
                            }
                          >
                            <SelectTrigger className="h-8 w-[120px]">
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="primary">Primary</SelectItem>
                              <SelectItem value="co-supervisor">
                                Co-supervisor
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-500 hover:text-red-500"
                            onClick={() =>
                              handleSupervisorSelection(selected.id)
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Warning if a supervisor has full workload */}
            {showWorkloadWarning && (
              <div className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Supervisor workload warning</p>
                  <p>
                    One or more selected supervisors already have a full
                    workload. They may be overallocated.
                  </p>
                </div>
              </div>
            )}

            {/* Supervisor search section */}
            <div className="space-y-2 mt-4">
              <Label>Available Supervisors</Label>
              <div className="flex items-center space-x-2 mb-2">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search supervisors by name, department, or specialization..."
                  value={supervisorSearch}
                  onChange={(e) => setSupervisorSearch(e.target.value)}
                  className="flex-1"
                />
              </div>

              <div className="border rounded-md max-h-[300px] overflow-y-auto">
                {filteredSupervisors.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No supervisors found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supervisor</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Workload</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSupervisors.map((supervisor) => {
                        const isSelected = selectedSupervisors.some(
                          (s) => s.id === supervisor._id
                        );
                        const role = isSelected
                          ? selectedSupervisors.find(
                              (s) => s.id === supervisor._id
                            )?.role
                          : null;

                        return (
                          <TableRow key={supervisor._id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={supervisor.profilePicture}
                                    alt={supervisor.fullName}
                                  />
                                  <AvatarFallback>
                                    {getInitials(supervisor.fullName)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">
                                  {supervisor.fullName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {supervisor.department || "N/A"}
                            </TableCell>
                            <TableCell>
                              {formatWorkload(
                                supervisor.currentLoad || 0,
                                supervisor.maxLoad || 5
                              )}
                            </TableCell>
                            <TableCell>
                              {isSelected ? (
                                <div className="flex items-center">
                                  <Badge
                                    className={
                                      role === "primary"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-blue-100 text-blue-800"
                                    }
                                  >
                                    {role === "primary"
                                      ? "Primary"
                                      : "Co-supervisor"}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="ml-2 text-gray-500 hover:text-red-500"
                                    onClick={() =>
                                      handleSupervisorSelection(supervisor._id)
                                    }
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex space-x-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                    onClick={() =>
                                      handleSupervisorSelection(
                                        supervisor._id,
                                        "co-supervisor"
                                      )
                                    }
                                  >
                                    <span>Co-supervisor</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                                    onClick={() =>
                                      handleSupervisorSelection(
                                        supervisor._id,
                                        "primary"
                                      )
                                    }
                                  >
                                    <Star className="h-3.5 w-3.5 mr-1" />
                                    <span>Primary</span>
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={assignSupervisorsToTeam}
              className="flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Assign Supervisors
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedSupervisorAssignment;
