import { AlertCircle, UserPlus, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
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

const SupervisorAssignmentPanel = ({ sessionId }) => {
  const [teams, setTeams] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [assigningSupervisor, setAssigningSupervisor] = useState(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get teams without supervisors
        const teamsResponse = await api.get("/api/admin/teams", {
          params: {
            sessionId,
            hasSupervisor: false,
          },
        });

        // Get available supervisors
        const supervisorsResponse = await api.get(
          `/api/sessions/${sessionId}/available-supervisors`
        );

        setTeams(teamsResponse.data.data || []);
        setSupervisors(supervisorsResponse.data.data || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load teams or supervisors");
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchData();
    }
  }, [sessionId]);

  const handleAssignSupervisor = async () => {
    if (!assigningSupervisor || !selectedSupervisor) {
      toast.error("Please select both a team and a supervisor");
      return;
    }

    try {
      const response = await api.post(
        `/api/teams/${assigningSupervisor}/assign-supervisor`,
        {
          supervisorId: selectedSupervisor,
        }
      );

      if (response.data.success) {
        toast.success("Supervisor assigned successfully");
        setAssigningSupervisor(null);
        setSelectedSupervisor("");

        // Update the teams list
        setTeams(teams.filter((team) => team._id !== assigningSupervisor));
      }
    } catch (error) {
      console.error("Failed to assign supervisor:", error);
      toast.error(error.response?.data?.error || "Failed to assign supervisor");
    }
  };

  const filteredTeams = teams.filter(
    (team) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.teamId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Teams Without Supervisors
          </CardTitle>
          <CardDescription>
            {teams.length} team{teams.length !== 1 ? "s" : ""} need supervisor
            assignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {filteredTeams.length === 0 ? (
            <div className="text-center p-4 border rounded-md bg-muted/50">
              <p>No teams found waiting for supervisor assignment.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Team ID</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.map((team) => (
                  <TableRow key={team._id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>{team.teamId || "N/A"}</TableCell>
                    <TableCell>{team.members.length}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => setAssigningSupervisor(team._id)}
                        disabled={assigningSupervisor === team._id}
                      >
                        <UserPlus className="mr-1 h-4 w-4" />
                        Assign Supervisor
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {assigningSupervisor && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Assign Supervisor</CardTitle>
            <CardDescription>
              Select a supervisor for{" "}
              {teams.find((t) => t._id === assigningSupervisor)?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Available Supervisors
                </label>
                <Select
                  value={selectedSupervisor}
                  onValueChange={setSelectedSupervisor}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisors.map((supervisor) => (
                      <SelectItem
                        key={supervisor._id}
                        value={supervisor._id}
                        disabled={!supervisor.isAvailable}
                      >
                        {supervisor.fullName} ({supervisor.department}) -{" "}
                        {supervisor.currentLoad}/{supervisor.maxLoad} teams
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {supervisors.length === 0 && (
                <div className="flex items-center p-3 text-sm border rounded bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  No available supervisors found. Please approve more
                  supervisors or increase their capacity.
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setAssigningSupervisor(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignSupervisor}
              disabled={!selectedSupervisor}
            >
              Assign Supervisor
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default SupervisorAssignmentPanel;
