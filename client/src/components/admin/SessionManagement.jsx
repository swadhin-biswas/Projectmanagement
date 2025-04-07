import { faCalendarAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Check, Plus, Trash2 } from "lucide-react";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { DatePicker } from "../ui/date-picker";
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
import { Textarea } from "../ui/textarea";

const SessionManagement = () => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [deadlineFormError, setDeadlineFormError] = useState("");

  const [sessionForm, setSessionForm] = useState({
    name: "",
    startDate: null,
    endDate: null,
    description: "",
    academicYear: "",
    semester: "Fall",
  });

  const [deadlineForm, setDeadlineForm] = useState({
    name: "",
    date: null,
    type: "project_submission",
    description: "",
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/sessions");
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      toast.error("Could not load academic sessions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();

    if (!validateSessionForm()) {
      return;
    }

    try {
      const payload = {
        ...sessionForm,
        startDate: sessionForm.startDate.toISOString(),
        endDate: sessionForm.endDate.toISOString(),
      };

      await api.post("/api/sessions", payload);
      toast.success("Academic session created successfully");
      setIsCreateOpen(false);
      resetSessionForm();
      fetchSessions();
    } catch (error) {
      console.error("Failed to create session:", error);
      toast.error(error.response?.data?.message || "Failed to create session");
    }
  };

  const handleCreateDeadline = async (e) => {
    e.preventDefault();

    if (!validateDeadlineForm()) {
      return;
    }

    try {
      const payload = {
        ...deadlineForm,
        date: deadlineForm.date.toISOString(),
      };

      await api.post(`/api/sessions/${currentSessionId}/deadlines`, payload);
      toast.success("Deadline added successfully");
      setIsDeadlineOpen(false);
      resetDeadlineForm();
      fetchSessions();
    } catch (error) {
      console.error("Failed to add deadline:", error);
      toast.error(error.response?.data?.message || "Failed to add deadline");
    }
  };

  const handleActivateSession = async (sessionId) => {
    try {
      await api.post(`/api/sessions/${sessionId}/activate`);
      toast.success("Session activated successfully");
      fetchSessions();
    } catch (error) {
      console.error("Failed to activate session:", error);
      toast.error(
        error.response?.data?.message || "Failed to activate session"
      );
    }
  };

  const handleDeleteDeadline = async (sessionId, deadlineId) => {
    if (!window.confirm("Are you sure you want to delete this deadline?")) {
      return;
    }

    try {
      await api.delete(`/api/sessions/${sessionId}/deadlines/${deadlineId}`);
      toast.success("Deadline deleted successfully");
      fetchSessions();
    } catch (error) {
      console.error("Failed to delete deadline:", error);
      toast.error(error.response?.data?.message || "Failed to delete deadline");
    }
  };

  const validateSessionForm = () => {
    if (!sessionForm.name.trim()) {
      toast.error("Session name is required");
      return false;
    }

    if (!sessionForm.startDate) {
      toast.error("Start date is required");
      return false;
    }

    if (!sessionForm.endDate) {
      toast.error("End date is required");
      return false;
    }

    if (sessionForm.endDate <= sessionForm.startDate) {
      toast.error("End date must be after start date");
      return false;
    }

    // Check if duration is 4-5 months
    const start = new Date(sessionForm.startDate);
    const end = new Date(sessionForm.endDate);
    const diffMonths =
      (end.getFullYear() - start.getFullYear()) * 12 +
      end.getMonth() -
      start.getMonth();

    if (diffMonths < 4 || diffMonths > 5) {
      toast.error("Session duration must be between 4-5 months");
      return false;
    }

    return true;
  };

  const validateDeadlineForm = () => {
    if (!deadlineForm.name.trim()) {
      setDeadlineFormError("Deadline name is required");
      return false;
    }

    if (!deadlineForm.date) {
      setDeadlineFormError("Deadline date is required");
      return false;
    }

    const session = sessions.find((s) => s._id === currentSessionId);
    if (!session) {
      setDeadlineFormError("Session not found");
      return false;
    }

    const deadlineDate = new Date(deadlineForm.date);
    const sessionStart = new Date(session.startDate);
    const sessionEnd = new Date(session.endDate);

    if (deadlineDate < sessionStart || deadlineDate > sessionEnd) {
      setDeadlineFormError("Deadline must be within the session period");
      return false;
    }

    setDeadlineFormError("");
    return true;
  };

  const resetSessionForm = () => {
    setSessionForm({
      name: "",
      startDate: null,
      endDate: null,
      description: "",
      academicYear: "",
      semester: "Fall",
    });
  };

  const resetDeadlineForm = () => {
    setDeadlineForm({
      name: "",
      date: null,
      type: "project_submission",
      description: "",
    });
    setDeadlineFormError("");
  };

  const openDeadlineModal = (sessionId) => {
    setCurrentSessionId(sessionId);
    setIsDeadlineOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "upcoming":
        return <Badge className="bg-blue-500">Upcoming</Badge>;
      case "completed":
        return <Badge className="bg-gray-500">Completed</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const getDeadlineTypeBadge = (type) => {
    switch (type) {
      case "project_submission":
        return <Badge className="bg-purple-500">Project Submission</Badge>;
      case "report_submission":
        return <Badge className="bg-indigo-500">Report Submission</Badge>;
      case "presentation":
        return <Badge className="bg-pink-500">Presentation</Badge>;
      default:
        return <Badge className="bg-gray-500">Other</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Academic Sessions</h2>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" /> Create Session
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <FontAwesomeIcon
                icon={faCalendarAlt}
                className="text-4xl text-gray-400 mb-3"
              />
              <h3 className="text-lg font-medium mb-2">No Academic Sessions</h3>
              <p className="text-gray-500 mb-4">
                Create a new academic session to get started.
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" /> Create Session
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {sessions.map((session) => (
            <Card
              key={session._id}
              className={`${
                session.status === "active" ? "border-green-500 border-2" : ""
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{session.name}</CardTitle>
                    <CardDescription>
                      {formatDate(session.startDate)} -{" "}
                      {formatDate(session.endDate)}
                    </CardDescription>
                  </div>
                  {getStatusBadge(session.status)}
                </div>
              </CardHeader>
              <CardContent>
                {session.description && (
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {session.description}
                  </p>
                )}

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Deadlines</h4>

                    {session.deadlines?.length > 0 ? (
                      <div className="space-y-2">
                        {session.deadlines.map((deadline) => (
                          <div
                            key={deadline._id}
                            className="p-3 rounded-md bg-gray-50 dark:bg-gray-800 flex justify-between items-center"
                          >
                            <div>
                              <div className="font-medium">{deadline.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-2">
                                <span>{formatDate(deadline.date)}</span>
                                <span>•</span>
                                <span>
                                  {getDeadlineTypeBadge(deadline.type)}
                                </span>
                              </div>
                              {deadline.description && (
                                <div className="text-sm mt-1">
                                  {deadline.description}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteDeadline(session._id, deadline._id)
                              }
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4 border border-dashed rounded-md">
                        <p className="text-gray-500 dark:text-gray-400">
                          No deadlines set for this session
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => openDeadlineModal(session._id)}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Deadline
                </Button>

                {session.status === "upcoming" && (
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleActivateSession(session._id)}
                  >
                    <Check className="mr-2 h-4 w-4" /> Activate Session
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Session Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Academic Session</DialogTitle>
            <DialogDescription>
              Create a new academic session with a 4-5 month duration.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSession} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Session Name</Label>
              <Input
                id="name"
                value={sessionForm.name}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, name: e.target.value })
                }
                placeholder="E.g., Spring Semester 2025"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <DatePicker
                  id="startDate"
                  date={sessionForm.startDate}
                  setDate={(date) =>
                    setSessionForm({ ...sessionForm, startDate: date })
                  }
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <DatePicker
                  id="endDate"
                  date={sessionForm.endDate}
                  setDate={(date) =>
                    setSessionForm({ ...sessionForm, endDate: date })
                  }
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="academicYear">Academic Year</Label>
                <Input
                  id="academicYear"
                  value={sessionForm.academicYear}
                  onChange={(e) =>
                    setSessionForm({
                      ...sessionForm,
                      academicYear: e.target.value,
                    })
                  }
                  placeholder="E.g., 2024-2025"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester">Semester</Label>
                <Select
                  value={sessionForm.semester}
                  onValueChange={(value) =>
                    setSessionForm({ ...sessionForm, semester: value })
                  }
                >
                  <SelectTrigger id="semester" className="w-full">
                    <SelectValue placeholder="Select a semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Spring">Spring</SelectItem>
                    <SelectItem value="Summer">Summer</SelectItem>
                    <SelectItem value="Fall">Fall</SelectItem>
                    <SelectItem value="Winter">Winter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={sessionForm.description}
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    description: e.target.value,
                  })
                }
                placeholder="Brief description of this academic session"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Create Session
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Deadline Dialog */}
      <Dialog open={isDeadlineOpen} onOpenChange={setIsDeadlineOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Deadline</DialogTitle>
            <DialogDescription>
              Add a new deadline to the academic session.
            </DialogDescription>
          </DialogHeader>

          {deadlineFormError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{deadlineFormError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreateDeadline} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deadlineName">Deadline Name</Label>
              <Input
                id="deadlineName"
                value={deadlineForm.name}
                onChange={(e) =>
                  setDeadlineForm({ ...deadlineForm, name: e.target.value })
                }
                placeholder="E.g., Project Proposal Submission"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadlineDate">Deadline Date</Label>
              <DatePicker
                id="deadlineDate"
                date={deadlineForm.date}
                setDate={(date) =>
                  setDeadlineForm({ ...deadlineForm, date: date })
                }
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadlineType">Deadline Type</Label>
              <Select
                value={deadlineForm.type}
                onValueChange={(value) =>
                  setDeadlineForm({ ...deadlineForm, type: value })
                }
              >
                <SelectTrigger id="deadlineType" className="w-full">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project_submission">
                    Project Submission
                  </SelectItem>
                  <SelectItem value="report_submission">
                    Report Submission
                  </SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadlineDescription">
                Description (Optional)
              </Label>
              <Textarea
                id="deadlineDescription"
                value={deadlineForm.description}
                onChange={(e) =>
                  setDeadlineForm({
                    ...deadlineForm,
                    description: e.target.value,
                  })
                }
                placeholder="Brief description of this deadline"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeadlineOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Add Deadline
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SessionManagement;
