import {
  faBell,
  faCheckCircle,
  faEnvelope,
  faEye,
  faUserGraduate,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";

const TeamManagement = () => {
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isMarkingModalOpen, setIsMarkingModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [markForm, setMarkForm] = useState({
    marks: "",
    category: "report",
    feedback: "",
  });

  const [notificationForm, setNotificationForm] = useState({
    message: "",
    isUrgent: false,
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/supervisor/teams");
      setTeams(response.data || []);
    } catch (error) {
      toast.error("Failed to fetch teams");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkStudent = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        studentId: currentStudent._id,
        projectId: selectedTeam.project._id,
        marks: parseInt(markForm.marks),
        category: markForm.category,
        feedback: markForm.feedback,
      };

      await api.post("/api/supervisor/mark-student", payload);
      setIsMarkingModalOpen(false);
      toast.success(`Successfully marked ${currentStudent.user.fullName}`);

      // Reset form
      setMarkForm({
        marks: "",
        category: "report",
        feedback: "",
      });

      // Refresh teams data
      fetchTeams();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to mark student");
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        teamId: selectedTeam._id,
        message: notificationForm.message,
        isUrgent: notificationForm.isUrgent,
      };

      await api.post("/api/supervisor/send-notification", payload);
      setIsNotificationModalOpen(false);
      toast.success("Notification sent successfully");

      // Reset form
      setNotificationForm({
        message: "",
        isUrgent: false,
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to send notification"
      );
    }
  };

  const openMarkingModal = (student, team) => {
    setCurrentStudent(student);
    setSelectedTeam(team);
    setIsMarkingModalOpen(true);
  };

  const openNotificationModal = (team) => {
    setSelectedTeam(team);
    setIsNotificationModalOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getProjectStatusBadge = (status) => {
    const statusMap = {
      in_progress:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      completed:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      submitted:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };

    return (
      statusMap[status] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    );
  };

  const getProjectProgress = (status) => {
    const progressMap = {
      pending: 10,
      in_progress: 50,
      submitted: 80,
      completed: 100,
    };

    return progressMap[status] || 0;
  };

  const filteredTeams = teams.filter((team) => {
    if (activeTab !== "all" && team.project?.status !== activeTab) {
      return false;
    }

    if (searchTerm) {
      const searchRegex = new RegExp(searchTerm, "i");
      return (
        searchRegex.test(team.name) ||
        team.members.some((member) => searchRegex.test(member.user.fullName)) ||
        (team.project && searchRegex.test(team.project.name))
      );
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-purple-800 dark:text-white flex items-center">
          <FontAwesomeIcon icon={faUsers} className="mr-2" /> Supervised Teams
        </h2>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Input
            placeholder="Search teams, students or projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
          />
          <FontAwesomeIcon
            icon={faEye}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid grid-cols-4 w-full sm:w-auto bg-purple-100 dark:bg-purple-900">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="submitted">Submitted</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Teams List */}
      <div className="grid grid-cols-1 gap-6">
        {filteredTeams.length > 0 ? (
          filteredTeams.map((team) => (
            <Card key={team._id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-800 text-white pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle>{team.name}</CardTitle>
                  <div className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openNotificationModal(team)}
                      className="bg-white hover:bg-gray-100 text-purple-700"
                    >
                      <FontAwesomeIcon icon={faBell} className="mr-2" />
                      Notify Team
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Project Info */}
                  {team.project ? (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium text-lg">
                            {team.project.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {team.project.type?.replace("_", " ")}
                          </p>
                        </div>
                        <Badge
                          className={getProjectStatusBadge(team.project.status)}
                        >
                          {team.project.status?.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>
                            {getProjectProgress(team.project.status)}%
                          </span>
                        </div>
                        <Progress
                          value={getProjectProgress(team.project.status)}
                          className="h-2"
                        />
                      </div>

                      {team.project.submittedAt && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Submitted:
                          </span>
                          <span className="font-medium">
                            {formatDate(team.project.submittedAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center text-gray-500 dark:text-gray-400">
                      No project assigned yet.
                    </div>
                  )}

                  {/* Team Members */}
                  <div>
                    <h3 className="font-medium mb-3">Team Members</h3>
                    <div className="space-y-3">
                      {team.members.map((member) => (
                        <div
                          key={member.user._id}
                          className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md flex justify-between items-center"
                        >
                          <div className="flex items-center">
                            {member.user.profilePicture ? (
                              <img
                                src={member.user.profilePicture}
                                alt={member.user.fullName}
                                className="w-10 h-10 rounded-full mr-3 object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-purple-200 dark:bg-purple-900 flex items-center justify-center mr-3">
                                <FontAwesomeIcon
                                  icon={faUserGraduate}
                                  className="text-purple-700 dark:text-purple-300"
                                />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">
                                {member.user.fullName}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {member.role === "leader" && (
                                  <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded mr-2">
                                    Team Leader
                                  </span>
                                )}
                                {member.user.studentId || "No ID"}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-purple-600 border-purple-200 hover:bg-purple-50"
                              onClick={() => {
                                const mailtoLink = `mailto:${
                                  member.user.email
                                }?subject=Regarding your project: ${
                                  team.project?.name || "Research Project"
                                }`;
                                window.open(mailtoLink, "_blank");
                              }}
                            >
                              <FontAwesomeIcon
                                icon={faEnvelope}
                                className="mr-1"
                              />
                              Email
                            </Button>
                            {team.project && (
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={() =>
                                  openMarkingModal(member.user, team)
                                }
                              >
                                <FontAwesomeIcon
                                  icon={faCheckCircle}
                                  className="mr-1"
                                />
                                Mark
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-gray-500 dark:text-gray-400">
              No teams found for the selected filter.
            </div>
          </div>
        )}
      </div>

      {/* Marking Dialog */}
      <Dialog open={isMarkingModalOpen} onOpenChange={setIsMarkingModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Student: {currentStudent?.fullName}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleMarkStudent} className="space-y-4 py-4">
            <div>
              <Label htmlFor="category">Assessment Category</Label>
              <Select
                value={markForm.category}
                onValueChange={(value) =>
                  setMarkForm({ ...markForm, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="implementation">Implementation</SelectItem>
                  <SelectItem value="overall">Overall</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="marks">Marks (0-100)</Label>
              <Input
                id="marks"
                type="number"
                min="0"
                max="100"
                value={markForm.marks}
                onChange={(e) =>
                  setMarkForm({ ...markForm, marks: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                value={markForm.feedback}
                onChange={(e) =>
                  setMarkForm({ ...markForm, feedback: e.target.value })
                }
                placeholder="Provide detailed feedback for the student..."
                rows={4}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMarkingModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700"
              >
                Submit Marks
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog
        open={isNotificationModalOpen}
        onOpenChange={setIsNotificationModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Send Notification to Team: {selectedTeam?.name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSendNotification} className="space-y-4 py-4">
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={notificationForm.message}
                onChange={(e) =>
                  setNotificationForm({
                    ...notificationForm,
                    message: e.target.value,
                  })
                }
                placeholder="Type your message to the team..."
                rows={4}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isUrgent"
                checked={notificationForm.isUrgent}
                onChange={(e) =>
                  setNotificationForm({
                    ...notificationForm,
                    isUrgent: e.target.checked,
                  })
                }
                className="rounded"
              />
              <Label htmlFor="isUrgent" className="text-sm cursor-pointer">
                Mark as urgent notification
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNotificationModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700"
              >
                Send Notification
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamManagement;
