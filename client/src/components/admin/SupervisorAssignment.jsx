import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clipboard,
  RefreshCw,
  Search,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const SupervisorAssignment = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);

  // Fetch teams
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const response = await api.get("/api/teams");
      return response.data.data;
    },
  });

  // Fetch supervisors
  const { data: supervisors, isLoading: supervisorsLoading } = useQuery({
    queryKey: ["supervisors"],
    queryFn: async () => {
      const response = await api.get("/api/users/supervisors");
      return response.data.data;
    },
  });

  // Assign supervisor mutation
  const assignSupervisor = useMutation({
    mutationFn: async ({ teamId, supervisorId }) => {
      const response = await api.post(`/api/teams/${teamId}/supervisor`, {
        supervisorId,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Supervisor assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setIsAssignDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to assign supervisor");
    },
  });

  // Remove supervisor mutation
  const removeSupervisor = useMutation({
    mutationFn: async (teamId) => {
      const response = await api.delete(`/api/teams/${teamId}/supervisor`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Supervisor removed successfully");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setIsRemoveDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to remove supervisor");
    },
  });

  // Handle assign supervisor
  const handleAssignSupervisor = () => {
    if (!selectedTeam || !selectedSupervisor) {
      toast.error("Please select both a team and a supervisor");
      return;
    }

    assignSupervisor.mutate({
      teamId: selectedTeam._id,
      supervisorId: selectedSupervisor._id,
    });
  };

  // Handle remove supervisor
  const handleRemoveSupervisor = () => {
    if (!selectedTeam) return;

    removeSupervisor.mutate(selectedTeam._id);
  };

  // Open assign dialog
  const openAssignDialog = (team) => {
    setSelectedTeam(team);
    setSelectedSupervisor(team.supervisor || null);
    setIsAssignDialogOpen(true);
  };

  // Open remove dialog
  const openRemoveDialog = (team) => {
    if (!team.supervisor) return;

    setSelectedTeam(team);
    setIsRemoveDialogOpen(true);
  };

  // Filter teams based on search and unassigned filter
  const filteredTeams = teams?.filter((team) => {
    const matchesSearch =
      searchTerm === "" ||
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (team.supervisor &&
        team.supervisor.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (showUnassigned) {
      return matchesSearch && !team.supervisor;
    }

    return matchesSearch;
  });

  // Analyze supervisor workload
  const supervisorWorkload = supervisors?.map((supervisor) => {
    const assignedTeams =
      teams?.filter(
        (team) => team.supervisor && team.supervisor._id === supervisor._id
      ) || [];

    return {
      ...supervisor,
      assignedTeamsCount: assignedTeams.length,
      assignedTeams: assignedTeams,
    };
  });

  if (teamsLoading || supervisorsLoading) {
    return <div className="flex justify-center p-8">Loading data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Supervisor Assignment</h2>
      </div>

      <Tabs defaultValue="teams">
        <TabsList>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="supervisors">Supervisors</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search teams or supervisors..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Clipboard className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="show-unassigned" className="cursor-pointer">
                Show only unassigned teams
              </Label>
              <input
                id="show-unassigned"
                type="checkbox"
                className="rounded border-gray-300 text-primary focus:ring-primary"
                checked={showUnassigned}
                onChange={(e) => setShowUnassigned(e.target.checked)}
              />
            </div>
          </div>

          {filteredTeams?.length === 0 ? (
            <Card>
              <CardContent className="p-6 flex flex-col items-center justify-center">
                <div className="text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Teams Found</h3>
                  <p className="text-gray-500 mt-1">
                    {showUnassigned
                      ? "All teams have supervisors assigned."
                      : "No teams match your search criteria."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Project Type</TableHead>
                  <TableHead>Current Supervisor</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams?.map((team) => (
                  <TableRow key={team._id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>
                      <div className="flex -space-x-2">
                        {team.members?.slice(0, 3).map((member, index) => (
                          <Avatar
                            key={member._id}
                            className="h-8 w-8 border-2 border-background"
                          >
                            <AvatarFallback>
                              {member.name.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {team.members?.length > 3 && (
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-xs">
                            +{team.members.length - 3}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {team.projectType || "Not set"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {team.supervisor ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {team.supervisor.name
                                .substring(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {team.supervisor.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {team.supervisor.email}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-yellow-500 border-yellow-200 bg-yellow-50"
                        >
                          Unassigned
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssignDialog(team)}
                        >
                          {team.supervisor ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Reassign
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-1" />
                              Assign
                            </>
                          )}
                        </Button>

                        {team.supervisor && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openRemoveDialog(team)}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="supervisors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {supervisorWorkload?.map((supervisor) => (
              <Card key={supervisor._id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {supervisor.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">
                          {supervisor.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {supervisor.email}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      className={
                        supervisor.assignedTeamsCount === 0
                          ? "bg-green-500"
                          : supervisor.assignedTeamsCount > 3
                          ? "bg-red-500"
                          : "bg-blue-500"
                      }
                    >
                      {supervisor.assignedTeamsCount} Team
                      {supervisor.assignedTeamsCount !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-sm font-medium mb-2">
                    Assigned Teams:
                  </div>
                  {supervisor.assignedTeamsCount === 0 ? (
                    <div className="text-sm text-gray-500 italic">
                      No teams assigned yet
                    </div>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {supervisor.assignedTeams.map((team) => (
                        <li
                          key={team._id}
                          className="flex items-center justify-between"
                        >
                          <span>{team.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {team.members?.length || 0} members
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
                <CardFooter className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      // Filter teams with no supervisor
                      const unassignedTeams = teams.filter(
                        (team) => !team.supervisor
                      );
                      if (unassignedTeams.length === 0) {
                        toast.info("No unassigned teams available");
                        return;
                      }

                      // Set first unassigned team and open assign dialog
                      setSelectedTeam(unassignedTeams[0]);
                      setSelectedSupervisor(supervisor);
                      setIsAssignDialogOpen(true);
                    }}
                    disabled={
                      teams?.filter((team) => !team.supervisor).length === 0
                    }
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Assign New Team
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Assign Supervisor Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedTeam?.supervisor
                ? "Change Supervisor"
                : "Assign Supervisor"}
            </DialogTitle>
            <DialogDescription>
              {selectedTeam?.supervisor
                ? `Change the supervisor for team '${selectedTeam?.name}'.`
                : `Assign a supervisor to team '${selectedTeam?.name}'.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Team</Label>
              <div className="p-2 border rounded-md bg-muted/40">
                <div className="font-medium">{selectedTeam?.name}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {selectedTeam?.members?.length || 0} Members •{" "}
                  {selectedTeam?.projectType || "No project type"}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supervisor-select">Select Supervisor</Label>
              <Select
                value={selectedSupervisor?._id || ""}
                onValueChange={(value) => {
                  const supervisor = supervisors.find((s) => s._id === value);
                  setSelectedSupervisor(supervisor);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a supervisor" />
                </SelectTrigger>
                <SelectContent>
                  {supervisors?.map((supervisor) => (
                    <SelectItem key={supervisor._id} value={supervisor._id}>
                      <div className="flex items-center">
                        <span>{supervisor.name}</span>
                        <Badge className="ml-2" variant="outline">
                          {supervisor.assignedTeamsCount} team
                          {supervisor.assignedTeamsCount !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedSupervisor && (
                <div className="p-2 border rounded-md bg-muted/40 mt-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedSupervisor.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {selectedSupervisor.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedSupervisor.email}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm mt-2">
                    <span className="text-muted-foreground">
                      Currently supervising:
                    </span>{" "}
                    <span className="font-medium">
                      {selectedSupervisor.assignedTeamsCount}
                    </span>{" "}
                    team{selectedSupervisor.assignedTeamsCount !== 1 ? "s" : ""}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAssignSupervisor}>
              {selectedTeam?.supervisor
                ? "Change Supervisor"
                : "Assign Supervisor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Supervisor Dialog */}
      <AlertDialog
        open={isRemoveDialogOpen}
        onOpenChange={setIsRemoveDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Supervisor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedTeam?.supervisor?.name}{" "}
              as the supervisor for team '{selectedTeam?.name}'? This will leave
              the team without supervision until a new supervisor is assigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveSupervisor}
              className="bg-destructive text-destructive-foreground"
            >
              Remove Supervisor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SupervisorAssignment;
