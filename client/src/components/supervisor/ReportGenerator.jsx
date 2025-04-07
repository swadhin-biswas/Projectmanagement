import {
  faFileExcel,
  faFilePdf,
  faProjectDiagram,
  faUserGraduate,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import {
  generateCsvReport,
  generatePdfReport,
} from "../../services/reportService";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const ReportGenerator = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState("teams");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState({
    teams: ["name", "memberCount", "projectName", "projectStatus"],
    students: ["fullName", "email", "teamName", "role", "department"],
    projects: ["name", "type", "status", "teamName", "submissionDate"],
  });

  // Get data for reports
  const { data: teamsData, isLoading: isLoadingTeams } = useQuery({
    queryKey: ["supervised-teams"],
    queryFn: async () => {
      const response = await api.get("/api/supervisor/teams");
      return response.data.data || [];
    },
  });

  const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["supervised-students"],
    queryFn: async () => {
      const response = await api.get("/api/supervisor/students");
      return response.data.data || [];
    },
  });

  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["supervised-projects"],
    queryFn: async () => {
      const response = await api.get("/api/supervisor/projects");
      return response.data.data || [];
    },
  });

  // Column definitions for different report types
  const columnDefinitions = {
    teams: [
      { key: "name", header: "Team Name", selected: true },
      { key: "teamId", header: "Team ID", selected: true },
      {
        key: "memberCount",
        header: "Members",
        selected: true,
        format: (val) => val || "0",
      },
      { key: "maxMembers", header: "Max Members", selected: false },
      {
        key: "projects.name",
        header: "Project Name",
        selected: true,
        format: (val) => val || "No Project",
      },
      {
        key: "projects.status",
        header: "Project Status",
        selected: true,
        format: (val) =>
          val
            ? val.charAt(0).toUpperCase() + val.slice(1).replace("_", " ")
            : "N/A",
      },
      {
        key: "projects.type",
        header: "Project Type",
        selected: false,
        format: (val) =>
          val
            ? val.charAt(0).toUpperCase() + val.slice(1).replace("_", " ")
            : "N/A",
      },
      {
        key: "projects.submittedAt",
        header: "Submission Date",
        selected: false,
        format: (val) => (val ? format(new Date(val), "PPP") : "Not submitted"),
      },
    ],
    students: [
      { key: "fullName", header: "Student Name", selected: true },
      { key: "studentId", header: "Student ID", selected: true },
      { key: "email", header: "Email", selected: true },
      { key: "department", header: "Department", selected: false },
      { key: "teamName", header: "Team", selected: true },
      {
        key: "role",
        header: "Role",
        selected: true,
        format: (val) =>
          val ? val.charAt(0).toUpperCase() + val.slice(1) : "Member",
      },
    ],
    projects: [
      { key: "name", header: "Project Name", selected: true },
      {
        key: "type",
        header: "Type",
        selected: true,
        format: (val) =>
          val
            ? val.charAt(0).toUpperCase() + val.slice(1).replace("_", " ")
            : "N/A",
      },
      {
        key: "status",
        header: "Status",
        selected: true,
        format: (val) =>
          val
            ? val.charAt(0).toUpperCase() + val.slice(1).replace("_", " ")
            : "N/A",
      },
      { key: "team.name", header: "Team", selected: true },
      {
        key: "submittedAt",
        header: "Submission Date",
        selected: true,
        format: (val) => (val ? format(new Date(val), "PPP") : "Not submitted"),
      },
      {
        key: "description",
        header: "Description",
        selected: false,
        format: (val) =>
          val ? (val.length > 50 ? val.substring(0, 50) + "..." : val) : "",
      },
    ],
  };

  // Handle column selection
  const toggleColumnSelection = (reportType, columnKey) => {
    const updatedColumns = { ...selectedColumns };

    if (updatedColumns[reportType].includes(columnKey)) {
      updatedColumns[reportType] = updatedColumns[reportType].filter(
        (key) => key !== columnKey
      );
    } else {
      updatedColumns[reportType] = [...updatedColumns[reportType], columnKey];
    }

    setSelectedColumns(updatedColumns);
  };

  // Generate report
  const generateReport = async (format) => {
    setIsGenerating(true);

    try {
      let reportData = [];
      let reportTitle = "";

      // Prepare data based on report type
      if (reportType === "teams") {
        reportData = teamsData || [];
        reportTitle = "Supervised Teams Report";
      } else if (reportType === "students") {
        reportData = studentsData || [];
        reportTitle = "Supervised Students Report";
      } else if (reportType === "projects") {
        reportData = projectsData || [];
        reportTitle = "Supervised Projects Report";
      }

      // Filter columns based on selection
      const columns = columnDefinitions[reportType].filter((col) =>
        selectedColumns[reportType].includes(col.key)
      );

      // Generate report in requested format
      if (format === "pdf") {
        await generatePdfReport({
          type: reportType,
          title: reportTitle,
          data: reportData,
          columns,
          supervisorName: user.fullName,
          filters: {
            "Generated on": format(new Date(), "PPP"),
          },
        });
        toast.success("PDF report generated successfully");
      } else if (format === "csv") {
        generateCsvReport({
          type: reportType,
          data: reportData,
          columns,
        });
        toast.success("CSV report generated successfully");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderPreviewTable = () => {
    let data = [];
    let columns = [];

    if (reportType === "teams") {
      data = teamsData || [];
      columns = columnDefinitions.teams.filter((col) =>
        selectedColumns.teams.includes(col.key)
      );
    } else if (reportType === "students") {
      data = studentsData || [];
      columns = columnDefinitions.students.filter((col) =>
        selectedColumns.students.includes(col.key)
      );
    } else if (reportType === "projects") {
      data = projectsData || [];
      columns = columnDefinitions.projects.filter((col) =>
        selectedColumns.projects.includes(col.key)
      );
    }

    // Only show a preview of the data
    const previewData = data.slice(0, 5);

    return (
      <div className="rounded-md border">
        <Table>
          <TableCaption>
            Preview (showing {previewData.length} of {data.length} records)
          </TableCaption>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewData.map((item, index) => (
              <TableRow key={index}>
                {columns.map((column) => {
                  let value = item;

                  // Handle nested properties with dot notation
                  if (column.key.includes(".")) {
                    const keys = column.key.split(".");
                    for (const key of keys) {
                      value = value?.[key];
                      if (value === undefined) break;
                    }
                  } else {
                    value = item[column.key];
                  }

                  return (
                    <TableCell key={column.key}>
                      {column.format ? column.format(value) : value || "-"}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const isLoading = isLoadingTeams || isLoadingStudents || isLoadingProjects;

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle>Generate Reports</CardTitle>
        <CardDescription>
          Create and download reports about your teams, students, and projects
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Tabs
              defaultValue="teams"
              value={reportType}
              onValueChange={setReportType}
              className="w-full"
            >
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="teams" className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faUsers} className="h-4 w-4" />
                  Teams
                </TabsTrigger>
                <TabsTrigger
                  value="students"
                  className="flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faUserGraduate} className="h-4 w-4" />
                  Students
                </TabsTrigger>
                <TabsTrigger
                  value="projects"
                  className="flex items-center gap-2"
                >
                  <FontAwesomeIcon
                    icon={faProjectDiagram}
                    className="h-4 w-4"
                  />
                  Projects
                </TabsTrigger>
              </TabsList>

              <TabsContent value="teams">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      Select Columns to Include
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {columnDefinitions.teams.map((column) => (
                        <div
                          key={column.key}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`team-${column.key}`}
                            checked={selectedColumns.teams.includes(column.key)}
                            onCheckedChange={() =>
                              toggleColumnSelection("teams", column.key)
                            }
                          />
                          <Label htmlFor={`team-${column.key}`}>
                            {column.header}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="flex justify-center p-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  ) : (
                    renderPreviewTable()
                  )}
                </div>
              </TabsContent>

              <TabsContent value="students">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      Select Columns to Include
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {columnDefinitions.students.map((column) => (
                        <div
                          key={column.key}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`student-${column.key}`}
                            checked={selectedColumns.students.includes(
                              column.key
                            )}
                            onCheckedChange={() =>
                              toggleColumnSelection("students", column.key)
                            }
                          />
                          <Label htmlFor={`student-${column.key}`}>
                            {column.header}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="flex justify-center p-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  ) : (
                    renderPreviewTable()
                  )}
                </div>
              </TabsContent>

              <TabsContent value="projects">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      Select Columns to Include
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {columnDefinitions.projects.map((column) => (
                        <div
                          key={column.key}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`project-${column.key}`}
                            checked={selectedColumns.projects.includes(
                              column.key
                            )}
                            onCheckedChange={() =>
                              toggleColumnSelection("projects", column.key)
                            }
                          />
                          <Label htmlFor={`project-${column.key}`}>
                            {column.header}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="flex justify-center p-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  ) : (
                    renderPreviewTable()
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={() => generateReport("csv")}
          disabled={isGenerating || isLoading}
          className="flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faFileExcel} className="h-4 w-4" />
          Export CSV
        </Button>
        <Button
          onClick={() => generateReport("pdf")}
          disabled={isGenerating || isLoading}
          className="flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faFilePdf} className="h-4 w-4" />
          Export PDF
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ReportGenerator;
