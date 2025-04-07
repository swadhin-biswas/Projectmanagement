import { FileText, MessageSquare, UserCheck, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
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
import { Progress } from "../ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";

const TeamEvaluation = () => {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isGradingDialogOpen, setIsGradingDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [feedbackForm, setFeedbackForm] = useState({
    content: "",
    type: "general",
  });

  const [gradingForm, setGradingForm] = useState({
    marks: "",
    feedback: "",
    submissionType: "project",
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/supervisor/teams");
      setTeams(response.data || []);

      if (response.data && response.data.length > 0) {
        setSelectedTeam(response.data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
      toast.error("Could not load supervised teams");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendFeedback = async (e) => {
    e.preventDefault();

    if (!feedbackForm.content.trim()) {
      toast.error("Feedback content is required");
      return;
    }

    try {
      await api.post("/api/supervisor/send-message", {
        studentId: selectedStudent._id,
        content: feedbackForm.content,
        type: feedbackForm.type,
      });

      toast.success("Feedback sent successfully");
      setIsFeedbackDialogOpen(false);
      resetFeedbackForm();
    } catch (error) {
      console.error("Failed to send feedback:", error);
      toast.error("Failed to send feedback");
    }
  };

  const handleGradeSubmission = async (e) => {
    e.preventDefault();

    if (!gradingForm.marks.trim()) {
      toast.error("Marks are required");
      return;
    }

    const marks = parseFloat(gradingForm.marks);
    if (isNaN(marks) || marks < 0 || marks > 100) {
      toast.error("Marks must be a number between 0 and 100");
      return;
    }

    try {
      await api.post("/api/supervisor/mark-student", {
        studentId: selectedStudent._id,
        marks,
        feedback: gradingForm.feedback,
        submissionType: gradingForm.submissionType,
      });

      toast.success("Student submission graded successfully");
      setIsGradingDialogOpen(false);
      resetGradingForm();
      fetchTeams(); // Refresh data
    } catch (error) {
      console.error("Failed to grade submission:", error);
      toast.error("Failed to grade submission");
    }
  };

  const handleUpdateProgress = async (studentId, progress) => {
    try {
      await api.put("/api/supervisor/student-progress", {
        studentId,
        progress,
      });

      toast.success("Progress updated successfully");
      fetchTeams(); // Refresh data
    } catch (error) {
      console.error("Failed to update progress:", error);
      toast.error("Failed to update progress");
    }
  };

  const openFeedbackDialog = (student) => {
    setSelectedStudent(student);
    setIsFeedbackDialogOpen(true);
  };

  const openGradingDialog = (student) => {
    setSelectedStudent(student);
    setIsGradingDialogOpen(true);
  };

  const resetFeedbackForm = () => {
    setFeedbackForm({
      content: "",
      type: "general",
    });
  };

  const resetGradingForm = () => {
    setGradingForm({
      marks: "",
      feedback: "",
      submissionType: "project",
    });
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const getProgressColor = (progress) => {
    if (progress < 30) return "bg-red-500";
    if (progress < 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getTeamStatusBadge = (team) => {
    if (!team.project) {
      return <Badge className="bg-gray-500">No Project</Badge>;
    }

    switch (team.project.status) {
      case "in-progress":
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case "submitted":
        return <Badge className="bg-amber-500">Submitted</Badge>;
      case "reviewed":
        return <Badge className="bg-purple-500">Reviewed</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      default:
        return <Badge className="bg-gray-500">{team.project.status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Teams Assigned</h3>
              <p className="text-gray-500 mb-4">
                You don't have any teams assigned to supervise yet.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Teams Sidebar */}
        <div className="w-full md:w-1/4">
          <h2 className="text-xl font-bold mb-4">My Teams</h2>
          <div className="space-y-3">
            {teams.map((team) => (
              <Card
                key={team._id}
                className={`cursor-pointer hover:border-blue-500 transition-colors ${
                  selectedTeam?._id === team._id
                    ? "border-blue-500 border-2"
                    : ""
                }`}
                onClick={() => setSelectedTeam(team)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{team.name}</h3>
                      <p className="text-sm text-gray-500">
                        {team.members.length} members
                      </p>
                    </div>
                    {getTeamStatusBadge(team)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full md:w-3/4">
          {selectedTeam && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedTeam.name}</CardTitle>
                    <CardDescription>
                      {selectedTeam.members.length} members •
                      {selectedTeam.project
                        ? ` Project: ${selectedTeam.project.name}`
                        : " No project assigned yet"}
                    </CardDescription>
                  </div>
                  {getTeamStatusBadge(selectedTeam)}
                </div>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="members">
                  <TabsList className="mb-4">
                    <TabsTrigger value="members">
                      <Users className="h-4 w-4 mr-2" /> Team Members
                    </TabsTrigger>
                    <TabsTrigger value="project">
                      <FileText className="h-4 w-4 mr-2" /> Project Details
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="members" className="space-y-4">
                    {selectedTeam.members.map((member) => (
                      <Card key={member.user._id}>
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={member.user.profilePicture} />
                                <AvatarFallback>
                                  {getInitials(member.user.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-medium flex items-center">
                                  {member.user.fullName}
                                  {member.role === "leader" && (
                                    <Badge className="ml-2 bg-blue-500">
                                      Team Leader
                                    </Badge>
                                  )}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  {member.user.email}
                                </p>
                                <p className="text-sm text-gray-500">
                                  ID: {member.user.studentId}
                                </p>
                              </div>
                            </div>

                            <div className="w-full md:w-auto flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm whitespace-nowrap">
                                  Progress:
                                </span>
                                <div className="w-full md:w-32">
                                  <Progress
                                    value={member.progress || 0}
                                    max={100}
                                    className={getProgressColor(
                                      member.progress || 0
                                    )}
                                  />
                                </div>
                                <span className="text-sm font-medium">
                                  {member.progress || 0}%
                                </span>
                              </div>

                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    openFeedbackDialog(member.user)
                                  }
                                >
                                  <MessageSquare className="h-4 w-4 mr-1" />{" "}
                                  Feedback
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700"
                                  onClick={() => openGradingDialog(member.user)}
                                >
                                  <UserCheck className="h-4 w-4 mr-1" /> Grade
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="project">
                    {selectedTeam.project ? (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-medium mb-2">
                            {selectedTeam.project.name}
                          </h3>
                          <Badge className="mb-4">
                            {selectedTeam.project.type === "research"
                              ? "Research Based"
                              : "Project Based"}
                          </Badge>

                          {selectedTeam.project.description && (
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md mb-4">
                              <h4 className="font-medium mb-2">Description</h4>
                              <p className="text-gray-700 dark:text-gray-300">
                                {selectedTeam.project.description}
                              </p>
                            </div>
                          )}

                          {selectedTeam.project.submissionLink && (
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md mb-4">
                              <h4 className="font-medium mb-2">Submission</h4>
                              <p className="text-blue-600 hover:underline">
                                <a
                                  href={selectedTeam.project.submissionLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View Submission
                                </a>
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                Submitted on:{" "}
                                {new Date(
                                  selectedTeam.project.submittedAt
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                          )}

                          {selectedTeam.project.feedback && (
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                              <h4 className="font-medium mb-2">Feedback</h4>
                              <p className="text-gray-700 dark:text-gray-300">
                                {selectedTeam.project.feedback}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                          No Project Assigned
                        </h3>
                        <p className="text-gray-500">
                          This team hasn't created a project yet.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Send Feedback Dialog */}
      <Dialog
        open={isFeedbackDialogOpen}
        onOpenChange={setIsFeedbackDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Feedback to Student</DialogTitle>
            <DialogDescription>
              {selectedStudent &&
                `Sending feedback to ${selectedStudent.fullName}`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendFeedback} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="feedbackType">Feedback Type</Label>
              <Select
                value={feedbackForm.type}
                onValueChange={(value) =>
                  setFeedbackForm({ ...feedbackForm, type: value })
                }
              >
                <SelectTrigger id="feedbackType" className="w-full">
                  <SelectValue placeholder="Select feedback type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Feedback</SelectItem>
                  <SelectItem value="project">Project Feedback</SelectItem>
                  <SelectItem value="performance">
                    Performance Feedback
                  </SelectItem>
                  <SelectItem value="improvement">
                    Areas for Improvement
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedbackContent">Feedback Message</Label>
              <Textarea
                id="feedbackContent"
                value={feedbackForm.content}
                onChange={(e) =>
                  setFeedbackForm({ ...feedbackForm, content: e.target.value })
                }
                placeholder="Enter your feedback for the student..."
                rows={5}
                className="resize-none"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFeedbackDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Send Feedback
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Grade Submission Dialog */}
      <Dialog open={isGradingDialogOpen} onOpenChange={setIsGradingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Grade Student Submission</DialogTitle>
            <DialogDescription>
              {selectedStudent &&
                `Grading submission for ${selectedStudent.fullName}`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGradeSubmission} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="submissionType">Submission Type</Label>
              <Select
                value={gradingForm.submissionType}
                onValueChange={(value) =>
                  setGradingForm({ ...gradingForm, submissionType: value })
                }
              >
                <SelectTrigger id="submissionType" className="w-full">
                  <SelectValue placeholder="Select submission type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marks">Marks (0-100)</Label>
              <Input
                id="marks"
                type="number"
                min="0"
                max="100"
                value={gradingForm.marks}
                onChange={(e) =>
                  setGradingForm({ ...gradingForm, marks: e.target.value })
                }
                placeholder="Enter marks (0-100)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gradingFeedback">Feedback (Optional)</Label>
              <Textarea
                id="gradingFeedback"
                value={gradingForm.feedback}
                onChange={(e) =>
                  setGradingForm({ ...gradingForm, feedback: e.target.value })
                }
                placeholder="Enter feedback about the submission..."
                rows={4}
                className="resize-none"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsGradingDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Submit Grade
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamEvaluation;
