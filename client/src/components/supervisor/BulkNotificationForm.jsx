import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { api } from "../../../lib/api";
import { Button } from "../../ui/button";
import { Calendar } from "../../ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { Checkbox } from "../../ui/checkbox";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Textarea } from "../../ui/textarea";

const BulkNotificationForm = () => {
  const [formData, setFormData] = useState({
    recipientType: "all",
    teamId: "",
    studentIds: [],
    subject: "",
    message: "",
    type: "general",
    isUrgent: false,
    requiresAction: false,
    dueDate: null,
    sendEmail: true,
  });

  const [isSending, setIsSending] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Get all supervised teams
  const { data: teamsData, isLoading: isLoadingTeams } = useQuery({
    queryKey: ["supervised-teams"],
    queryFn: async () => {
      const response = await api.get("/api/supervisor/teams");
      return response.data.data || [];
    },
  });

  // Get supervised students
  const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["supervised-students"],
    queryFn: async () => {
      const response = await api.get("/api/supervisor/students");
      return response.data.data || [];
    },
  });

  // Handle form field changes
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle checkbox changes
  const handleCheckboxChange = (field, checked) => {
    setFormData((prev) => ({ ...prev, [field]: checked }));
  };

  // Handle student selection
  const handleStudentSelection = (studentId) => {
    setSelectedStudents((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  // Update studentIds when selectedStudents changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, studentIds: selectedStudents }));
  }, [selectedStudents]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.message) {
      toast.error("Message is required");
      return;
    }

    if (formData.recipientType === "team" && !formData.teamId) {
      toast.error("Please select a team");
      return;
    }

    if (
      formData.recipientType === "selected" &&
      formData.studentIds.length === 0
    ) {
      toast.error("Please select at least one student");
      return;
    }

    try {
      setIsSending(true);
      const response = await api.post(
        "/api/supervisor/notifications/bulk",
        formData
      );

      if (response.data.success) {
        toast.success("Notification sent successfully");
        // Reset form
        setFormData({
          recipientType: "all",
          teamId: "",
          studentIds: [],
          subject: "",
          message: "",
          type: "general",
          isUrgent: false,
          requiresAction: false,
          dueDate: null,
          sendEmail: true,
        });
        setSelectedStudents([]);
      } else {
        toast.error(response.data.error || "Failed to send notification");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error(error.response?.data?.error || "Failed to send notification");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Send Bulk Notification</CardTitle>
        <CardDescription>
          Send notifications to multiple students or teams at once
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipientType">Send to</Label>
            <Select
              value={formData.recipientType}
              onValueChange={(value) => handleChange("recipientType", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select recipients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All my students</SelectItem>
                <SelectItem value="team">Specific team</SelectItem>
                <SelectItem value="selected">Selected students</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.recipientType === "team" && (
            <div className="space-y-2">
              <Label htmlFor="teamId">Select Team</Label>
              <Select
                value={formData.teamId}
                onValueChange={(value) => handleChange("teamId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingTeams ? (
                    <SelectItem value="" disabled>
                      Loading teams...
                    </SelectItem>
                  ) : teamsData?.length > 0 ? (
                    teamsData.map((team) => (
                      <SelectItem key={team._id} value={team._id}>
                        {team.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No teams available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.recipientType === "selected" && (
            <div className="space-y-2">
              <Label>Select Students</Label>
              <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                {isLoadingStudents ? (
                  <p>Loading students...</p>
                ) : studentsData?.length > 0 ? (
                  studentsData.map((student) => (
                    <div
                      key={student._id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`student-${student._id}`}
                        checked={selectedStudents.includes(student._id)}
                        onCheckedChange={() =>
                          handleStudentSelection(student._id)
                        }
                      />
                      <Label
                        htmlFor={`student-${student._id}`}
                        className="cursor-pointer"
                      >
                        {student.fullName} ({student.teamName || "No team"})
                      </Label>
                    </div>
                  ))
                ) : (
                  <p>No students available</p>
                )}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Selected: {selectedStudents.length} student(s)
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Notification subject"
              value={formData.subject}
              onChange={(e) => handleChange("subject", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your message here"
              rows={5}
              required
              value={formData.message}
              onChange={(e) => handleChange("message", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Message Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleChange("type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select message type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="praise">Praise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isUrgent"
                checked={formData.isUrgent}
                onCheckedChange={(checked) =>
                  handleCheckboxChange("isUrgent", checked)
                }
              />
              <Label htmlFor="isUrgent">Mark as urgent</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="requiresAction"
                checked={formData.requiresAction}
                onCheckedChange={(checked) =>
                  handleCheckboxChange("requiresAction", checked)
                }
              />
              <Label htmlFor="requiresAction">
                Requires action from students
              </Label>
            </div>

            {formData.requiresAction && (
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date (optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {formData.dueDate
                        ? format(formData.dueDate, "PPP")
                        : "Select a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.dueDate}
                      onSelect={(date) => handleChange("dueDate", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendEmail"
                checked={formData.sendEmail}
                onCheckedChange={(checked) =>
                  handleCheckboxChange("sendEmail", checked)
                }
              />
              <Label htmlFor="sendEmail">Send email notification</Label>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button type="submit" onClick={handleSubmit} disabled={isSending}>
          {isSending ? "Sending..." : "Send Notification"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BulkNotificationForm;
