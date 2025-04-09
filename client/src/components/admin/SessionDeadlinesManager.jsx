import { Calendar, Plus, Trash } from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { api } from "../../lib/api";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const SessionDeadlinesManager = ({ session, onUpdate }) => {
  const [isAddingDeadline, setIsAddingDeadline] = useState(false);
  const [deadlineToEdit, setDeadlineToEdit] = useState(null);
  const { register, handleSubmit, reset, setValue, watch } = useForm();

  const handleAddDeadline = () => {
    reset({
      title: "",
      type: "submission",
      date: new Date(),
      description: "",
    });
    setIsAddingDeadline(true);
    setDeadlineToEdit(null);
  };

  const handleEditDeadline = (deadline) => {
    reset({
      id: deadline._id,
      title: deadline.title,
      type: deadline.type,
      date: new Date(deadline.date),
      description: deadline.description || "",
    });
    setIsAddingDeadline(true);
    setDeadlineToEdit(deadline);
  };

  const closeDialog = () => {
    setIsAddingDeadline(false);
    setDeadlineToEdit(null);
  };

  const handleSaveDeadline = async (data) => {
    try {
      let response;

      if (deadlineToEdit) {
        // Update existing deadline
        response = await api.put(
          `/api/admin/sessions/${session._id}/deadlines/${data.id}`,
          data
        );
      } else {
        // Create new deadline
        response = await api.post(
          `/api/admin/sessions/${session._id}/deadlines`,
          data
        );
      }

      if (response.data.success) {
        toast.success(deadlineToEdit ? "Deadline updated" : "Deadline added");
        closeDialog();
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to save deadline:", error);
      toast.error(error.response?.data?.error || "Failed to save deadline");
    }
  };

  const handleDeleteDeadline = async (deadlineId) => {
    if (!confirm("Are you sure you want to delete this deadline?")) return;

    try {
      const response = await api.delete(
        `/api/admin/sessions/${session._id}/deadlines/${deadlineId}`
      );

      if (response.data.success) {
        toast.success("Deadline deleted");
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to delete deadline:", error);
      toast.error(error.response?.data?.error || "Failed to delete deadline");
    }
  };

  // Check if a deadline is past due
  const isPastDue = (date) => {
    return new Date(date) < new Date();
  };

  // Calculate days remaining
  const getDaysRemaining = (date) => {
    const diffTime = new Date(date) - new Date();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Session Deadlines</h3>
        <Button onClick={handleAddDeadline} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Add Deadline
        </Button>
      </div>

      {session.deadlines?.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              No deadlines set for this session.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {session.deadlines?.map((deadline) => (
            <Card
              key={deadline._id}
              className={`${
                isPastDue(deadline.date)
                  ? "border-red-200 bg-red-50 dark:bg-red-900/10"
                  : ""
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <div>
                    <CardTitle>{deadline.title}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(deadline.date).toLocaleDateString()}
                      {!isPastDue(deadline.date) && (
                        <Badge variant="outline" className="ml-2">
                          {getDaysRemaining(deadline.date)} days left
                        </Badge>
                      )}
                      {isPastDue(deadline.date) && (
                        <Badge variant="destructive" className="ml-2">
                          Overdue
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{deadline.type}</Badge>
                </div>
              </CardHeader>
              {deadline.description && (
                <CardContent className="py-2">
                  <p className="text-sm text-muted-foreground">
                    {deadline.description}
                  </p>
                </CardContent>
              )}
              <CardFooter className="flex justify-end pt-2 pb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditDeadline(deadline)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500"
                  onClick={() => handleDeleteDeadline(deadline._id)}
                >
                  <Trash className="h-4 w-4 mr-1" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isAddingDeadline} onOpenChange={setIsAddingDeadline}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deadlineToEdit ? "Edit Deadline" : "Add Deadline"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(handleSaveDeadline)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                {...register("title", { required: true })}
                placeholder="Deadline title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                {...register("type", { required: true })}
              >
                <option value="submission">Submission</option>
                <option value="report_submission">Report Submission</option>
                <option value="presentation">Presentation</option>
                <option value="team_formation">Team Formation</option>
                <option value="project_selection">Project Selection</option>
                <option value="supervisor_assignment">
                  Supervisor Assignment
                </option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Due Date</Label>
              <DatePicker
                id="date"
                selected={watch("date")}
                onChange={(date) => setValue("date", date)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                {...register("description")}
                placeholder="Optional description"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {deadlineToEdit ? "Update" : "Add"} Deadline
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SessionDeadlinesManager;
