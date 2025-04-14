import { CheckCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "../../api";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
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
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const SupervisorPreferenceSelector = ({ teamId, onSelectionComplete }) => {
  const [supervisors, setSupervisors] = useState([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [departments, setDepartments] = useState([]);
  const [expertise, setExpertise] = useState("all");
  const [expertiseAreas, setExpertiseAreas] = useState([]);

  useEffect(() => {
    fetchAvailableSupervisors();
  }, [teamId]);

  const fetchAvailableSupervisors = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/api/supervisors/available");

      // Extract the list of available supervisors
      const supervisorsList = response.data.data || [];
      setSupervisors(supervisorsList);

      // Extract unique departments and expertise areas for filtering
      const uniqueDepartments = [
        ...new Set(supervisorsList.map((s) => s.department)),
      ];
      setDepartments(uniqueDepartments);

      const allExpertise = supervisorsList.flatMap((s) => s.expertise || []);
      const uniqueExpertise = [...new Set(allExpertise)];
      setExpertiseAreas(uniqueExpertise);
    } catch (error) {
      console.error("Failed to fetch available supervisors:", error);
      toast.error("Could not load available supervisors");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSupervisor = (supervisor) => {
    setSelectedSupervisors((prevSelected) => {
      if (prevSelected.some((s) => s._id === supervisor._id)) {
        return prevSelected.filter((s) => s._id !== supervisor._id);
      } else {
        // Limit to maximum of 3 supervisors
        if (prevSelected.length >= 3) {
          toast.warning("You can select up to 3 preferred supervisors");
          return prevSelected;
        }
        return [...prevSelected, supervisor];
      }
    });
  };

  const handleSubmitPreferences = async () => {
    if (selectedSupervisors.length === 0) {
      toast.error("Please select at least one supervisor");
      return;
    }

    try {
      await api.post(`/api/teams/${teamId}/supervisor-preferences`, {
        preferences: selectedSupervisors.map((supervisor) => ({
          supervisorId: supervisor._id,
          reason: "", // Could add a reason field per supervisor
        })),
      });

      toast.success("Supervisor preferences submitted successfully");
      if (onSelectionComplete) {
        onSelectionComplete(selectedSupervisors);
      }
    } catch (error) {
      console.error("Failed to submit supervisor preferences:", error);
      toast.error("Failed to submit preferences");
    }
  };

  const filteredSupervisors = supervisors.filter((supervisor) => {
    // Department filter
    if (department !== "all" && supervisor.department !== department) {
      return false;
    }

    // Expertise filter
    if (
      expertise !== "all" &&
      (!supervisor.expertise || !supervisor.expertise.includes(expertise))
    ) {
      return false;
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        supervisor.fullName?.toLowerCase().includes(query) ||
        supervisor.department?.toLowerCase().includes(query) ||
        supervisor.expertise?.some((exp) => exp.toLowerCase().includes(query))
      );
    }

    return true;
  });

  // Helper to get initials for avatar
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Select Preferred Supervisors</CardTitle>
        <CardDescription>
          You can select up to 3 preferred supervisors for your team. Final
          assignment will be made by the administrator.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertTitle>Important Note</AlertTitle>
          <AlertDescription>
            While you can select your preferred supervisors, the final
            assignment will be made by the administrator based on supervisor
            availability and workload.
          </AlertDescription>
        </Alert>

        {/* Search and filters */}
        <div className="flex flex-col space-y-4 mb-6 md:flex-row md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by name, department or expertise..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex space-x-2">
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={expertise} onValueChange={setExpertise}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Expertise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Expertise</SelectItem>
                {expertiseAreas.map((exp) => (
                  <SelectItem key={exp} value={exp}>
                    {exp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected supervisors */}
        {selectedSupervisors.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium mb-2">
              Selected Supervisors ({selectedSupervisors.length}/3)
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedSupervisors.map((supervisor) => (
                <Badge
                  key={supervisor._id}
                  variant="outline"
                  className="flex items-center gap-1 px-3 py-1.5"
                >
                  {supervisor.fullName}
                  <button
                    className="ml-1.5 text-red-500"
                    onClick={() => handleToggleSupervisor(supervisor)}
                  >
                    &times;
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Supervisors list */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            Loading supervisors...
          </div>
        ) : filteredSupervisors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No supervisors found matching your criteria
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {filteredSupervisors.map((supervisor) => (
                <div
                  key={supervisor._id}
                  className={`flex items-start p-4 rounded-lg border ${
                    selectedSupervisors.some((s) => s._id === supervisor._id)
                      ? "border-blue-200 bg-blue-50 dark:bg-blue-900/10"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <Checkbox
                    id={`supervisor-${supervisor._id}`}
                    checked={selectedSupervisors.some(
                      (s) => s._id === supervisor._id
                    )}
                    onCheckedChange={() => handleToggleSupervisor(supervisor)}
                    className="mt-1"
                  />
                  <div className="ml-3 flex flex-1 items-start">
                    <Avatar className="h-10 w-10 mr-4">
                      <AvatarImage
                        src={supervisor.profileImage}
                        alt={supervisor.fullName}
                      />
                      <AvatarFallback>
                        {getInitials(supervisor.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Label
                        htmlFor={`supervisor-${supervisor._id}`}
                        className="font-medium cursor-pointer"
                      >
                        {supervisor.fullName}
                      </Label>
                      <div className="text-sm text-gray-500">
                        {supervisor.department}
                      </div>
                      {supervisor.expertise &&
                        supervisor.expertise.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {supervisor.expertise.map((exp) => (
                              <Badge
                                key={exp}
                                variant="outline"
                                className="text-xs"
                              >
                                {exp}
                              </Badge>
                            ))}
                          </div>
                        )}
                      <div className="mt-2 text-xs text-gray-500">
                        <span className="font-medium">Current workload:</span>{" "}
                        {supervisor.currentTeams || 0}/
                        {supervisor.maxTeams || "∞"} teams
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSubmitPreferences}
            disabled={selectedSupervisors.length === 0 || isLoading}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Submit Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupervisorPreferenceSelector;
