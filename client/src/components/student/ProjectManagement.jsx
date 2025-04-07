import { format } from "date-fns";
import {
  Calendar,
  ClipboardCheck,
  FileText,
  Link,
  PlusCircle,
  Upload,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";

const ProjectManagement = ({ team, session, user, onProjectUpdate }) => {
  const [project, setProject] = useState(team?.project || null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [supervisors, setSupervisors] = useState([]);
  const [isLoadingSupervisors, setIsLoadingSupervisors] = useState(false);

  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    type: "project",
    supervisorId: "",
  });

  const [submissionForm, setSubmissionForm] = useState({
    submissionLink: "",
    submissionNote: "",
  });

  useEffect(() => {
    if (team?.project) {
      setProject(team.project);
    }

    if (!supervisors.length) {
      fetchSupervisors();
    }
  }, [team]);

  const fetchSupervisors = async () => {
    try {
      setIsLoadingSupervisors(true);
      const response = await api.get("/api/supervisors");
      setSupervisors(response.data || []);
    } catch (error) {
      console.error("Failed to fetch supervisors:", error);
      toast.error("Could not load available supervisors");
    } finally {
      setIsLoadingSupervisors(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();

    if (!validateProjectForm()) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.post("/api/projects", {
        ...projectForm,
        teamId: team._id,
      });

      setProject(response.data);
      toast.success("Project created successfully");
      setIsCreateDialogOpen(false);

      if (onProjectUpdate) {
        onProjectUpdate(response.data);
      }
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error(error.response?.data?.message || "Failed to create project");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();

    if (!submissionForm.submissionLink.trim()) {
      toast.error("Submission link is required");
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.post(
        `/api/projects/${project._id}/submit`,
        submissionForm
      );

      setProject(response.data);
      toast.success("Project submitted successfully");
      setIsSubmitDialogOpen(false);

      if (onProjectUpdate) {
        onProjectUpdate(response.data);
      }
    } catch (error) {
      console.error("Failed to submit project:", error);
      toast.error(error.response?.data?.message || "Failed to submit project");
    } finally {
      setIsLoading(false);
    }
  };

  const validateProjectForm = () => {
    if (!projectForm.name.trim()) {
      toast.error("Project name is required");
      return false;
    }

    if (!projectForm.supervisorId) {
      toast.error("Please select a supervisor");
      return false;
    }

    return true;
  };

  const resetProjectForm = () => {
    setProjectForm({
      name: "",
      description: "",
      type: "project",
      supervisorId: "",
    });
  };

  const resetSubmissionForm = () => {
    setSubmissionForm({
      submissionLink: "",
      submissionNote: "",
    });
  };

  const isTeamLeader = team?.members?.find(
    (member) => member.user._id === user._id && member.role === "leader"
  );

  const getDeadlineStatus = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline.date);

    if (deadlineDate < now) {
      return "expired";
    }

    // If deadline is within 72 hours
    const hours = (deadlineDate - now) / (1000 * 60 * 60);
    if (hours <= 72) {
      return "upcoming";
    }

    return "future";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "in-progress":
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case "submitted":
        return <Badge className="bg-amber-500">Submitted</Badge>;
      case "reviewed":
        return <Badge className="bg-purple-500">Reviewed</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const getDeadlineBadge = (deadline) => {
    const status = getDeadlineStatus(deadline);

    switch (status) {
      case "expired":
        return <Badge className="bg-red-500">Expired</Badge>;
      case "upcoming":
        return <Badge className="bg-amber-500">Upcoming</Badge>;
      case "future":
        return <Badge className="bg-green-500">Scheduled</Badge>;
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>;
    }
  };

  if (!team) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Team Assigned</h3>
            <p className="text-gray-500 mb-4">
              You need to join a team before creating a project.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!project ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Project Created</h3>
              <p className="text-gray-500 mb-4">
                Create a new project for your team.
              </p>
              {isTeamLeader ? (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Project
                </Button>
              ) : (
                <p className="text-amber-500">
                  Only the team leader can create a project.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{project.name}</CardTitle>
                <CardDescription>
                  <Badge className="mr-2">
                    {project.type === "research"
                      ? "Research Based"
                      : "Project Based"}
                  </Badge>
                  {getStatusBadge(project.status)}
                </CardDescription>
              </div>

              {isTeamLeader && project.status === "in-progress" && (
                <Button
                  onClick={() => setIsSubmitDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="mr-2 h-4 w-4" /> Submit
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="details">
              <TabsList className="mb-4">
                <TabsTrigger value="details">
                  <FileText className="h-4 w-4 mr-2" /> Project Details
                </TabsTrigger>
                <TabsTrigger value="deadlines">
                  <Calendar className="h-4 w-4 mr-2" /> Deadlines
                </TabsTrigger>
                <TabsTrigger value="feedback">
                  <ClipboardCheck className="h-4 w-4 mr-2" /> Submission &
                  Feedback
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="space-y-4">
                  {project.description && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Description</h3>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                        <p className="text-gray-700 dark:text-gray-300">
                          {project.description}
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-medium mb-2">Supervisor</h3>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                      <p className="font-medium">
                        {project.supervisor?.fullName || "Not assigned"}
                      </p>
                      {project.supervisor && (
                        <p className="text-sm text-gray-500">
                          {project.supervisor.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Team Members</h3>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                      <ul className="space-y-2">
                        {team.members.map((member) => (
                          <li
                            key={member.user._id}
                            className="flex items-center"
                          >
                            <span className="font-medium">
                              {member.user.fullName}
                            </span>
                            {member.role === "leader" && (
                              <Badge className="ml-2 bg-blue-500">
                                Team Leader
                              </Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="deadlines" className="space-y-4">
                {session?.deadlines?.length > 0 ? (
                  <div className="space-y-3">
                    {session.deadlines
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .map((deadline) => (
                        <Card key={deadline._id}>
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                              <div>
                                <h3 className="font-medium">{deadline.name}</h3>
                                <p className="text-sm text-gray-500">
                                  Due: {format(new Date(deadline.date), "PPP")}
                                </p>
                                {deadline.description && (
                                  <p className="text-sm mt-1">
                                    {deadline.description}
                                  </p>
                                )}
                              </div>
                              {getDeadlineBadge(deadline)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Deadlines</h3>
                    <p className="text-gray-500">
                      There are no deadlines set for this session yet.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="feedback" className="space-y-4">
                {project.status === "in-progress" ? (
                  <div className="text-center py-6">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No Submission Yet
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Your project has not been submitted yet.
                    </p>
                    {isTeamLeader && (
                      <Button
                        onClick={() => setIsSubmitDialogOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Upload className="mr-2 h-4 w-4" /> Submit Project
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Submission</h3>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                        <p>
                          <a
                            href={project.submissionLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center"
                          >
                            <Link className="h-4 w-4 mr-2" /> View Submission
                          </a>
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Submitted on:{" "}
                          {format(new Date(project.submittedAt), "PPP")}
                        </p>
                        {project.submissionNote && (
                          <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                            <p className="text-sm">{project.submissionNote}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {project.status === "reviewed" ||
                    project.status === "completed" ? (
                      <div>
                        <h3 className="text-lg font-medium mb-2">Feedback</h3>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                          {project.feedback ? (
                            <>
                              <p className="font-medium">
                                Grade: {project.grade}/100
                              </p>
                              <div className="mt-2">
                                <p>{project.feedback}</p>
                              </div>
                            </>
                          ) : (
                            <p className="text-gray-500">
                              No feedback provided yet.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Alert className="bg-amber-50 dark:bg-amber-900/20">
                        <AlertTitle className="text-amber-800 dark:text-amber-300">
                          Waiting for Review
                        </AlertTitle>
                        <AlertDescription className="text-amber-700 dark:text-amber-400">
                          Your submission is waiting to be reviewed by your
                          supervisor.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project for your team. You'll need to select a
              supervisor.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProject} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={projectForm.name}
                onChange={(e) =>
                  setProjectForm({ ...projectForm, name: e.target.value })
                }
                placeholder="Enter project name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectType">Project Type</Label>
              <Select
                value={projectForm.type}
                onValueChange={(value) =>
                  setProjectForm({ ...projectForm, type: value })
                }
              >
                <SelectTrigger id="projectType" className="w-full">
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project Based</SelectItem>
                  <SelectItem value="research">Research Based</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supervisorId">Supervisor</Label>
              <Select
                value={projectForm.supervisorId}
                onValueChange={(value) =>
                  setProjectForm({ ...projectForm, supervisorId: value })
                }
              >
                <SelectTrigger id="supervisorId" className="w-full">
                  <SelectValue placeholder="Select a supervisor" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingSupervisors ? (
                    <SelectItem value="loading" disabled>
                      Loading supervisors...
                    </SelectItem>
                  ) : supervisors.length > 0 ? (
                    supervisors.map((supervisor) => (
                      <SelectItem key={supervisor._id} value={supervisor._id}>
                        {supervisor.fullName} - {supervisor.department}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No supervisors available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDescription">Description (Optional)</Label>
              <Textarea
                id="projectDescription"
                value={projectForm.description}
                onChange={(e) =>
                  setProjectForm({
                    ...projectForm,
                    description: e.target.value,
                  })
                }
                placeholder="Enter project description"
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-white rounded-full"></div>
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submit Project Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Project</DialogTitle>
            <DialogDescription>
              Submit your project work. Please provide a link to your project
              files or documentation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitProject} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="submissionLink">Submission Link</Label>
              <Input
                id="submissionLink"
                value={submissionForm.submissionLink}
                onChange={(e) =>
                  setSubmissionForm({
                    ...submissionForm,
                    submissionLink: e.target.value,
                  })
                }
                placeholder="https://github.com/username/project or Google Drive link"
              />
              <p className="text-xs text-gray-500">
                Please provide a link to your GitHub repository, Google Drive
                folder, or any other location where your project files are
                hosted.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="submissionNote">Notes (Optional)</Label>
              <Textarea
                id="submissionNote"
                value={submissionForm.submissionNote}
                onChange={(e) =>
                  setSubmissionForm({
                    ...submissionForm,
                    submissionNote: e.target.value,
                  })
                }
                placeholder="Any additional notes for your supervisor"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubmitDialogOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-white rounded-full"></div>
                    Submitting...
                  </>
                ) : (
                  "Submit Project"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectManagement;
