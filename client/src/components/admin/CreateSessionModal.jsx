import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

const CreateSessionModal = ({ isOpen, onClose, onSessionCreated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      name: "",
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 4)),
      maxTeamSize: 4,
      minTeamSize: 2,
      status: "upcoming",
      allowStudentInitiatedTeams: true,
      allowSupervisorInitiatedProjects: true,
      description: "",
      departments: [],
      academicPrograms: [],
    },
  });

  const handleCreateSession = async (data) => {
    setIsLoading(true);
    try {
      const response = await api.post("/api/admin/sessions", data);

      if (response.data.success) {
        toast.success("Session created successfully");
        reset();
        onSessionCreated(response.data.data);
        onClose();
      }
    } catch (error) {
      console.error("Failed to create session:", error);
      toast.error(error.response?.data?.error || "Failed to create session");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleCreateSession)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Session Name *</Label>
            <Input
              id="name"
              {...register("name", { required: "Session name is required" })}
              placeholder="Spring 2023"
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <DatePicker
                id="startDate"
                selected={watch("startDate")}
                onChange={(date) => setValue("startDate", date)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <DatePicker
                id="endDate"
                selected={watch("endDate")}
                onChange={(date) => setValue("endDate", date)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minTeamSize">Min Team Size</Label>
              <Input
                id="minTeamSize"
                type="number"
                {...register("minTeamSize", { min: 1, max: 10 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTeamSize">Max Team Size</Label>
              <Input
                id="maxTeamSize"
                type="number"
                {...register("maxTeamSize", { min: 1, max: 10 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              onValueChange={(value) => setValue("status", value)}
              defaultValue={watch("status")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="allowStudentInitiatedTeams"
              checked={watch("allowStudentInitiatedTeams")}
              onCheckedChange={(checked) =>
                setValue("allowStudentInitiatedTeams", checked)
              }
            />
            <Label htmlFor="allowStudentInitiatedTeams">
              Allow students to create teams
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="allowSupervisorInitiatedProjects"
              checked={watch("allowSupervisorInitiatedProjects")}
              onCheckedChange={(checked) =>
                setValue("allowSupervisorInitiatedProjects", checked)
              }
            />
            <Label htmlFor="allowSupervisorInitiatedProjects">
              Allow supervisors to create projects
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Session description"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSessionModal;
