import PageTransition from "@/components/PageTransition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Clock, FileText, Upload } from "lucide-react";
import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";

const ProjectsPage = () => {
  const [activeTab, setActiveTab] = useState("ongoing");
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [submissionForm, setSubmissionForm] = useState({
    title: "",
    description: "",
    fileUrl: "",
    comments: "",
  });

  const {
    data: projects,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["student-projects"],
    queryFn: async () => {
      try {
        // This would be replaced with a real API call
        return [
          {
            id: "proj1",
            name: "Final Year Project",
            description: "Main capstone project for the degree program",
            status: "in_progress",
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            submissions: 2,
            lastSubmission: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          },
          {
            id: "proj2",
            name: "Research Paper",
            description: "Academic research paper on selected topic",
            status: "pending",
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            submissions: 0,
          },
          {
            id: "proj3",
            name: "Group Assignment",
            description: "Collaborative assignment with team members",
            status: "completed",
            deadline: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            submissions: 3,
            lastSubmission: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
            grade: "A",
            feedback: "Excellent work on the collaborative aspects",
          },
        ];
      } catch (error) {
        toast.error("Failed to load projects");
        throw error;
      }
    },
  });

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setSubmissionForm({
      title: "",
      description: "",
      fileUrl: "",
      comments: "",
    });
    setIsSubmitDialogOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setSubmissionForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!submissionForm.title.trim() || !submissionForm.description.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      // This would be a real API call in production
      // await studentAPI.submitProject(selectedProject.id, submissionForm);

      toast.success("Project submission successful");
      setIsSubmitDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error("Failed to submit project");
      console.error(error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>;
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return format(new Date(date), "MMM d, yyyy");
  };

  if (isLoading) {
    return (
      <PageTransition>
        <Helmet>
          <title>Projects | Student Portal</title>
        </Helmet>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-12 w-full mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Helmet>
        <title>Projects | Student Portal</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Projects</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="all">All Projects</TabsTrigger>
          </TabsList>

          <TabsContent value="ongoing" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects
                ?.filter((p) => p.status !== "completed")
                .map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onSubmit={() => handleSelectProject(project)}
                  />
                ))}

              {projects?.filter((p) => p.status !== "completed").length ===
                0 && (
                <div className="col-span-3 text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    No ongoing projects
                  </h3>
                  <p className="text-gray-500">
                    You don't have any ongoing projects at the moment.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects
                ?.filter((p) => p.status === "completed")
                .map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onSubmit={() => handleSelectProject(project)}
                  />
                ))}

              {projects?.filter((p) => p.status === "completed").length ===
                0 && (
                <div className="col-span-3 text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    No completed projects
                  </h3>
                  <p className="text-gray-500">
                    You haven't completed any projects yet.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects?.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onSubmit={() => handleSelectProject(project)}
                />
              ))}

              {projects?.length === 0 && (
                <div className="col-span-3 text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    No projects found
                  </h3>
                  <p className="text-gray-500">
                    You don't have any projects assigned yet.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Submission Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Submit Project: {selectedProject?.name}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Submission Title *</Label>
              <Input
                id="title"
                name="title"
                value={submissionForm.title}
                onChange={handleFormChange}
                placeholder="e.g. Final Draft"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                value={submissionForm.description}
                onChange={handleFormChange}
                placeholder="Brief description of this submission"
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fileUrl">File/Document URL *</Label>
              <Input
                id="fileUrl"
                name="fileUrl"
                value={submissionForm.fileUrl}
                onChange={handleFormChange}
                placeholder="Link to your document (Google Drive, OneDrive, etc.)"
                required
              />
              <p className="text-xs text-gray-500">
                Please upload your file to a cloud storage service and provide
                the link here
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Additional Comments</Label>
              <Textarea
                id="comments"
                name="comments"
                value={submissionForm.comments}
                onChange={handleFormChange}
                placeholder="Any additional notes for the reviewer"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubmitDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Submit Project</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
};

const ProjectCard = ({ project, onSubmit }) => {
  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{project.name}</CardTitle>
          {project.status && (
            <div>
              {project.status === "completed" ? (
                <Badge className="bg-green-500">Completed</Badge>
              ) : project.status === "in_progress" ? (
                <Badge className="bg-blue-500">In Progress</Badge>
              ) : (
                <Badge className="bg-yellow-500">Pending</Badge>
              )}
            </div>
          )}
        </div>
        <CardDescription className="line-clamp-2 h-10">
          {project.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Deadline:</span>
            <span className="font-medium">
              {format(new Date(project.deadline), "MMM d, yyyy")}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Submissions:</span>
            <span className="font-medium">{project.submissions || 0}</span>
          </div>

          {project.lastSubmission && (
            <div className="flex justify-between">
              <span className="text-gray-500">Last submitted:</span>
              <span className="font-medium">
                {format(new Date(project.lastSubmission), "MMM d, yyyy")}
              </span>
            </div>
          )}

          {project.grade && (
            <div className="flex justify-between">
              <span className="text-gray-500">Grade:</span>
              <span className="font-semibold">{project.grade}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        {project.status !== "completed" ? (
          <Button onClick={onSubmit} className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            Submit Work
          </Button>
        ) : (
          <div className="w-full text-center text-sm text-gray-500 py-1">
            <Clock className="h-4 w-4 inline mr-1" />
            Completed on{" "}
            {format(new Date(project.lastSubmission), "MMM d, yyyy")}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default ProjectsPage;
