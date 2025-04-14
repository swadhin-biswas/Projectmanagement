import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ClipboardList, FileText, Upload } from "lucide-react";
import { useState } from "react";
import { projectAPI } from "../../api/projects";
import LoadingSpinner from "../../components/LoadingSpinner";
import ProjectSubmissionForm from "../../components/student/ProjectSubmission";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";

const ProjectSubmissionPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("submit");

  // Get project data
  const {
    data: projectData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["student-project"],
    queryFn: async () => {
      try {
        const response = await projectAPI.getAllProjects();
        // Find first active project
        return response.data && response.data.length > 0
          ? { success: true, data: response.data[0] }
          : { success: false, data: null };
      } catch (error) {
        console.error("Failed to fetch project:", error);
        return { success: false, data: null };
      }
    },
  });

  // Get project submissions
  const { data: submissionsData, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ["project-submissions", projectData?.data?._id],
    queryFn: async () => {
      if (!projectData?.data?._id) return { success: true, data: [] };
      try {
        const response = await projectAPI.getSubmissions(projectData.data._id);
        return response;
      } catch (error) {
        console.error("Failed to fetch submissions:", error);
        return { success: false, data: [] };
      }
    },
    enabled: !!projectData?.data?._id,
  });

  const handleSubmissionComplete = () => {
    // Refetch submissions data
    queryClient.invalidateQueries([
      "project-submissions",
      projectData?.data?._id,
    ]);
    // Switch to history tab
    setActiveTab("history");
  };

  const project = projectData?.data || null;
  const submissions = submissionsData?.data || [];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-center">
          <h2 className="text-lg font-medium text-red-800 dark:text-red-300">
            Error loading project
          </h2>
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            Please try refreshing the page or contact support if the problem
            persists.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800 rounded-md text-red-700 dark:text-red-200"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
          <h2 className="text-lg font-medium text-yellow-800 dark:text-yellow-300">
            No Project Found
          </h2>
          <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
            You need to create or join a project before submitting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">
          Project: {project?.name || "My Project"}
        </h1>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">{project.type}</Badge>
          <Badge
            className={
              project.status === "pending_approval"
                ? "bg-yellow-500"
                : project.status === "approved"
                ? "bg-green-500"
                : project.status === "rejected"
                ? "bg-red-500"
                : "bg-blue-500"
            }
          >
            {project.status?.replace("_", " ").toUpperCase()}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="submit" className="flex items-center">
            <Upload className="mr-2 h-4 w-4" />
            Submit Report
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center">
            <ClipboardList className="mr-2 h-4 w-4" />
            Submission History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submit">
          <ProjectSubmissionForm
            project={project}
            onSubmissionComplete={handleSubmissionComplete}
          />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Submission History</CardTitle>
              <CardDescription>
                View all your previous project submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSubmissions ? (
                <div className="text-center py-8">Loading submissions...</div>
              ) : submissions.length > 0 ? (
                <div className="space-y-4">
                  {submissions.map((submission, index) => (
                    <div
                      key={submission._id || index}
                      className="border rounded-md p-4 dark:border-gray-700"
                    >
                      <div className="flex justify-between mb-2">
                        <div className="flex items-center">
                          <h4 className="font-medium">{submission.title}</h4>
                          <Badge className="ml-2" variant="outline">
                            {submission.submissionType?.replace("_", " ")}
                          </Badge>
                          {submission.isLate && (
                            <Badge className="ml-2 bg-amber-500">Late</Badge>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {format(
                            new Date(submission.submittedAt),
                            "MMM d, yyyy"
                          )}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{submission.description}</p>
                      <div className="text-sm">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="flex items-center gap-1"
                        >
                          <a
                            href={submission.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View File
                          </a>
                        </Button>
                      </div>

                      {submission.feedback && (
                        <div className="mt-3 pt-3 border-t dark:border-gray-700">
                          <h5 className="font-medium mb-1">Feedback</h5>
                          <p className="text-sm">
                            {submission.feedback.content}
                          </p>
                          <div className="text-xs mt-1 text-gray-500">
                            From: {submission.feedback.givenBy}
                            {submission.feedback.givenAt && (
                              <span>
                                {" "}
                                •{" "}
                                {format(
                                  new Date(submission.feedback.givenAt),
                                  "MMM d, yyyy"
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No submissions yet. Submit your first report from the "Submit
                  Report" tab.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectSubmissionPage;
