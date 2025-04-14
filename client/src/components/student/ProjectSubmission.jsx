import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { projectAPI } from "../../api/projects";
import { UploadCloud } from "lucide-react";

export default function ProjectSubmission({ project, onSubmissionComplete }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    fileUrl: "",
    submissionType: "progress_report"
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!formData.title.trim()) {
      return toast.error("Please enter a title for your submission");
    }

    if (!formData.fileUrl.trim()) {
      return toast.error("Please enter a file URL");
    }

    try {
      setIsSubmitting(true);
      const response = await projectAPI.submitProjectReport(project._id, formData);

      toast.success("Report submitted successfully");

      // Reset form
      setFormData({
        title: "",
        description: "",
        fileUrl: "",
        submissionType: "progress_report"
      });

      // Callback to notify parent component
      if (onSubmissionComplete) {
        onSubmissionComplete(response.data);
      }
    } catch (error) {
      console.error("Failed to submit report:", error);
      toast.error(error.response?.data?.message || "Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Project Report</CardTitle>
        <CardDescription>
          Upload your project report, code, or other documents for review
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title*</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Progress Report Week 3"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="submissionType">Submission Type*</Label>
            <Select
              value={formData.submissionType}
              onValueChange={(value) => handleSelectChange("submissionType", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proposal">Project Proposal</SelectItem>
                <SelectItem value="progress_report">Progress Report</SelectItem>
                <SelectItem value="final_report">Final Report</SelectItem>
                <SelectItem value="code">Code Submission</SelectItem>
                <SelectItem value="presentation">Presentation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fileUrl">File URL*</Label>
            <Input
              id="fileUrl"
              name="fileUrl"
              value={formData.fileUrl}
              onChange={handleChange}
              placeholder="https://drive.google.com/file/..."
              required
            />
            <p className="text-xs text-gray-500">
              Link to your report file (Google Drive, Dropbox, GitHub, etc.)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Briefly describe what this submission contains"
              rows={3}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>Submitting...</>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Submit Report
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
