import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { getStudentDeadlines, submitReport } from "../../api/student";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
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

const ReportSubmissionForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deadlines, setDeadlines] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    attachmentUrl: "",
    deadlineId: "",
  });

  useEffect(() => {
    fetchDeadlines();
  }, []);

  const fetchDeadlines = async () => {
    try {
      setIsLoading(true);
      const response = await getStudentDeadlines();
      if (response.success) {
        // Filter only non-passed deadlines
        const activeDeadlines = (response.deadlines || []).filter(
          (d) => !d.isPassed
        );
        setDeadlines(activeDeadlines);
      } else {
        toast.error("Failed to fetch deadlines");
      }
    } catch (error) {
      console.error("Error fetching deadlines:", error);
      toast.error("Could not load deadlines");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      deadlineId: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!formData.content.trim() || formData.content.length < 100) {
      toast.error("Content must be at least 100 characters");
      return;
    }

    if (!formData.deadlineId) {
      toast.error("Please select a deadline");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await submitReport(formData);

      if (response.success) {
        toast.success("Report submitted successfully");
        // Reset form
        setFormData({
          title: "",
          content: "",
          attachmentUrl: "",
          deadlineId: "",
        });
      } else {
        toast.error(response.error || "Failed to submit report");
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Submit Report</CardTitle>
          <CardDescription>Submit your report for review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Submit Report</CardTitle>
        <CardDescription>
          Submit your report for an upcoming deadline
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {deadlines.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No active deadlines available for submission.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="deadlineId">Select Deadline</Label>
                <Select
                  value={formData.deadlineId}
                  onValueChange={handleSelectChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a deadline" />
                  </SelectTrigger>
                  <SelectContent>
                    {deadlines.map((deadline) => (
                      <SelectItem key={deadline._id} value={deadline._id}>
                        {deadline.name} (
                        {new Date(deadline.date).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Report title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="Write your report content here (minimum 100 characters)"
                  rows={8}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {formData.content.length} / 100 characters minimum
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachmentUrl">Attachment URL (optional)</Label>
                <Input
                  id="attachmentUrl"
                  name="attachmentUrl"
                  value={formData.attachmentUrl}
                  onChange={handleChange}
                  placeholder="Link to your attachment"
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            disabled={isSubmitting || deadlines.length === 0}
            className="w-full"
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ReportSubmissionForm;
