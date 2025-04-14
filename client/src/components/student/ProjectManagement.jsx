import { format } from "date-fns";
import { FileText, PlusCircle, Upload } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { projectAPI } from "../../api/projects";
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
import { ScrollArea } from "../ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
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
    category: "software-development",
    supervisorIds: [],
    objectives: [],
    technologies: [],
    timeline: {
      startDate: new Date().toISOString(),
      endDate: null,
      milestones: [],
    },
  });

  const [submissionForm, setSubmissionForm] = useState({
    submissionLink: "",
    submissionNote: "",
  });

  const [selectedSupervisors, setSelectedSupervisors] = useState([]);
  const [newObjective, setNewObjective] = useState("");
  const [newTechnology, setNewTechnology] = useState("");

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
      const response = await projectAPI.getAvailableSupervisors();
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
      const response = await projectAPI.createProject({
        ...projectForm,
        teamId: team._id,
        supervisorIds: selectedSupervisors.map((s) => s._id),
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
      const response = await projectAPI.submitProject(project._id, {
        title: "Project Submission",
        fileUrl: submissionForm.submissionLink,
        description: submissionForm.submissionNote || "Project submission",
      });

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

    if (selectedSupervisors.length === 0) {
      toast.error("Please select at least one supervisor");
      return false;
    }

    return true;
  };

  const resetProjectForm = () => {
    setProjectForm({
      name: "",
      description: "",
      type: "project",
      category: "software-development",
      objectives: [],
      technologies: [],
      timeline: {
        startDate: new Date().toISOString(),
        endDate: null,
        milestones: [],
      },
    });
    setSelectedSupervisors([]);
    setNewObjective("");
    setNewTechnology("");
  };

  const resetSubmissionForm = () => {
    setSubmissionForm({
      submissionLink: "",
      submissionNote: "",
    });
  };

  const handleAddObjective = () => {
    if (newObjective.trim()) {
      setProjectForm((prev) => ({
        ...prev,
        objectives: [...prev.objectives, newObjective.trim()],
      }));
      setNewObjective("");
    }
  };

  const handleAddTechnology = () => {
    if (newTechnology.trim()) {
      setProjectForm((prev) => ({
        ...prev,
        technologies: [...prev.technologies, newTechnology.trim()],
      }));
      setNewTechnology("");
    }
  };

  const handleToggleSupervisor = (supervisor) => {
    if (selectedSupervisors.some((s) => s._id === supervisor._id)) {
      setSelectedSupervisors(
        selectedSupervisors.filter((s) => s._id !== supervisor._id)
      );
    } else {
      setSelectedSupervisors([...selectedSupervisors, supervisor]);
    }
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
        return <Badge className="bg-green-500">Submitted</Badge>;
      case "approved":
        return <Badge className="bg-green-700">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>;
      case "pending_approval":
        return <Badge className="bg-yellow-500">Pending Approval</Badge>;
      default:
        return <Badge className="bg-gray-500">Draft</Badge>;
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
      {!project && isTeamLeader && (
        <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg">
          <h3 className="text-xl font-semibold mb-3">
            Create a Project for Your Team
          </h3>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-4">
            As the team leader, you can create a project for your team and
            assign supervisors.
          </p>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center space-x-2"
          >
            <PlusCircle size={18} />
            <span>Create Project</span>
          </Button>
        </div>
      )}

      {project && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <span>{project.name}</span>
                  {getStatusBadge(project.status)}
                </CardTitle>
                <CardDescription>
                  Created on{" "}
                  {format(new Date(project.createdAt), "MMMM d, yyyy")}
                </CardDescription>
              </div>
              {project.status !== "submitted" && (
                <Button
                  onClick={() => setIsSubmitDialogOpen(true)}
                  className="flex items-center space-x-2"
                >
                  <Upload size={18} />
                  <span>Submit Project</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-gray-600 dark:text-gray-300">
                {project.description || "No description provided."}
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Supervisor</h4>
              {project.supervisors && project.supervisors.length > 0 ? (
                <div className="space-y-2">
                  {project.supervisors.map((supervisorInfo, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Badge
                        className={
                          supervisorInfo.status === "accepted"
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        }
                      >
                        {supervisorInfo.status === "accepted"
                          ? "Accepted"
                          : "Pending"}
                      </Badge>
                      <span>
                        {supervisorInfo.supervisor?.name || "Supervisor"}
                        {supervisorInfo.isMainSupervisor && " (Main)"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  No supervisor assigned yet.
                </p>
              )}
            </div>

            {project.objectives && project.objectives.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Objectives</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {project.objectives.map((objective, index) => (
                    <li
                      key={index}
                      className="text-gray-600 dark:text-gray-300"
                    >
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {project.technologies && project.technologies.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Technologies</h4>
                <div className="flex flex-wrap gap-2">
                  {project.technologies.map((tech, index) => (
                    <Badge key={index} variant="outline">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-2">Submissions</h4>
              {project.submissions && project.submissions.length > 0 ? (
                <div className="space-y-2">
                  {project.submissions.map((submission, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-md flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">{submission.title}</p>
                        <p className="text-sm text-gray-500">
                          Submitted on{" "}
                          {format(
                            new Date(submission.submittedAt),
                            "MMM d, yyyy"
                          )}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex items-center space-x-1"
                      >
                        <a
                          href={submission.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FileText size={16} />
                          <span>View</span>
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  No submissions yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create a New Project</DialogTitle>
            <DialogDescription>
              Define your team's project details and select a supervisor
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProject} className="space-y-6">
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name*</Label>
                  <Input
                    id="name"
                    value={projectForm.name}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, name: e.target.value })
                    }
                    placeholder="Project name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Project Type*</Label>
                  <Select
                    value={projectForm.type}
                    onValueChange={(value) =>
                      setProjectForm({ ...projectForm, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="research">Research Project</SelectItem>
                      <SelectItem value="project">
                        Development Project
                      </SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category*</Label>
                <Select
                  value={projectForm.category}
                  onValueChange={(value) =>
                    setProjectForm({ ...projectForm, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="software-development">
                      Software Development
                    </SelectItem>
                    <SelectItem value="data-science">Data Science</SelectItem>
                    <SelectItem value="ai-ml">AI/Machine Learning</SelectItem>
                    <SelectItem value="iot">IoT</SelectItem>
                    <SelectItem value="mobile-app">Mobile App</SelectItem>
                    <SelectItem value="web-app">Web App</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description*</Label>
                <Textarea
                  id="description"
                  value={projectForm.description}
                  onChange={(e) =>
                    setProjectForm({
                      ...projectForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Project description, goals, and scope"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objectives">Objectives</Label>
                <div className="flex space-x-2">
                  <Input
                    id="newObjective"
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    placeholder="Add an objective"
                  />
                  <Button type="button" onClick={handleAddObjective}>
                    Add
                  </Button>
                </div>
                {projectForm.objectives.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {projectForm.objectives.map((obj, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded"
                      >
                        <span>{obj}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setProjectForm((prev) => ({
                              ...prev,
                              objectives: prev.objectives.filter(
                                (_, i) => i !== idx
                              ),
                            }));
                          }}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="technologies">Technologies</Label>
                <div className="flex space-x-2">
                  <Input
                    id="newTechnology"
                    value={newTechnology}
                    onChange={(e) => setNewTechnology(e.target.value)}
                    placeholder="Add a technology"
                  />
                  <Button type="button" onClick={handleAddTechnology}>
                    Add
                  </Button>
                </div>
                {projectForm.technologies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {projectForm.technologies.map((tech, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tech}
                        <button
                          type="button"
                          className="ml-1 hover:text-red-500"
                          onClick={() => {
                            setProjectForm((prev) => ({
                              ...prev,
                              technologies: prev.technologies.filter(
                                (_, i) => i !== idx
                              ),
                            }));
                          }}
                        >
                          ✕
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Select Supervisors*</Label>
                {isLoadingSupervisors ? (
                  <div className="text-center py-4">Loading supervisors...</div>
                ) : supervisors.length > 0 ? (
                  <ScrollArea className="h-60 border rounded-md p-4">
                    <div className="space-y-4">
                      {supervisors.map((supervisor) => (
                        <div
                          key={supervisor._id}
                          className="flex items-start space-x-3"
                        >
                          <Checkbox
                            id={`supervisor-${supervisor._id}`}
                            checked={selectedSupervisors.some(
                              (s) => s._id === supervisor._id
                            )}
                            onCheckedChange={() =>
                              handleToggleSupervisor(supervisor)
                            }
                          />
                          <Label
                            htmlFor={`supervisor-${supervisor._id}`}
                            className="leading-tight cursor-pointer"
                          >
                            <div className="font-medium">{supervisor.name}</div>
                            <div className="text-sm text-gray-500">
                              {supervisor.department} •{" "}
                              {supervisor.expertise?.join(", ")}
                            </div>
                            <div className="text-xs text-gray-500">
                              {supervisor.currentProjects || 0}/
                              {supervisor.maxProjects || "∞"} projects
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-4 border rounded-md">
                    No supervisors available
                  </div>
                )}
                {selectedSupervisors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Selected Supervisors:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedSupervisors.map((supervisor) => (
                        <Badge key={supervisor._id}>{supervisor.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetProjectForm();
                  setIsCreateDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submit Project Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Submit Project</DialogTitle>
            <DialogDescription>
              Upload your project files and submit for review
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitProject} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="submissionLink">Submission Link*</Label>
              <Input
                id="submissionLink"
                value={submissionForm.submissionLink}
                onChange={(e) =>
                  setSubmissionForm({
                    ...submissionForm,
                    submissionLink: e.target.value,
                  })
                }
                placeholder="https://github.com/yourusername/repository"
              />
              <p className="text-xs text-gray-500">
                Link to your project code (GitHub, GitLab, etc.)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="submissionNote">Note (Optional)</Label>
              <Textarea
                id="submissionNote"
                value={submissionForm.submissionNote}
                onChange={(e) =>
                  setSubmissionForm({
                    ...submissionForm,
                    submissionNote: e.target.value,
                  })
                }
                placeholder="Any notes for the reviewer"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetSubmissionForm();
                  setIsSubmitDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Submitting..." : "Submit Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectManagement;
